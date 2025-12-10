import type { PrismaClient } from "@cashou/db-app";
import defaultPrisma from "../../database.ts";
import { GameTimeService } from "./game-time.service.ts";
import { GameInstanceEventService } from "./game-instance-event.service.ts";
import { scheduleGameEnd } from "../../lib/job-queue.ts";

export class GameEventTriggerService {
  private prisma: PrismaClient;
  private gameTimeService: GameTimeService;
  private gameInstanceEventService: GameInstanceEventService;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || defaultPrisma;
    this.gameTimeService = new GameTimeService();
    this.gameInstanceEventService = new GameInstanceEventService(prismaClient);
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

    // If there are no more events to trigger, schedule the game end job
    if (nextIndex >= levelEvents.length) {
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

    console.log(
      `[GameEventTrigger] Events handled via cron for game ${gameInstanceId}, no pg-boss scheduling required`
    );
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
      const remainingTime =
        this.gameTimeService.getRemainingTimeUntilEnd(gameInstance);
      await scheduleGameEnd(gameInstanceId, remainingTime);
    }
  }
}
