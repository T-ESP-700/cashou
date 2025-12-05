import {
  getJobQueue,
  JOB_NAMES,
  type EventTriggerJobData,
  type GameEndJobData,
} from "../lib/job-queue.ts";
import { GameEventTriggerService } from "../trpc/services/game-event-trigger.service.ts";
import { GameEndTriggerService } from "../trpc/services/game-end-trigger.service.ts";

const gameEventTriggerService = new GameEventTriggerService();
const gameEndTriggerService = new GameEndTriggerService();

/**
 * Start the game event workers
 * Listens for event trigger and game end jobs
 */
export async function startGameEventWorkers(): Promise<void> {
  const boss = await getJobQueue();

  // Worker for event triggers
  await boss.work<EventTriggerJobData>(
    JOB_NAMES.EVENT_TRIGGER,
    { batchSize: 1 },
    async (jobs) => {
      for (const job of jobs) {
        const { gameInstanceId, levelEventId } = job.data;

        console.log(
          `[Worker] Processing event trigger for game ${gameInstanceId}, event ${levelEventId}`
        );

        try {
          await gameEventTriggerService.triggerEvent(gameInstanceId, levelEventId);
          console.log(
            `[Worker] Event trigger completed for game ${gameInstanceId}, event ${levelEventId}`
          );
        } catch (error) {
          console.error(
            `[Worker] Error triggering event for game ${gameInstanceId}:`,
            error
          );
          throw error; // pg-boss will retry
        }
      }
    }
  );

  // Worker for game end
  await boss.work<GameEndJobData>(
    JOB_NAMES.GAME_END,
    { batchSize: 1 },
    async (jobs) => {
      for (const job of jobs) {
        const { gameInstanceId } = job.data;

        console.log(`[Worker] Processing game end for game ${gameInstanceId}`);

        try {
          const result = await gameEndTriggerService.triggerGameEnd(gameInstanceId);
          console.log(
            `[Worker] Game end completed for game ${gameInstanceId}. Success: ${result.success}`
          );
        } catch (error) {
          console.error(
            `[Worker] Error ending game ${gameInstanceId}:`,
            error
          );
          throw error; // pg-boss will retry
        }
      }
    }
  );

  console.log("[Worker] Game event workers started successfully");
}

/**
 * Recover any games that should have had events triggered while server was down
 * Called on server startup
 */
export async function recoverPendingGames(): Promise<void> {
  // Import prisma here to avoid circular dependencies
  const { default: prisma } = await import("../database.ts");
  const { GameTimeService } = await import(
    "../trpc/services/game-time.service.ts"
  );

  const gameTimeService = new GameTimeService();

  // Check if tables exist before querying (first startup before migrations)
  const tablesExist = await checkTablesExist(prisma);
  if (!tablesExist) {
    console.log("[Worker] Database tables not ready yet, skipping recovery");
    return;
  }

  console.log("[Worker] Checking for games that need recovery...");

  // Find all active games (not ended, not paused due to event)
  const activeGames = await prisma.gameInstance.findMany({
    where: {
      isEnded: false,
      // Games that are not paused, or paused but not action required (manual pause)
      OR: [
        { isPaused: false },
        { isPaused: true, actionRequired: false },
      ],
    },
    include: {
      level: {
        include: {
          levelEvents: {
            orderBy: { position: "asc" },
          },
        },
      },
    },
  });

  console.log(`[Worker] Found ${activeGames.length} active games to check`);

  for (const game of activeGames) {
    if (!game.level) continue;

    const levelEvents = game.level.levelEvents;
    const currentIndex = game.currentEventIndex ?? 0;

    // Check if current event should have triggered
    if (currentIndex < levelEvents.length) {
      const currentEvent = levelEvents[currentIndex];
      const shouldHaveTriggered = gameTimeService.shouldEventHaveTriggered(
        game,
        currentEvent
      );

      if (shouldHaveTriggered && !game.actionRequired) {
        console.log(
          `[Worker] Game ${game.id} missed event ${currentEvent.id}, triggering now`
        );
        await gameEventTriggerService.triggerEvent(game.id, currentEvent.id);
      } else if (!game.isPaused) {
        // Reschedule the event
        await gameEventTriggerService.rescheduleAfterResume(game.id);
      }
    } else {
      // All events done, check if game should have ended
      const timeInfo = gameTimeService.calculateTimeInfo(game);

      if (timeInfo.hasEnded) {
        console.log(`[Worker] Game ${game.id} should have ended, triggering now`);
        await gameEndTriggerService.triggerGameEnd(game.id);
      } else if (!game.isPaused) {
        // Reschedule game end
        const { scheduleGameEnd } = await import("../lib/job-queue.ts");
        await scheduleGameEnd(game.id, timeInfo.remainingSeconds);
      }
    }
  }

  console.log("[Worker] Game recovery check completed");
}

/**
 * Check if the required database tables exist
 */
async function checkTablesExist(prisma: typeof import("../database.ts").default): Promise<boolean> {
  try {
    const result = await prisma.$queryRaw<{ exists: boolean }[]>`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'game_instances'
      ) as exists
    `;
    return result[0]?.exists ?? false;
  } catch {
    return false;
  }
}
