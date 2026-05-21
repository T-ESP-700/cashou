import { PgBoss } from "pg-boss";
import type { WipData } from "pg-boss";

const databaseUrl = process.env.CASHOU_DB_URL;

let boss: PgBoss | null = null;

/**
 * Job queue names used throughout the application
 */
export const JOB_NAMES = {
  /** Triggers end of game at 100% duration */
  GAME_END: "game-end",
  /** Triggers a game event at a scheduled time */
  GAME_EVENT: "game-event",
} as const;

export interface GameEndJobData {
  gameInstanceId: number;
}

export interface GameEventJobData {
  gameInstanceEventId: number;
}

/**
 * Get or create the pg-boss singleton instance
 */
export async function getJobQueue(): Promise<PgBoss> {
  if (boss) return boss;

  if (!databaseUrl) {
    throw new Error(
      "CASHOU_DB_URL environment variable is required for job queue"
    );
  }

  boss = new PgBoss({
    connectionString: databaseUrl,
    // pg-boss creates its own schema, won't interfere with Prisma tables
    schema: "pgboss",
    // Maintenance configuration
    maintenanceIntervalSeconds: 60,
    // Monitor interval
    monitorIntervalSeconds: 30,
  });

  boss.on("error", (error: Error) => console.error("[pg-boss] Error:", error));
  boss.on("wip", (workers: WipData[]) => {
    const activeCount = workers.filter(w => w.state === "active").length;
    console.log(`[pg-boss] Active workers: ${activeCount}, Total: ${workers.length}`);
  });

  await boss.start();

  // Create queues (required in pg-boss v10+)
  await createQueuesIfNotExist(boss);

  console.log("[pg-boss] Job queue started successfully");

  return boss;
}

/**
 * Create queues if they don't exist (required for pg-boss v10+)
 */
async function createQueuesIfNotExist(queue: PgBoss): Promise<void> {
  const queuesToCreate = [JOB_NAMES.GAME_END, JOB_NAMES.GAME_EVENT];

  for (const queueName of queuesToCreate) {
    try {
      await queue.createQueue(queueName);
      console.log(`[pg-boss] Queue "${queueName}" created`);
    } catch (error) {
      // Queue might already exist, check error
      if (error instanceof Error && error.message.includes("already exists")) {
        console.log(`[pg-boss] Queue "${queueName}" already exists`);
      } else {
        console.warn(`[pg-boss] Could not create queue "${queueName}":`, error);
      }
    }
  }
}

/**
 * Stop the job queue gracefully
 */
export async function stopJobQueue(): Promise<void> {
  if (boss) {
    console.log("[pg-boss] Stopping job queue...");
    await boss.stop({ graceful: true, timeout: 10000 });
    boss = null;
    console.log("[pg-boss] Job queue stopped");
  }
}

/**
 * Schedule a game end job
 */
export async function scheduleGameEnd(
  gameInstanceId: number,
  delaySeconds: number
): Promise<string | null> {
  const queue = await getJobQueue();

  const data: GameEndJobData = {
    gameInstanceId,
  };

  const jobId = await queue.send(JOB_NAMES.GAME_END, data, {
    startAfter: delaySeconds,
    singletonKey: `game-end-${gameInstanceId}`,
    retryLimit: 3,
    retryDelay: 60,
  });

  console.log(
    `[pg-boss] Scheduled game end for game ${gameInstanceId} in ${delaySeconds}s (job: ${jobId})`
  );

  return jobId;
}

/**
 * Schedule a game event job
 * @param gameInstanceEventId - The ID of the GameInstanceEvent to trigger
 * @param scheduledAt - The date/time when the event should be triggered
 */
export async function scheduleGameEvent(
  gameInstanceEventId: number,
  scheduledAt: Date
): Promise<string | null> {
  const queue = await getJobQueue();

  const data: GameEventJobData = {
    gameInstanceEventId,
  };

  // Calculate delay in seconds from now
  const delaySeconds = Math.max(0, Math.floor((scheduledAt.getTime() - Date.now()) / 1000));

  const jobId = await queue.send(JOB_NAMES.GAME_EVENT, data, {
    startAfter: delaySeconds,
    singletonKey: `game-event-${gameInstanceEventId}`,
    retryLimit: 5,
    retryDelay: 5,
  });

  console.log(
    `[pg-boss] Scheduled game event ${gameInstanceEventId} at ${scheduledAt.toISOString()} (in ${delaySeconds}s, job: ${jobId})`
  );

  return jobId;
}

/**
 * Cancel a specific game event job
 */
export async function cancelGameEvent(gameInstanceEventId: number): Promise<void> {
  const queue = await getJobQueue();

  const jobIds = await getJobIdsBySingletonPattern(
    JOB_NAMES.GAME_EVENT,
    `game-event-${gameInstanceEventId}`
  );

  for (const jobId of jobIds) {
    try {
      await queue.cancel(JOB_NAMES.GAME_EVENT, jobId);
    } catch {
      // Job might not exist anymore, ignore
    }
  }

  if (jobIds.length > 0) {
    console.log(`[pg-boss] Cancelled game event job for event ${gameInstanceEventId}`);
  }
}

/**
 * Cancel all scheduled jobs for a game instance (both GAME_END and GAME_EVENT jobs)
 * Uses raw SQL to find and cancel jobs by singleton key pattern
 */
export async function cancelGameJobs(gameInstanceId: number): Promise<void> {
  const queue = await getJobQueue();

  // Get job IDs for game end
  const gameEndJobIds = await getJobIdsBySingletonPattern(
    JOB_NAMES.GAME_END,
    `game-end-${gameInstanceId}`
  );

  for (const jobId of gameEndJobIds) {
    try {
      await queue.cancel(JOB_NAMES.GAME_END, jobId);
    } catch {
      // Job might not exist anymore, ignore
    }
  }

  // Get job IDs for game events (using pattern matching with %)
  const gameEventJobIds = await getJobIdsByGameInstanceId(gameInstanceId);

  for (const jobId of gameEventJobIds) {
    try {
      await queue.cancel(JOB_NAMES.GAME_EVENT, jobId);
    } catch {
      // Job might not exist anymore, ignore
    }
  }

  console.log(
    `[pg-boss] Cancelled ${gameEndJobIds.length} game-end jobs and ${gameEventJobIds.length} game-event jobs for game ${gameInstanceId}`
  );
}

/**
 * Get game event job IDs by game instance ID
 * Looks up GameInstanceEvents in the database to find the corresponding job singleton keys
 */
async function getJobIdsByGameInstanceId(gameInstanceId: number): Promise<string[]> {
  const { default: prisma } = await import("../database.ts");

  // Get all non-triggered events for this game instance
  const events = await prisma.gameInstanceEvent.findMany({
    where: {
      gameInstanceId,
      triggeredAt: null,
    },
    select: { id: true },
  });

  if (events.length === 0) {
    return [];
  }

  // Get job IDs for each event
  const allJobIds: string[] = [];
  for (const event of events) {
    const jobIds = await getJobIdsBySingletonPattern(
      JOB_NAMES.GAME_EVENT,
      `game-event-${event.id}`
    );
    allJobIds.push(...jobIds);
  }

  return allJobIds;
}

/**
 * Get job IDs by singleton key pattern using raw SQL
 */
async function getJobIdsBySingletonPattern(
  queueName: string,
  pattern: string
): Promise<string[]> {
  // Import prisma for raw query
  const { default: prisma } = await import("../database.ts");

  const sqlPattern = pattern.replace(/%/g, "%");

  const result = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM pgboss.job
    WHERE name = ${queueName}
    AND singleton_key LIKE ${sqlPattern}
    AND state IN ('created', 'retry')
  `;

  return result.map((r: { id: string }) => r.id);
}

/**
 * Get the current pg-boss instance (for advanced usage)
 */
export function getJobQueueInstance(): PgBoss | null {
  return boss;
}
