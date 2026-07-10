import type { PrismaClient } from "@cashou/db-app";
import defaultPrisma from "../../database.ts";
import { GameTimeService } from "./game-time.service.ts";
import { GameInstanceEventService } from "./game-instance-event.service.ts";
import { GamePauseIntervalService } from "./game-pause-interval.service.ts";
import { scheduleGameEnd, scheduleGameEvent, cancelGameEvent } from "../../lib/job-queue.ts";

export class GameEventTriggerService {
  private prisma: PrismaClient;
  private gameTimeService: GameTimeService;
  private gameInstanceEventService: GameInstanceEventService;
  private gamePauseIntervalService: GamePauseIntervalService;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || defaultPrisma;
    this.gameTimeService = new GameTimeService(this.prisma);
    this.gameInstanceEventService = new GameInstanceEventService(prismaClient);
    this.gamePauseIntervalService = new GamePauseIntervalService(this.prisma);
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
    const pauseEndedAt = new Date();

    // Calculate pause duration
    let pauseDuration = 0;
    if (gameInstance.pausedAt) {
      pauseDuration = Math.floor(
        (pauseEndedAt.getTime() - new Date(gameInstance.pausedAt).getTime()) / 1000
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
    await this.gamePauseIntervalService.endPause(gameInstanceId, pauseEndedAt);

    // Shift all non-triggered GameInstanceEvent.scheduledAt forward by the pause duration
    // This ensures that future events account for the time the game was paused
    // This must be done after completing the event to maintain correct timeline
    if (pauseDuration > 0) {
      await this.gameInstanceEventService.shiftScheduledEvents(
        gameInstanceId,
        pauseDuration
      );
    }

    console.log(
      `[GameEventTrigger] Event completed for game ${gameInstanceId}, moving to index ${nextIndex}${pauseDuration > 0 ? ` (shifted future events by ${pauseDuration}s)` : ''}`
    );

    if (nextIndex >= levelEvents.length) {
      // All events completed → schedule game-end
      const updatedGameInstance = await this.prisma.gameInstance.findUnique({
        where: { id: gameInstanceId },
        include: { level: true },
      });

      if (updatedGameInstance) {
        const remainingTime = this.gameTimeService.getRemainingTimeUntilEnd(
          updatedGameInstance
        );
        await scheduleGameEnd(gameInstanceId, remainingTime);
        console.log(`[GameEventTrigger] All events done for game ${gameInstanceId}, scheduled game-end in ${remainingTime}s`);
      }
    } else {
      // Schedule the next event via pg-boss (chain mode)
      const nextGameInstanceEvent = await this.prisma.gameInstanceEvent.findFirst({
        where: {
          gameInstanceId,
          triggeredAt: null,
        },
        orderBy: { scheduledAt: "asc" },
      });
      if (nextGameInstanceEvent) {
        await scheduleGameEvent(nextGameInstanceEvent.id, nextGameInstanceEvent.scheduledAt);
        console.log(`[GameEventTrigger] Chained next event ${nextGameInstanceEvent.id} for game ${gameInstanceId}`);
      }
    }
  }

  /**
   * Initialize pg-boss scheduling for a new game instance.
   * When a level has no intermediate events, we still need to schedule its game end.
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

    // In chain mode, the first event's pg-boss job is already scheduled by
    // scheduleEventsForGameInstance(). Log for visibility.
    const firstEvent = await this.prisma.gameInstanceEvent.findFirst({
      where: { gameInstanceId, triggeredAt: null },
      orderBy: { scheduledAt: "asc" },
    });
    if (firstEvent) {
      console.log(
        `[GameEventTrigger] First event ${firstEvent.id} already scheduled via pg-boss for game ${gameInstanceId} (chain mode)`
      );
    }
  }

  /**
   * Reschedule the game-end job after resuming (only needed when all events are done).
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

    if (currentIndex >= levelEvents.length) {
      // All events are done → reschedule game-end
      const remainingTime =
        this.gameTimeService.getRemainingTimeUntilEnd(gameInstance);
      await scheduleGameEnd(gameInstanceId, remainingTime);
    } else {
      // Reschedule the next pending event (already shifted in DB by shiftScheduledEvents)
      const nextEvent = await this.prisma.gameInstanceEvent.findFirst({
        where: { gameInstanceId, triggeredAt: null },
        orderBy: { scheduledAt: "asc" },
      });
      if (nextEvent) {
        await cancelGameEvent(nextEvent.id);
        await scheduleGameEvent(nextEvent.id, nextEvent.scheduledAt);
        console.log(`[GameEventTrigger] Rescheduled next event ${nextEvent.id} after resume for game ${gameInstanceId}`);
      }
    }
  }
}
