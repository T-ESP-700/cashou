import type { PrismaClient } from "@cashou/db-app";
import defaultPrisma from "../../database.ts";
import { NotificationService } from "./notification.service.ts";
import { ExpoPushService } from "./expo-push.service.ts";
import { GameTimeService } from "./game-time.service.ts";
import {
  scheduleEventTrigger,
  scheduleGameEnd,
  cancelGameJobs,
} from "../../lib/job-queue.ts";

export class GameEventTriggerService {
  private prisma: PrismaClient;
  private notificationService: NotificationService;
  private expoPushService: ExpoPushService;
  private gameTimeService: GameTimeService;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || defaultPrisma;
    this.notificationService = new NotificationService(this.prisma);
    this.expoPushService = new ExpoPushService();
    this.gameTimeService = new GameTimeService();
  }

  /**
   * Trigger an event for a game instance
   * 1. Pause the game
   * 2. Set actionRequired = true
   * 3. Create DB notification (type EVENT)
   * 4. Send Expo push notification
   */
  async triggerEvent(
    gameInstanceId: number,
    levelEventId: number
  ): Promise<void> {
    // Fetch game instance with user and level
    const gameInstance = await this.prisma.gameInstance.findUnique({
      where: { id: gameInstanceId },
      include: {
        user: true,
        level: true,
      },
    });

    if (!gameInstance) {
      throw new Error(`GameInstance ${gameInstanceId} not found`);
    }

    if (gameInstance.isEnded) {
      console.log(`GameInstance ${gameInstanceId} already ended, skipping event`);
      return;
    }

    // Fetch the level event with event details
    const levelEvent = await this.prisma.levelEvent.findUnique({
      where: { id: levelEventId },
      include: {
        event: true,
      },
    });

    if (!levelEvent || !levelEvent.event) {
      throw new Error(`LevelEvent ${levelEventId} not found`);
    }

    const event = levelEvent.event;

    // 1. Pause the game and set actionRequired
    await this.prisma.gameInstance.update({
      where: { id: gameInstanceId },
      data: {
        isPaused: true,
        pausedAt: new Date(),
        actionRequired: true,
      },
    });

    console.log(
      `[GameEventTrigger] Event "${event.title}" triggered for game ${gameInstanceId}`
    );

    // 2. Create DB notification
    if (gameInstance.userId) {
      await this.notificationService.create({
        user_id: gameInstance.userId,
        title: event.title ?? "Nouvel événement",
        message:
          event.description ?? "Un événement requiert votre attention dans le jeu.",
        type: "EVENT",
        game_instance_id: gameInstanceId,
        event_id: event.id,
        is_open: false,
        sent_at: new Date(),
      });

      // 3. Send Expo push notification
      if (gameInstance.user?.expoPushToken) {
        await this.expoPushService.sendPushNotification({
          pushToken: gameInstance.user.expoPushToken,
          title: event.title ?? "Nouvel événement",
          body:
            event.description ?? "Un événement requiert votre attention dans le jeu.",
          data: {
            type: "EVENT",
            gameInstanceId,
            levelEventId,
            eventId: event.id,
          },
        });
      }
    }
  }

  /**
   * Complete an event interaction and schedule the next event or game end
   * Called when the user completes their interaction with an event
   */
  async completeEvent(gameInstanceId: number): Promise<void> {
    // Fetch game instance with level and level events
    const gameInstance = await this.prisma.gameInstance.findUnique({
      where: { id: gameInstanceId },
      include: {
        level: {
          include: {
            levelEvents: {
              include: { event: true },
              orderBy: { position: "asc" },
            },
          },
        },
      },
    });

    if (!gameInstance) {
      throw new Error(`GameInstance ${gameInstanceId} not found`);
    }

    if (!gameInstance.level) {
      throw new Error(`GameInstance ${gameInstanceId} has no level`);
    }

    if (gameInstance.isEnded) {
      console.log(`GameInstance ${gameInstanceId} already ended`);
      return;
    }

    const levelEvents = gameInstance.level.levelEvents;
    const currentIndex = gameInstance.currentEventIndex ?? 0;
    const nextIndex = currentIndex + 1;

    // Calculate pause duration
    let pauseDuration = 0;
    if (gameInstance.pausedAt) {
      pauseDuration = Math.floor(
        (Date.now() - new Date(gameInstance.pausedAt).getTime()) / 1000
      );
    }

    const newTotalPausedDuration =
      (gameInstance.totalPausedDuration ?? 0) + pauseDuration;

    // Update game instance
    await this.prisma.gameInstance.update({
      where: { id: gameInstanceId },
      data: {
        isPaused: false,
        pausedAt: null,
        actionRequired: false,
        currentEventIndex: nextIndex,
        totalPausedDuration: newTotalPausedDuration,
      },
    });

    console.log(
      `[GameEventTrigger] Event completed for game ${gameInstanceId}, moving to index ${nextIndex}`
    );

    // Check if there are more events
    if (nextIndex < levelEvents.length) {
      // Schedule next event
      const nextLevelEvent = levelEvents[nextIndex];
      const updatedGameInstance = await this.prisma.gameInstance.findUnique({
        where: { id: gameInstanceId },
        include: { level: true },
      });

      if (updatedGameInstance && updatedGameInstance.level) {
        const nextEventInfo = this.gameTimeService.getNextEventInfo(
          updatedGameInstance,
          levelEvents
        );

        if (nextEventInfo) {
          await scheduleEventTrigger(
            gameInstanceId,
            nextLevelEvent.id,
            nextEventInfo.delaySeconds
          );
        }
      }
    } else {
      // No more events, schedule game end
      const updatedGameInstance = await this.prisma.gameInstance.findUnique({
        where: { id: gameInstanceId },
        include: { level: true },
      });

      if (updatedGameInstance) {
        const remainingTime = this.gameTimeService.getRemainingTimeUntilEnd(
          updatedGameInstance
        );
        await scheduleGameEnd(gameInstanceId, remainingTime);
      }
    }
  }

  /**
   * Schedule the first event for a newly created game instance
   */
  async scheduleFirstEvent(gameInstanceId: number): Promise<void> {
    const gameInstance = await this.prisma.gameInstance.findUnique({
      where: { id: gameInstanceId },
      include: {
        level: {
          include: {
            levelEvents: {
              include: { event: true },
              orderBy: { position: "asc" },
            },
          },
        },
      },
    });

    if (!gameInstance || !gameInstance.level) {
      throw new Error(`GameInstance ${gameInstanceId} not found or has no level`);
    }

    const levelEvents = gameInstance.level.levelEvents;

    if (levelEvents.length === 0) {
      // No events, schedule game end directly
      const totalDuration = this.gameTimeService.calculateTotalDuration(
        gameInstance.level
      );
      await scheduleGameEnd(gameInstanceId, totalDuration);
      console.log(
        `[GameEventTrigger] No events for game ${gameInstanceId}, scheduled game end in ${totalDuration}s`
      );
      return;
    }

    // Schedule first event
    const firstEvent = levelEvents[0];
    const eventInfo = this.gameTimeService.getNextEventInfo(
      gameInstance,
      levelEvents
    );

    if (eventInfo) {
      await scheduleEventTrigger(
        gameInstanceId,
        firstEvent.id,
        eventInfo.delaySeconds
      );
      console.log(
        `[GameEventTrigger] Scheduled first event for game ${gameInstanceId} in ${eventInfo.delaySeconds}s`
      );
    }
  }

  /**
   * Cancel all scheduled events for a game (used when pausing)
   */
  async cancelScheduledEvents(gameInstanceId: number): Promise<void> {
    await cancelGameJobs(gameInstanceId);
  }

  /**
   * Reschedule events after resuming a game
   */
  async rescheduleAfterResume(gameInstanceId: number): Promise<void> {
    const gameInstance = await this.prisma.gameInstance.findUnique({
      where: { id: gameInstanceId },
      include: {
        level: {
          include: {
            levelEvents: {
              include: { event: true },
              orderBy: { position: "asc" },
            },
          },
        },
      },
    });

    if (!gameInstance || !gameInstance.level || gameInstance.isEnded) {
      return;
    }

    const levelEvents = gameInstance.level.levelEvents;
    const currentIndex = gameInstance.currentEventIndex ?? 0;

    if (currentIndex < levelEvents.length) {
      // Reschedule current event
      const currentLevelEvent = levelEvents[currentIndex];
      const eventInfo = this.gameTimeService.getNextEventInfo(
        gameInstance,
        levelEvents
      );

      if (eventInfo) {
        await scheduleEventTrigger(
          gameInstanceId,
          currentLevelEvent.id,
          eventInfo.delaySeconds
        );
      }
    } else {
      // All events done, reschedule game end
      const remainingTime =
        this.gameTimeService.getRemainingTimeUntilEnd(gameInstance);
      await scheduleGameEnd(gameInstanceId, remainingTime);
    }
  }
}
