// tests/service/game-time.service.regression.test.ts
// Régression — calculateElapsedTimeSince ne doit jamais avancer pendant une pause,
// y compris pour un holding acquis pendant cette pause (mode préparation ou pause d'événement).
import { describe, test, expect } from "bun:test";
import type { PrismaClient } from "@cashou/db-app";
import { GameTimeService } from "../../src/trpc/services/game-time.service";

const SECOND = 1000;

/**
 * Prisma mock: `$queryRaw` backs getPausedSecondsWithinWindow.
 * intervalCount = 0 exercises the legacy fallback (totalPausedDuration).
 */
function makeService(pausedSeconds = 0, intervalCount = 0) {
  const prisma = {
    $queryRaw: async () => [
      { paused_seconds: pausedSeconds, interval_count: intervalCount },
    ],
  } as unknown as PrismaClient;
  return new GameTimeService(prisma);
}

function makeGameInstance(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    createdAt: new Date(Date.now() - 600 * SECOND),
    isPaused: false,
    pausedAt: null,
    totalPausedDuration: 0,
    isEnded: false,
    endedAt: null,
    level: { id: 1, duration: 435, speed: 1314000 },
    ...overrides,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe("GameTimeService.calculateElapsedTimeSince", () => {
  test("returns 0 in preparation mode (paused since creation)", async () => {
    const createdAt = new Date(Date.now() - 300 * SECOND);
    const gameInstance = makeGameInstance({
      createdAt,
      isPaused: true,
      pausedAt: createdAt,
    });
    // Holding acquis 60s après la création, pendant la préparation
    const acquiredAt = new Date(createdAt.getTime() + 60 * SECOND);

    expect(await makeService().calculateElapsedTimeSince(gameInstance, acquiredAt)).toBe(0);
  });

  test("returns 0 for a holding acquired during a mid-game pause", async () => {
    const createdAt = new Date(Date.now() - 600 * SECOND);
    const pausedAt = new Date(Date.now() - 300 * SECOND);
    const gameInstance = makeGameInstance({ createdAt, isPaused: true, pausedAt });
    // Acheté 100s après le début de la pause
    const acquiredAt = new Date(pausedAt.getTime() + 100 * SECOND);

    expect(await makeService().calculateElapsedTimeSince(gameInstance, acquiredAt)).toBe(0);
  });

  test("freezes elapsed time at pausedAt for a holding acquired before the pause", async () => {
    const createdAt = new Date(Date.now() - 600 * SECOND);
    const acquiredAt = new Date(createdAt.getTime() + 100 * SECOND);
    const pausedAt = new Date(acquiredAt.getTime() + 200 * SECOND);
    const gameInstance = makeGameInstance({ createdAt, isPaused: true, pausedAt });

    // Le temps réel continue d'avancer, mais l'horloge de jeu est figée à pausedAt
    expect(await makeService().calculateElapsedTimeSince(gameInstance, acquiredAt)).toBe(200);
  });

  test("subtracts recorded pause intervals inside the window", async () => {
    const createdAt = new Date(Date.now() - 600 * SECOND);
    const acquiredAt = new Date(Date.now() - 300 * SECOND);
    const gameInstance = makeGameInstance({ createdAt });

    // 50s de pause enregistrées dans la fenêtre [acquiredAt, now]
    const elapsed = await makeService(50, 1).calculateElapsedTimeSince(gameInstance, acquiredAt);
    expect(elapsed).toBeGreaterThanOrEqual(249);
    expect(elapsed).toBeLessThanOrEqual(251);
  });

  test("accrues normally while the game is running", async () => {
    const createdAt = new Date(Date.now() - 600 * SECOND);
    const acquiredAt = new Date(Date.now() - 120 * SECOND);
    const gameInstance = makeGameInstance({ createdAt });

    const elapsed = await makeService().calculateElapsedTimeSince(gameInstance, acquiredAt);
    expect(elapsed).toBeGreaterThanOrEqual(119);
    expect(elapsed).toBeLessThanOrEqual(121);
  });

  test("stops at endedAt once the game has ended", async () => {
    const createdAt = new Date(Date.now() - 600 * SECOND);
    const acquiredAt = new Date(createdAt.getTime() + 100 * SECOND);
    const endedAt = new Date(acquiredAt.getTime() + 150 * SECOND);
    const gameInstance = makeGameInstance({ createdAt, isEnded: true, endedAt });

    expect(await makeService().calculateElapsedTimeSince(gameInstance, acquiredAt)).toBe(150);
  });
});
