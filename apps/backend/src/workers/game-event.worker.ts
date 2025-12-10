import {
  getJobQueue,
  JOB_NAMES,
  type GameEndJobData,
} from "../lib/job-queue.ts";
import { GameEndTriggerService } from "../trpc/services/game-end-trigger.service.ts";

const gameEndTriggerService = new GameEndTriggerService();

/**
 * Start the job workers responsible for ending games.
 * Event triggering is now handled by the cron-based GameInstanceEvent pipeline,
 * so pg-boss is only used for scheduling the end of a game.
 */
export async function startGameEventWorkers(): Promise<void> {
  const boss = await getJobQueue();

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

  console.log("[Worker] Game end worker started successfully");
}
