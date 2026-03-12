import {
  getJobQueue,
  JOB_NAMES,
  type GameEndJobData,
  type GameEventJobData,
} from "../lib/job-queue.ts";
import { GameEndTriggerService } from "../trpc/services/game-end-trigger.service.ts";
import { GameEventProcessorService } from "../trpc/services/game-event-processor.service.ts";

const gameEndTriggerService = new GameEndTriggerService();
const gameEventProcessorService = new GameEventProcessorService();

/**
 * Start the job workers responsible for game events and game end.
 * Both event triggering and game end are handled by pg-boss workers.
 */
export async function startGameEventWorkers(): Promise<void> {
  const boss = await getJobQueue();

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

  console.log("[Worker] Game end worker started successfully");

  // Worker for game events
  await boss.work<GameEventJobData>(
    JOB_NAMES.GAME_EVENT,
    { batchSize: 1 },
    async (jobs) => {
      for (const job of jobs) {
        const { gameInstanceEventId } = job.data;

        console.log(`[Worker] Processing game event ${gameInstanceEventId}`);

        try {
          const result = await gameEventProcessorService.processEvent(gameInstanceEventId);
          if (result.success) {
            console.log(
              `[Worker] Game event ${gameInstanceEventId} processed successfully`
            );
          } else if (result.reason === "Game already has pending action") {
            // Another event is pending user action — throw so pg-boss retries later
            // This prevents the job from completing and becoming unschedulable
            console.log(
              `[Worker] Game event ${gameInstanceEventId} blocked by pending action, will retry`
            );
            throw new Error(`Game event ${gameInstanceEventId} blocked: ${result.reason}`);
          } else {
            console.log(
              `[Worker] Game event ${gameInstanceEventId} skipped: ${result.reason}`
            );
          }
        } catch (error) {
          console.error(
            `[Worker] Error processing game event ${gameInstanceEventId}:`,
            error
          );
          throw error; // pg-boss will retry
        }
      }
    }
  );

  console.log("[Worker] Game event worker started successfully");
}
