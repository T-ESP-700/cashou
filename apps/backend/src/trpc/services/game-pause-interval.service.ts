import type { Prisma, PrismaClient } from "@cashou/db-app";
import defaultPrisma from "../../database.ts";

type Executor = PrismaClient | Prisma.TransactionClient;

type IntervalRow = {
  id: number;
  started_at: Date;
  ended_at: Date | null;
};

type SumRow = {
  paused_seconds: number | null;
  interval_count: number | null;
};

export class GamePauseIntervalService {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || defaultPrisma;
  }

  private getExecutor(executor?: Executor): Executor {
    return executor || this.prisma;
  }

  async startPause(
    gameInstanceId: number,
    startedAt: Date,
    reason?: string,
    executor?: Executor,
  ): Promise<void> {
    const db = this.getExecutor(executor);
    const openRows = await db.$queryRaw<IntervalRow[]>`
      SELECT id, started_at, ended_at
      FROM game_instance_pause_intervals
      WHERE game_instance_id = ${gameInstanceId}
        AND ended_at IS NULL
      ORDER BY started_at DESC
      LIMIT 1
    `;

    if (openRows.length > 0) return;

    await db.$executeRaw`
      INSERT INTO game_instance_pause_intervals (game_instance_id, started_at, ended_at, reason, created_at, updated_at)
      VALUES (${gameInstanceId}, ${startedAt}, NULL, ${reason ?? null}, NOW(), NOW())
    `;
  }

  async endPause(
    gameInstanceId: number,
    endedAt: Date,
    executor?: Executor,
  ): Promise<void> {
    const db = this.getExecutor(executor);
    await db.$executeRaw`
      UPDATE game_instance_pause_intervals
      SET ended_at = ${endedAt}, updated_at = NOW()
      WHERE game_instance_id = ${gameInstanceId}
        AND ended_at IS NULL
    `;
  }

  async clearIntervals(gameInstanceId: number, executor?: Executor): Promise<void> {
    const db = this.getExecutor(executor);
    await db.$executeRaw`
      DELETE FROM game_instance_pause_intervals
      WHERE game_instance_id = ${gameInstanceId}
    `;
  }

  async getPausedSecondsWithinWindow(
    gameInstanceId: number,
    start: Date,
    end: Date,
    executor?: Executor,
  ): Promise<{ pausedSeconds: number; intervalCount: number }> {
    if (end <= start) {
      return { pausedSeconds: 0, intervalCount: 0 };
    }

    const db = this.getExecutor(executor);
    const rows = await db.$queryRaw<SumRow[]>`
      SELECT
        COALESCE(SUM(
          EXTRACT(EPOCH FROM (
            LEAST(COALESCE(ended_at, ${end}), ${end}) -
            GREATEST(started_at, ${start})
          ))
        ), 0) AS paused_seconds,
        COUNT(*)::int AS interval_count
      FROM game_instance_pause_intervals
      WHERE game_instance_id = ${gameInstanceId}
        AND started_at < ${end}
        AND COALESCE(ended_at, ${end}) > ${start}
    `;

    const row = rows[0];
    return {
      pausedSeconds: Math.max(0, Math.floor(Number(row?.paused_seconds ?? 0))),
      intervalCount: Number(row?.interval_count ?? 0),
    };
  }
}
