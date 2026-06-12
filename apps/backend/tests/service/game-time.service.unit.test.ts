// tests/service/game-time.service.unit.test.ts
// Tests unitaires pour GameTimeService — service pur (pas de Prisma).
import { describe, test, expect, beforeEach } from "bun:test";
import type { GameInstance, Level, LevelEvent } from "@cashou/db-app";
import { GameTimeService } from "../../src/trpc/services/game-time.service";

type GameInstanceWithLevel = GameInstance & { level: Level | null };

function makeLevel(over: Partial<Level> = {}): Level {
  return {
    id: 1,
    title: "Test Level",
    number: 1,
    description: null,
    tip: null,
    duration: 30,
    speed: 1,
    startBalance: 10000,
    pointsRequired: 0,
    historyStartDay: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  } as Level;
}

function makeGameInstance(over: Partial<GameInstanceWithLevel> = {}): GameInstanceWithLevel {
  const createdAt = over.createdAt ?? new Date(Date.now() - 3600_000); // 1h ago
  return {
    id: 1,
    type: "SOLO",
    userId: "user-1",
    levelId: 1,
    startBalance: 10000,
    isPaused: false,
    pausedAt: null,
    actionRequired: false,
    totalPausedDuration: 0,
    currentEventIndex: 0,
    endingStartedAt: null,
    isEnded: false,
    endedAt: null,
    marketId: null,
    createdAt,
    updatedAt: createdAt,
    level: over.level ?? makeLevel(),
    ...over,
  } as GameInstanceWithLevel;
}

describe("GameTimeService", () => {
  let service: GameTimeService;

  beforeEach(() => {
    service = new GameTimeService();
  });

  describe("calculateTotalDuration", () => {
    test("calcule (duration / speed) * 86400 secondes", () => {
      const level = makeLevel({ duration: 30, speed: 1 });
      expect(service.calculateTotalDuration(level)).toBe(30 * 86400);
    });

    test("speed > 1 réduit la durée totale", () => {
      const level = makeLevel({ duration: 30, speed: 2 });
      expect(service.calculateTotalDuration(level)).toBe(15 * 86400);
    });

    test("defaults : duration=30 et speed=1 si null", () => {
      const level = makeLevel({ duration: null as unknown as number, speed: null as unknown as number });
      expect(service.calculateTotalDuration(level)).toBe(30 * 86400);
    });
  });

  describe("calculateElapsedTime", () => {
    test("retourne 0 si paused sans pausedAt et pas ended (préparation)", () => {
      const gi = makeGameInstance({ isPaused: true, pausedAt: null });
      expect(service.calculateElapsedTime(gi)).toBe(0);
    });

    test("calcule elapsed = (now - createdAt) sans pauses", () => {
      const createdAt = new Date(Date.now() - 10_000); // il y a 10s
      const gi = makeGameInstance({ createdAt });
      const elapsed = service.calculateElapsedTime(gi);
      expect(elapsed).toBeGreaterThanOrEqual(9);
      expect(elapsed).toBeLessThanOrEqual(11);
    });

    test("soustrait totalPausedDuration", () => {
      const createdAt = new Date(Date.now() - 100_000);
      const gi = makeGameInstance({ createdAt, totalPausedDuration: 30 });
      const elapsed = service.calculateElapsedTime(gi);
      expect(elapsed).toBeGreaterThanOrEqual(65);
      expect(elapsed).toBeLessThanOrEqual(75);
    });

    test("soustrait la pause courante si paused avec pausedAt", () => {
      const createdAt = new Date(Date.now() - 100_000);
      const pausedAt = new Date(Date.now() - 30_000); // pause il y a 30s
      const gi = makeGameInstance({ createdAt, isPaused: true, pausedAt });
      const elapsed = service.calculateElapsedTime(gi);
      // 100s écoulés - 30s de pause courante ≈ 70s
      expect(elapsed).toBeGreaterThanOrEqual(65);
      expect(elapsed).toBeLessThanOrEqual(75);
    });

    test("utilise endedAt si la partie est terminée", () => {
      const createdAt = new Date(Date.now() - 100_000);
      const endedAt = new Date(Date.now() - 50_000); // ended 50s ago, so 50s of game
      const gi = makeGameInstance({ createdAt, isEnded: true, endedAt });
      expect(service.calculateElapsedTime(gi)).toBe(50);
    });

    test("ne descend jamais sous 0", () => {
      const createdAt = new Date(Date.now() - 10_000);
      const gi = makeGameInstance({ createdAt, totalPausedDuration: 99999 });
      expect(service.calculateElapsedTime(gi)).toBe(0);
    });
  });

  describe("calculateTimeForPercent", () => {
    test("renvoie totalDuration * percent / 100", () => {
      const level = makeLevel({ duration: 30, speed: 1 });
      expect(service.calculateTimeForPercent(level, 50)).toBe(15 * 86400);
      expect(service.calculateTimeForPercent(level, 0)).toBe(0);
      expect(service.calculateTimeForPercent(level, 100)).toBe(30 * 86400);
    });
  });

  describe("calculateTimeInfo", () => {
    test("retourne tout à zéro si level absent", () => {
      const gi = makeGameInstance({ level: null });
      const info = service.calculateTimeInfo(gi);
      expect(info).toEqual({
        totalDurationSeconds: 0,
        elapsedSeconds: 0,
        remainingSeconds: 0,
        hasEnded: false,
        progressPercent: 0,
      });
    });

    test("calcule progressPercent et hasEnded", () => {
      const level = makeLevel({ duration: 1, speed: 86400 }); // total = 1s
      const createdAt = new Date(Date.now() - 5_000); // déjà 5s passées
      const gi = makeGameInstance({ createdAt, level });
      const info = service.calculateTimeInfo(gi);
      expect(info.totalDurationSeconds).toBe(1);
      expect(info.hasEnded).toBe(true);
      expect(info.progressPercent).toBe(100); // capé à 100
      expect(info.remainingSeconds).toBe(0);
    });
  });

  describe("getNextEventInfo", () => {
    function makeLevelEvent(over: Partial<LevelEvent> = {}): LevelEvent {
      return {
        id: 1,
        levelId: 1,
        eventId: 1,
        position: 1,
        triggerPercent: 50,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...over,
      } as LevelEvent;
    }

    test("retourne null si pas de level", () => {
      const gi = makeGameInstance({ level: null });
      expect(service.getNextEventInfo(gi, [makeLevelEvent()])).toBeNull();
    });

    test("retourne null si la partie est terminée", () => {
      const gi = makeGameInstance({ isEnded: true });
      expect(service.getNextEventInfo(gi, [makeLevelEvent()])).toBeNull();
    });

    test("retourne null s'il n'y a plus d'événement à l'index courant", () => {
      const gi = makeGameInstance({ currentEventIndex: 5 });
      expect(service.getNextEventInfo(gi, [makeLevelEvent()])).toBeNull();
    });

    test("renvoie l'événement à l'index courant trié par position", () => {
      const e1 = makeLevelEvent({ id: 1, position: 2, triggerPercent: 80 });
      const e2 = makeLevelEvent({ id: 2, position: 1, triggerPercent: 20 });
      const gi = makeGameInstance({ currentEventIndex: 0 });
      const next = service.getNextEventInfo(gi, [e1, e2]);
      expect(next?.levelEvent.id).toBe(2); // position 1 d'abord
    });

    test("delaySeconds = max(0, triggerTime - elapsed)", () => {
      const level = makeLevel({ duration: 30, speed: 1 }); // total = 2 592 000s
      const createdAt = new Date(Date.now() - 1000); // 1s elapsed
      const gi = makeGameInstance({ createdAt, level });
      const event = makeLevelEvent({ triggerPercent: 50 });
      const next = service.getNextEventInfo(gi, [event]);
      // triggerTime = 1 296 000s ; elapsed ≈ 1s → delay ≈ 1 295 999s
      expect(next?.delaySeconds).toBeGreaterThan(1_000_000);
    });
  });

  describe("getRemainingTimeUntilEnd", () => {
    test("retourne 0 si pas de level", () => {
      const gi = makeGameInstance({ level: null });
      expect(service.getRemainingTimeUntilEnd(gi)).toBe(0);
    });

    test("retourne totalDuration - elapsed", () => {
      const level = makeLevel({ duration: 1, speed: 86400 }); // total = 1s
      const createdAt = new Date(); // ~0s elapsed
      const gi = makeGameInstance({ createdAt, level });
      const remaining = service.getRemainingTimeUntilEnd(gi);
      expect(remaining).toBeGreaterThanOrEqual(0);
      expect(remaining).toBeLessThanOrEqual(1);
    });
  });

  describe("shouldEventHaveTriggered", () => {
    test("false si pas de level", () => {
      const gi = makeGameInstance({ level: null });
      const event = { id: 1, triggerPercent: 50 } as LevelEvent;
      expect(service.shouldEventHaveTriggered(gi, event)).toBe(false);
    });

    test("true si elapsed >= triggerTime", () => {
      const level = makeLevel({ duration: 1, speed: 86400 }); // total = 1s
      const createdAt = new Date(Date.now() - 2000); // 2s elapsed
      const gi = makeGameInstance({ createdAt, level });
      const event = { id: 1, triggerPercent: 50 } as LevelEvent; // trigger à 0.5s
      expect(service.shouldEventHaveTriggered(gi, event)).toBe(true);
    });

    test("false si elapsed < triggerTime", () => {
      const level = makeLevel({ duration: 30, speed: 1 }); // total = 30j
      const createdAt = new Date(); // elapsed ≈ 0
      const gi = makeGameInstance({ createdAt, level });
      const event = { id: 1, triggerPercent: 50 } as LevelEvent;
      expect(service.shouldEventHaveTriggered(gi, event)).toBe(false);
    });
  });

  describe("calculateElapsedTimeSince", () => {
    test("retourne 0 si paused sans pausedAt et pas ended", () => {
      const gi = makeGameInstance({ isPaused: true, pausedAt: null });
      expect(service.calculateElapsedTimeSince(gi, new Date())).toBe(0);
    });

    test("calcule depuis sinceDate", () => {
      const createdAt = new Date(Date.now() - 100_000);
      const sinceDate = new Date(Date.now() - 30_000);
      const gi = makeGameInstance({ createdAt });
      const elapsed = service.calculateElapsedTimeSince(gi, sinceDate);
      expect(elapsed).toBeGreaterThanOrEqual(25);
      expect(elapsed).toBeLessThanOrEqual(35);
    });

    test("utilise game start si sinceDate est antérieure", () => {
      const createdAt = new Date(Date.now() - 50_000);
      const sinceDate = new Date(Date.now() - 200_000); // bien avant le createdAt
      const gi = makeGameInstance({ createdAt });
      const elapsed = service.calculateElapsedTimeSince(gi, sinceDate);
      // doit être borné à elapsed depuis createdAt (50s), pas 200s
      expect(elapsed).toBeGreaterThanOrEqual(45);
      expect(elapsed).toBeLessThanOrEqual(55);
    });

    test("ne descend jamais sous 0", () => {
      const createdAt = new Date(Date.now() - 10_000);
      const gi = makeGameInstance({ createdAt, totalPausedDuration: 99999 });
      expect(service.calculateElapsedTimeSince(gi, createdAt)).toBe(0);
    });
  });

  describe("convertRealSecondsToGameDays", () => {
    test("realSeconds * speed / 86400", () => {
      const level = makeLevel({ speed: 1 });
      expect(service.convertRealSecondsToGameDays(level, 86400)).toBe(1);
      expect(service.convertRealSecondsToGameDays(level, 43200)).toBe(0.5);
    });

    test("speed > 1 accélère le temps de jeu", () => {
      const level = makeLevel({ speed: 2 });
      expect(service.convertRealSecondsToGameDays(level, 86400)).toBe(2);
    });

    test("default speed=1 si null", () => {
      const level = makeLevel({ speed: null as unknown as number });
      expect(service.convertRealSecondsToGameDays(level, 86400)).toBe(1);
    });
  });
});
