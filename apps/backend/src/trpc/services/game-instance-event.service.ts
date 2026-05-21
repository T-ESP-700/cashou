import type { Prisma, PrismaClient } from "@cashou/db-app";
import defaultPrisma from "../../database.ts";
import { scheduleGameEvent, cancelGameEvent } from "../../lib/job-queue.ts";

type PrismaDbClient = PrismaClient | Prisma.TransactionClient;

/**
 * Service for managing GameInstanceEvent records.
 *
 * GameInstanceEvent represents a scheduled event for a specific GameInstance.
 * When a GameInstance is created, we pre-schedule all events from the Level's LevelEvents.
 *
 * Scheduling Formula:
 * - gameTimeAtEvent = level.duration * (triggerPercent / 100)
 * - realDelaySeconds = gameTimeAtEvent / speed
 * - scheduledAt = gameInstance.createdAt + realDelaySeconds (in seconds)
 *
 * Pause/Resume:
 * When a game is resumed after being paused, all non-triggered events have their
 * scheduledAt shifted forward by the pause duration to maintain the correct game timeline.
 */
export class GameInstanceEventService {
  private prisma: PrismaDbClient;

  constructor(prismaClient?: PrismaDbClient) {
    this.prisma = prismaClient || defaultPrisma;
  }

  /**
   * Schedule all events for a newly created GameInstance.
   *
   * For each LevelEvent associated with the game's Level:
   * 1. Calculate when the event should trigger based on triggerPercent and level speed
   * 2. Create a GameInstanceEvent record with the calculated scheduledAt time
   *
   * @param gameInstanceId - The ID of the newly created GameInstance
   */
  async scheduleEventsForGameInstance(gameInstanceId: number): Promise<void> {
    console.log(`[GameInstanceEventService] ▶️ scheduleEventsForGameInstance called for gameInstanceId=${gameInstanceId}`);

    // Fetch the game instance with level and level events
    const gameInstance = await this.prisma.gameInstance.findUnique({
      where: { id: gameInstanceId },
      include: {
        level: {
          include: {
            levelEvents: {
              orderBy: [
                { position: "asc" },
                { triggerPercent: "asc" },
              ],
            },
          },
        },
      },
    });

    console.log(`[GameInstanceEventService] gameInstance found:`, gameInstance ? `id=${gameInstance.id}, levelId=${gameInstance.levelId}, createdAt=${gameInstance.createdAt}` : 'null');

    if (!gameInstance) {
      throw new Error(`GameInstance ${gameInstanceId} not found`);
    }

    if (!gameInstance.level) {
      console.log(`[GameInstanceEventService] ❌ GameInstance ${gameInstanceId} has no level, skipping event scheduling`);
      return;
    }

    const level = gameInstance.level;
    const levelEvents = level.levelEvents;

    console.log(`[GameInstanceEventService] Level ${level.id}: found ${levelEvents.length} levelEvents`);

    // Defensive cleanup: if events already exist for this game instance, remove them
    const existingCount = await this.prisma.gameInstanceEvent.count({ where: { gameInstanceId } });
    if (existingCount > 0) {
      console.log(`[GameInstanceEventService] Cleaning up ${existingCount} existing events for GameInstance ${gameInstanceId}`);
      const oldEvents = await this.prisma.gameInstanceEvent.findMany({
        where: { gameInstanceId },
        select: { id: true },
      });
      for (const e of oldEvents) {
        await cancelGameEvent(e.id);
      }
      await this.prisma.gameInstanceEvent.deleteMany({ where: { gameInstanceId } });
    }

    if (levelEvents.length === 0) {
      console.log(`[GameInstanceEventService] ❌ Level ${level.id} has no events to schedule`);
      return;
    }

    // Level.duration is in DAYS (e.g., 1825 days = 5 years)
    // Level.speed is game-seconds per real-second (e.g., 5258000 means game runs very fast)
    //
    // Formula:
    // 1. Convert duration from days to game-seconds: durationInSeconds = duration * 86400
    // 2. Calculate when event triggers in game-seconds: gameTimeAtEvent = durationInSeconds * (triggerPercent / 100)
    // 3. Convert to real-time: realDelaySeconds = gameTimeAtEvent / speed
    const duration = level.duration ?? 300; // Duration in days
    const speed = level.speed ?? 1; // Game-seconds per real-second

    // Convert days to seconds (86400 seconds per day)
    const SECONDS_PER_DAY = 86400;
    const durationInSeconds = duration * SECONDS_PER_DAY;

    const gameStartTime = new Date(gameInstance.createdAt);

    // Create GameInstanceEvent for each LevelEvent
    const eventsToCreate = levelEvents.map((levelEvent) => {
      // Calculate when this event triggers in game-seconds
      const gameTimeAtEvent = durationInSeconds * (levelEvent.triggerPercent / 100);

      // Convert to real-time delay in seconds
      const realDelaySeconds = gameTimeAtEvent / speed;

      // Calculate the actual scheduled time
      const scheduledAt = new Date(gameStartTime.getTime() + realDelaySeconds * 1000);

      console.log(`[GameInstanceEventService] Event ${levelEvent.id} at ${levelEvent.triggerPercent}%: scheduled in ${realDelaySeconds.toFixed(2)}s (${scheduledAt.toISOString()})`);

      return {
        gameInstanceId,
        levelEventId: levelEvent.id,
        scheduledAt,
        triggeredAt: null,
      };
    });

    // Batch create all events in database
    await this.prisma.gameInstanceEvent.createMany({
      data: eventsToCreate,
    });

    // Fetch the created events to get their IDs (sorted by scheduledAt)
    const createdEvents = await this.prisma.gameInstanceEvent.findMany({
      where: { gameInstanceId },
      orderBy: { scheduledAt: "asc" },
    });

    // Schedule ONLY the first event in pg-boss (chain mode)
    // Subsequent events will be scheduled when each event is completed by the user
    if (createdEvents.length > 0) {
      await scheduleGameEvent(createdEvents[0].id, createdEvents[0].scheduledAt);
      console.log(
        `[GameInstanceEventService] Scheduled first event ${createdEvents[0].id} via pg-boss (chain mode). ${createdEvents.length} total events in DB for GameInstance ${gameInstanceId}`
      );
    }
  }

  /**
   * Shift all non-triggered events forward by the pause duration.
   * Called when resuming a paused game to maintain correct timeline.
   * Also reschedules the pg-boss jobs with the new times.
   *
   * @param gameInstanceId - The ID of the GameInstance being resumed
   * @param pauseDurationSeconds - How long the game was paused (in seconds)
   */
  async shiftScheduledEvents(
    gameInstanceId: number,
    pauseDurationSeconds: number
  ): Promise<void> {
    if (pauseDurationSeconds <= 0) {
      return;
    }

    // Find all non-triggered events for this game instance
    const pendingEvents = await this.prisma.gameInstanceEvent.findMany({
      where: {
        gameInstanceId,
        triggeredAt: null,
      },
      orderBy: { scheduledAt: "asc" },
    });

    if (pendingEvents.length === 0) {
      console.log(
        `[GameInstanceEventService] No pending events to shift for GameInstance ${gameInstanceId}`
      );
      return;
    }

    // Calculate new scheduled times
    const updatedEvents: { id: number; newScheduledAt: Date }[] = [];

    // Update each event's scheduledAt time in database.
    // This method may run inside an outer interactive transaction, so avoid nesting.
    for (const event of pendingEvents) {
      const newScheduledAt = new Date(
        event.scheduledAt.getTime() + pauseDurationSeconds * 1000
      );
      updatedEvents.push({ id: event.id, newScheduledAt });
      await this.prisma.gameInstanceEvent.update({
        where: { id: event.id },
        data: { scheduledAt: newScheduledAt },
      });
    }

    // In chain mode, only one pg-boss job exists at a time (the next pending event).
    // Reschedule only the first pending event (already sorted by scheduledAt asc).
    if (updatedEvents.length > 0) {
      const next = updatedEvents[0];
      await cancelGameEvent(next.id);
      await scheduleGameEvent(next.id, next.newScheduledAt);
    }

    console.log(
      `[GameInstanceEventService] Shifted ${pendingEvents.length} events forward by ${pauseDurationSeconds}s for GameInstance ${gameInstanceId} (DB updated, next pg-boss job rescheduled)`
    );
  }

  /**
   * Mark an event as triggered.
   *
   * @param gameInstanceEventId - The ID of the GameInstanceEvent to mark
   */
  async markEventAsTriggered(gameInstanceEventId: number): Promise<void> {
    await this.prisma.gameInstanceEvent.update({
      where: { id: gameInstanceEventId },
      data: { triggeredAt: new Date() },
    });
  }

  /**
   * Find all due events that need to be processed.
   * Returns events where:
   * - scheduledAt <= now
   * - triggeredAt IS NULL
   * - gameInstance.isEnded = false
   * - gameInstance.userId IS NOT NULL (we need a user to send notifications)
   * - gameInstance.isPaused = false OR actionRequired = false
   *   (exclude games already paused with actionRequired=true, as they're waiting for user action)
   *
   * Note: This method is kept for debugging purposes. Events are now processed via pg-boss workers.
   */
  async findDueEvents() {
    const now = new Date();

    console.log(`[GameInstanceEventService] Looking for due events at ${now.toISOString()}`);

    const events = await this.prisma.gameInstanceEvent.findMany({
      where: {
        scheduledAt: { lte: now },
        processingStartedAt: null,
        triggeredAt: null,
        gameInstance: {
          isEnded: false,
          userId: { not: null }, // Only process events for games with a user
          // Exclude games that are paused with actionRequired=true (already waiting for user action)
          // Manual pause (actionRequired=false) should NOT block events
          OR: [
            { isPaused: false },
            { isPaused: true, actionRequired: false },
          ],
        },
      },
      include: {
        gameInstance: {
          include: {
            user: {
              select: {
                id: true,
                expoPushToken: true,
              },
            },
          },
        },
        levelEvent: {
          include: {
            event: true,
          },
        },
      },
      orderBy: {
        scheduledAt: "asc",
      },
    });

    console.log(`[GameInstanceEventService] Found ${events.length} due events`);

    // Log details for debugging
    for (const event of events) {
      const hasUser = !!event.gameInstance.user;
      const hasToken = !!event.gameInstance.user?.expoPushToken;
      console.log(
        `[GameInstanceEventService] Event ${event.id}: gameInstanceId=${event.gameInstanceId}, userId=${event.gameInstance.userId}, hasUser=${hasUser}, hasToken=${hasToken}`
      );
    }

    return events;
  }

  /**
   * Get all events for a game instance.
   */
  async findByGameInstance(gameInstanceId: number) {
    return this.prisma.gameInstanceEvent.findMany({
      where: { gameInstanceId },
      include: {
        levelEvent: {
          include: {
            event: true,
          },
        },
      },
      orderBy: {
        scheduledAt: "asc",
      },
    });
  }
}
