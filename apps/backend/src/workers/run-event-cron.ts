/**
 * Event Cron Script
 *
 * A simple Bun script that periodically processes due GameInstanceEvents.
 * Run with: bun run src/workers/run-event-cron.ts
 *
 * The script:
 * 1. Checks if the game_instance_events table exists (skips if not)
 * 2. Runs processDueGameInstanceEvents() every 5 seconds
 * 3. Logs results for monitoring
 */

import {
  processDueGameInstanceEvents,
  checkGameInstanceEventsTableExists,
} from "./due-events.worker.ts";

const POLL_INTERVAL_MS = 5000; // 5 seconds

async function main() {
  console.log("[EventCron] Starting event processing worker...");

  // Check if the table exists before starting
  const tableExists = await checkGameInstanceEventsTableExists();
  if (!tableExists) {
    console.log("[EventCron] game_instance_events table not found. Run migrations first.");
    process.exit(1);
  }

  console.log(`[EventCron] Polling every ${POLL_INTERVAL_MS / 1000}s for due events`);

  // Run immediately once, then on interval
  await runOnce();

  setInterval(runOnce, POLL_INTERVAL_MS);
}

async function runOnce() {
  try {
    const result = await processDueGameInstanceEvents();
    // Always log to see worker activity
    console.log(
      `[EventCron] Check complete - Processed: ${result.processed}, Errors: ${result.errors}`
    );
  } catch (error) {
    console.error("[EventCron] Error processing events:", error);
  }
}

// Start the cron
main().catch((error) => {
  console.error("[EventCron] Fatal error:", error);
  process.exit(1);
});
