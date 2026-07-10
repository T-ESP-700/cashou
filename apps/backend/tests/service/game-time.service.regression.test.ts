// tests/service/game-time.service.regression.test.ts
// Régression — calculateElapsedTimeSince ne doit jamais avancer pendant une pause,
// y compris pour un holding acquis pendant cette pause (mode préparation).
import { describe, test, expect } from "bun:test";
import { GameTimeService } from "../../src/trpc/services/game-time.service";

const SECOND = 1000;
const service = new GameTimeService();

function buildGameInstance(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    createdAt: new Date(Date.now() - 600 * SECOND),
    isPaused: false,
    pausedAt: null,
    totalPausedDuration: 0,
    isEnded: false,
    endedAt: null,
    level: { id: 1, duration: 1825, speed: 1314000 },
    ...overrides,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe("GameTimeService.calculateElapsedTimeSince", () => {
  test("returns 0 in preparation mode (paused since creation)", () => {
    const createdAt = new Date(Date.now() - 300 * SECOND);
    const gameInstance = buildGameInstance({
      createdAt,
      isPaused: true,
      pausedAt: createdAt,
    });

    // Holding acquis 60s après la création, pendant la préparation
    const acquiredAt = new Date(createdAt.getTime() + 60 * SECOND);

    expect(service.calculateElapsedTimeSince(gameInstance, acquiredAt)).toBe(0);
  });

  test("returns 0 for a holding acquired during a mid-game pause", () => {
    const createdAt = new Date(Date.now() - 600 * SECOND);
    const pausedAt = new Date(Date.now() - 300 * SECOND);
    const gameInstance = buildGameInstance({
      createdAt,
      isPaused: true,
      pausedAt,
    });

    // Acheté 100s après le début de la pause
    const acquiredAt = new Date(pausedAt.getTime() + 100 * SECOND);

    expect(service.calculateElapsedTimeSince(gameInstance, acquiredAt)).toBe(0);
  });

  test("freezes elapsed time at pausedAt for a holding acquired before the pause", () => {
    const createdAt = new Date(Date.now() - 600 * SECOND);
    const acquiredAt = new Date(createdAt.getTime() + 100 * SECOND);
    const pausedAt = new Date(acquiredAt.getTime() + 200 * SECOND);
    const gameInstance = buildGameInstance({
      createdAt,
      isPaused: true,
      pausedAt,
    });

    // Le temps réel continue d'avancer, mais l'horloge de jeu est figée à pausedAt
    expect(service.calculateElapsedTimeSince(gameInstance, acquiredAt)).toBe(200);
  });

  test("accrues normally while the game is running", () => {
    const createdAt = new Date(Date.now() - 600 * SECOND);
    const acquiredAt = new Date(Date.now() - 120 * SECOND);
    const gameInstance = buildGameInstance({ createdAt });

    expect(service.calculateElapsedTimeSince(gameInstance, acquiredAt)).toBeGreaterThanOrEqual(119);
    expect(service.calculateElapsedTimeSince(gameInstance, acquiredAt)).toBeLessThanOrEqual(121);
  });

  test("stops at endedAt once the game has ended", () => {
    const createdAt = new Date(Date.now() - 600 * SECOND);
    const acquiredAt = new Date(createdAt.getTime() + 100 * SECOND);
    const endedAt = new Date(acquiredAt.getTime() + 150 * SECOND);
    const gameInstance = buildGameInstance({
      createdAt,
      isEnded: true,
      endedAt,
    });

    expect(service.calculateElapsedTimeSince(gameInstance, acquiredAt)).toBe(150);
  });
});
