// tests/service/game-event-trigger.service.unit.test.ts
// Tests unitaires pour GameEventTriggerService.
// On mock le module job-queue pour ne pas démarrer pg-boss.
import { describe, test, expect, mock, beforeEach } from "bun:test";
import type { PrismaClient } from "@cashou/db-app";

// Mock du module job-queue avant l'import du service. On stubbe TOUTES les exports
// pour éviter que d'autres fichiers de test importent des fonctions devenues undefined.
const scheduleGameEnd = mock(async (_id: number, _delay: number) => {});
const scheduleGameEvent = mock(async (_id: number, _at: Date) => {});
const cancelGameEvent = mock(async (_id: number) => {});
const cancelGameJobs = mock(async (_id: number) => {});

mock.module("../../src/lib/job-queue.ts", () => ({
  JOB_NAMES: { GAME_END: "game-end", GAME_EVENT: "game-event" },
  getJobQueue: async () => null,
  stopJobQueue: async () => {},
  scheduleGameEnd,
  scheduleGameEvent,
  cancelGameEvent,
  cancelGameJobs,
  getJobQueueInstance: () => null,
}));

// Import après le mock pour que le service utilise nos stubs.
const { GameEventTriggerService } = await import(
  "../../src/trpc/services/game-event-trigger.service"
);

function makeLevel(over: Record<string, unknown> = {}) {
  return {
    id: 1,
    title: "Level",
    duration: 30,
    speed: 1,
    historyStartDay: 0,
    levelEvents: [],
    ...over,
  };
}

function makeGameInstance(over: Record<string, unknown> = {}) {
  return {
    id: 100,
    createdAt: new Date(Date.now() - 3600_000),
    isEnded: false,
    isPaused: false,
    pausedAt: null,
    totalPausedDuration: 0,
    currentEventIndex: 0,
    level: makeLevel(),
    ...over,
  };
}

function createMockPrisma(gi: ReturnType<typeof makeGameInstance> | null) {
  return {
    gameInstance: {
      findUnique: mock(async () => gi),
      update: mock(async (args: { data: Record<string, unknown> }) => ({
        ...(gi ?? {}),
        ...args.data,
      })),
    },
    gameInstanceEvent: {
      findFirst: mock(async (): Promise<unknown> => null),
      findMany: mock(async (): Promise<unknown[]> => []),
      update: mock(async (): Promise<unknown> => ({})),
    },
    // GamePauseIntervalService écrit les intervalles de pause en SQL brut.
    $queryRaw: mock(async (): Promise<unknown[]> => []),
    $executeRaw: mock(async (): Promise<number> => 0),
  };
}

describe("GameEventTriggerService", () => {
  beforeEach(() => {
    scheduleGameEnd.mockClear();
    scheduleGameEvent.mockClear();
    cancelGameEvent.mockClear();
  });

  describe("completeEvent", () => {
    test("throw si gameInstance introuvable", async () => {
      const prisma = createMockPrisma(null);
      const service = new GameEventTriggerService(prisma as unknown as PrismaClient);
      expect(service.completeEvent(999)).rejects.toThrow("not found");
    });

    test("throw si la partie n'a pas de level", async () => {
      const gi = makeGameInstance({ level: null });
      const prisma = createMockPrisma(gi);
      const service = new GameEventTriggerService(prisma as unknown as PrismaClient);
      expect(service.completeEvent(100)).rejects.toThrow("no level");
    });

    test("retourne early si la partie est terminée", async () => {
      const gi = makeGameInstance({ isEnded: true });
      const prisma = createMockPrisma(gi);
      const service = new GameEventTriggerService(prisma as unknown as PrismaClient);
      await service.completeEvent(100);
      expect(prisma.gameInstance.update).not.toHaveBeenCalled();
    });

    test("incrémente currentEventIndex et reset les flags pause/action", async () => {
      const gi = makeGameInstance({ currentEventIndex: 0 });
      const prisma = createMockPrisma(gi);
      const service = new GameEventTriggerService(prisma as unknown as PrismaClient);
      await service.completeEvent(100);
      const updateCall = prisma.gameInstance.update.mock.calls[0]?.[0] as { data: Record<string, unknown> };
      expect(updateCall.data.currentEventIndex).toBe(1);
      expect(updateCall.data.isPaused).toBe(false);
      expect(updateCall.data.pausedAt).toBe(null);
      expect(updateCall.data.actionRequired).toBe(false);
    });

    test("schedule game-end quand tous les events sont consommés", async () => {
      const gi = makeGameInstance({
        currentEventIndex: 0,
        level: makeLevel({ levelEvents: [{ id: 1, position: 1, triggerPercent: 50 }] }),
      });
      const prisma = createMockPrisma(gi);
      const service = new GameEventTriggerService(prisma as unknown as PrismaClient);
      await service.completeEvent(100);
      expect(scheduleGameEnd).toHaveBeenCalledTimes(1);
      expect(scheduleGameEvent).not.toHaveBeenCalled();
    });

    test("schedule le prochain event si encore des events à venir", async () => {
      const gi = makeGameInstance({
        currentEventIndex: 0,
        level: makeLevel({
          levelEvents: [
            { id: 1, position: 1, triggerPercent: 30 },
            { id: 2, position: 2, triggerPercent: 60 },
          ],
        }),
      });
      const prisma = createMockPrisma(gi);
      const nextScheduled = new Date(Date.now() + 60_000);
      prisma.gameInstanceEvent.findFirst = mock(async () => ({
        id: 42,
        scheduledAt: nextScheduled,
      }));
      const service = new GameEventTriggerService(prisma as unknown as PrismaClient);
      await service.completeEvent(100);
      expect(scheduleGameEvent).toHaveBeenCalledWith(42, nextScheduled);
      expect(scheduleGameEnd).not.toHaveBeenCalled();
    });

    test("ajoute la durée de pause en cours à totalPausedDuration", async () => {
      const pausedAt = new Date(Date.now() - 5000); // pause depuis 5s
      const gi = makeGameInstance({ pausedAt, totalPausedDuration: 10 });
      const prisma = createMockPrisma(gi);
      const service = new GameEventTriggerService(prisma as unknown as PrismaClient);
      await service.completeEvent(100);
      const updateCall = prisma.gameInstance.update.mock.calls[0]?.[0] as { data: Record<string, number> };
      expect(updateCall.data.totalPausedDuration).toBeGreaterThanOrEqual(14);
      expect(updateCall.data.totalPausedDuration).toBeLessThanOrEqual(16);
    });
  });

  describe("scheduleFirstEvent", () => {
    test("throw si gameInstance introuvable", async () => {
      const prisma = createMockPrisma(null);
      const service = new GameEventTriggerService(prisma as unknown as PrismaClient);
      expect(service.scheduleFirstEvent(999)).rejects.toThrow("not found or has no level");
    });

    test("schedule game-end directement si aucun event", async () => {
      const gi = makeGameInstance({ level: makeLevel({ levelEvents: [] }) });
      const prisma = createMockPrisma(gi);
      const service = new GameEventTriggerService(prisma as unknown as PrismaClient);
      await service.scheduleFirstEvent(100);
      expect(scheduleGameEnd).toHaveBeenCalledTimes(1);
    });

    test("ne schedule rien si des events existent (déjà géré par scheduleEventsForGameInstance)", async () => {
      const gi = makeGameInstance({
        level: makeLevel({ levelEvents: [{ id: 1, position: 1, triggerPercent: 50 }] }),
      });
      const prisma = createMockPrisma(gi);
      prisma.gameInstanceEvent.findFirst = mock(async () => ({
        id: 1,
        scheduledAt: new Date(),
      }));
      const service = new GameEventTriggerService(prisma as unknown as PrismaClient);
      await service.scheduleFirstEvent(100);
      expect(scheduleGameEnd).not.toHaveBeenCalled();
      expect(scheduleGameEvent).not.toHaveBeenCalled();
    });
  });

  describe("rescheduleAfterResume", () => {
    test("ne fait rien si gameInstance introuvable", async () => {
      const prisma = createMockPrisma(null);
      const service = new GameEventTriggerService(prisma as unknown as PrismaClient);
      await service.rescheduleAfterResume(999);
      expect(scheduleGameEnd).not.toHaveBeenCalled();
    });

    test("ne fait rien si la partie est terminée", async () => {
      const gi = makeGameInstance({ isEnded: true });
      const prisma = createMockPrisma(gi);
      const service = new GameEventTriggerService(prisma as unknown as PrismaClient);
      await service.rescheduleAfterResume(100);
      expect(scheduleGameEnd).not.toHaveBeenCalled();
    });

    test("reschedule game-end si tous les events sont consommés", async () => {
      const gi = makeGameInstance({
        currentEventIndex: 1,
        level: makeLevel({ levelEvents: [{ id: 1, position: 1, triggerPercent: 50 }] }),
      });
      const prisma = createMockPrisma(gi);
      const service = new GameEventTriggerService(prisma as unknown as PrismaClient);
      await service.rescheduleAfterResume(100);
      expect(scheduleGameEnd).toHaveBeenCalledTimes(1);
    });

    test("cancel + reschedule le prochain event pending sinon", async () => {
      const gi = makeGameInstance({
        currentEventIndex: 0,
        level: makeLevel({
          levelEvents: [
            { id: 1, position: 1, triggerPercent: 30 },
            { id: 2, position: 2, triggerPercent: 60 },
          ],
        }),
      });
      const prisma = createMockPrisma(gi);
      const scheduledAt = new Date(Date.now() + 60_000);
      prisma.gameInstanceEvent.findFirst = mock(async () => ({ id: 7, scheduledAt }));
      const service = new GameEventTriggerService(prisma as unknown as PrismaClient);
      await service.rescheduleAfterResume(100);
      expect(cancelGameEvent).toHaveBeenCalledWith(7);
      expect(scheduleGameEvent).toHaveBeenCalledWith(7, scheduledAt);
    });
  });
});
