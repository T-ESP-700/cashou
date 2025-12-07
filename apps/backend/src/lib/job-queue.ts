import { PgBoss } from "pg-boss";
import type { WipData } from "pg-boss";

const databaseUrl = process.env.CASHOU_DB_URL;

let boss: PgBoss | null = null;

/**
 * Job queue names used throughout the application
 */
export const JOB_NAMES = {
  /** Triggers a game event at a specific time */
  EVENT_TRIGGER: "game-event-trigger",
  /** Triggers end of game at 100% duration */
  GAME_END: "game-end",
} as const;

/**
 * Job data types
 */
export interface EventTriggerJobData {
  gameInstanceId: number;
  levelEventId: number;
}

export interface GameEndJobData {
  gameInstanceId: number;
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
  const queuesToCreate = [JOB_NAMES.EVENT_TRIGGER, JOB_NAMES.GAME_END];

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
 * Schedule an event trigger job
 */
export async function scheduleEventTrigger(
  gameInstanceId: number,
  levelEventId: number,
  delaySeconds: number
): Promise<string | null> {
  const queue = await getJobQueue();

  const data: EventTriggerJobData = {
    gameInstanceId,
    levelEventId,
  };

  const jobId = await queue.send(JOB_NAMES.EVENT_TRIGGER, data, {
    startAfter: delaySeconds,
    singletonKey: `event-${gameInstanceId}-${levelEventId}`,
    retryLimit: 3,
    retryDelay: 60,
  });

  console.log(
    `[pg-boss] Scheduled event trigger for game ${gameInstanceId}, event ${levelEventId} in ${delaySeconds}s (job: ${jobId})`
  );

  return jobId;
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
 * Cancel all scheduled jobs for a game instance
 * Uses raw SQL to find and cancel jobs by singleton key pattern
 */
export async function cancelGameJobs(gameInstanceId: number): Promise<void> {
  const queue = await getJobQueue();

  // Get job IDs for event triggers with matching singleton key pattern
  const eventJobIds = await getJobIdsBySingletonPattern(
    JOB_NAMES.EVENT_TRIGGER,
    `event-${gameInstanceId}-%`
  );

  // Get job ID for game end
  const gameEndJobIds = await getJobIdsBySingletonPattern(
    JOB_NAMES.GAME_END,
    `game-end-${gameInstanceId}`
  );

  // Cancel all found jobs
  const allJobIds = [...eventJobIds, ...gameEndJobIds];

  for (const jobId of allJobIds) {
    try {
      await queue.cancel(JOB_NAMES.EVENT_TRIGGER, jobId);
    } catch {
      // Job might not exist anymore, ignore
    }
  }

  console.log(
    `[pg-boss] Cancelled ${allJobIds.length} jobs for game ${gameInstanceId}`
  );
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
