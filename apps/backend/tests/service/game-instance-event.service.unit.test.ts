// tests/service/game-instance-event.service.unit.test.ts
// Tests unitaires pour GameInstanceEventService. Mock du module job-queue.
import { describe, test, expect, mock, beforeEach } from "bun:test";
import type { PrismaClient } from "@cashou/db-app";

// Stub TOUTES les exports du module job-queue pour éviter qu'un autre test plante
// en important une fonction qui aurait disparu du mock.
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

const { GameInstanceEventService } = await import(
  "../../src/trpc/services/game-instance-event.service"
);

function createMockPrisma(overrides: Record<string, unknown> = {}) {
  return {
    gameInstance: {
      findUnique: mock(async (_args?: unknown): Promise<unknown> => null),
    },
    gameInstanceEvent: {
      count: mock(async (_args?: unknown): Promise<number> => 0),
      findMany: mock(async (_args?: unknown): Promise<unknown[]> => []),
      createMany: mock(async (_args?: unknown): Promise<{ count: number }> => ({ count: 0 })),
      deleteMany: mock(async (_args?: unknown): Promise<{ count: number }> => ({ count: 0 })),
      update: mock(async (_args?: unknown): Promise<unknown> => ({})),
    },
    ...overrides,
  };
}

describe("GameInstanceEventService", () => {
  beforeEach(() => {
    scheduleGameEvent.mockClear();
    cancelGameEvent.mockClear();
  });

  describe("scheduleEventsForGameInstance", () => {
    test("throw si gameInstance introuvable", async () => {
      const prisma = createMockPrisma();
      const service = new GameInstanceEventService(prisma as unknown as PrismaClient);
      expect(service.scheduleEventsForGameInstance(999)).rejects.toThrow("not found");
    });

    test("return early si pas de level", async () => {
      const prisma = createMockPrisma();
      prisma.gameInstance.findUnique = mock(async () => ({
        id: 1,
        levelId: null,
        createdAt: new Date(),
        level: null,
      }));
      const service = new GameInstanceEventService(prisma as unknown as PrismaClient);
      await service.scheduleEventsForGameInstance(1);
      expect(prisma.gameInstanceEvent.createMany).not.toHaveBeenCalled();
    });

    test("return early si level sans events", async () => {
      const prisma = createMockPrisma();
      prisma.gameInstance.findUnique = mock(async () => ({
        id: 1,
        levelId: 1,
        createdAt: new Date(),
        level: { id: 1, duration: 30, speed: 1, levelEvents: [] },
      }));
      const service = new GameInstanceEventService(prisma as unknown as PrismaClient);
      await service.scheduleEventsForGameInstance(1);
      expect(prisma.gameInstanceEvent.createMany).not.toHaveBeenCalled();
      expect(scheduleGameEvent).not.toHaveBeenCalled();
    });

    test("crée les events et schedule le premier via pg-boss", async () => {
      const createdAt = new Date("2024-01-01T00:00:00Z");
      const prisma = createMockPrisma();
      prisma.gameInstance.findUnique = mock(async () => ({
        id: 1,
        levelId: 1,
        createdAt,
        level: {
          id: 1,
          duration: 1, // 1 day
          speed: 86400, // 1 day = 1 real second
          levelEvents: [
            { id: 10, position: 1, triggerPercent: 50 },
            { id: 20, position: 2, triggerPercent: 100 },
          ],
        },
      }));
      const created = [
        { id: 100, scheduledAt: new Date(createdAt.getTime() + 500) },
        { id: 200, scheduledAt: new Date(createdAt.getTime() + 1000) },
      ];
      prisma.gameInstanceEvent.findMany = mock(async () => created);

      const service = new GameInstanceEventService(prisma as unknown as PrismaClient);
      await service.scheduleEventsForGameInstance(1);

      expect(prisma.gameInstanceEvent.createMany).toHaveBeenCalledTimes(1);
      const createArg = (prisma.gameInstanceEvent.createMany.mock.calls[0]?.[0] ?? {}) as { data: unknown[] };
      expect(createArg.data).toHaveLength(2);
      expect(scheduleGameEvent).toHaveBeenCalledWith(100, created[0].scheduledAt);
    });

    test("nettoie les events existants avant de re-créer", async () => {
      const prisma = createMockPrisma();
      prisma.gameInstance.findUnique = mock(async () => ({
        id: 1,
        levelId: 1,
        createdAt: new Date(),
        level: {
          id: 1,
          duration: 30,
          speed: 1,
          levelEvents: [{ id: 10, position: 1, triggerPercent: 50 }],
        },
      }));
      prisma.gameInstanceEvent.count = mock(async () => 3);
      prisma.gameInstanceEvent.findMany = mock(async () => [{ id: 1 }, { id: 2 }, { id: 3 }]);

      const service = new GameInstanceEventService(prisma as unknown as PrismaClient);
      await service.scheduleEventsForGameInstance(1);

      expect(cancelGameEvent).toHaveBeenCalledTimes(3);
      expect(prisma.gameInstanceEvent.deleteMany).toHaveBeenCalledTimes(1);
    });
  });

  describe("shiftScheduledEvents", () => {
    test("ne fait rien si pauseDuration <= 0", async () => {
      const prisma = createMockPrisma();
      const service = new GameInstanceEventService(prisma as unknown as PrismaClient);
      await service.shiftScheduledEvents(1, 0);
      expect(prisma.gameInstanceEvent.findMany).not.toHaveBeenCalled();
    });

    test("ne fait rien si aucun event pending", async () => {
      const prisma = createMockPrisma();
      prisma.gameInstanceEvent.findMany = mock(async () => []);
      const service = new GameInstanceEventService(prisma as unknown as PrismaClient);
      await service.shiftScheduledEvents(1, 60);
      expect(prisma.gameInstanceEvent.update).not.toHaveBeenCalled();
      expect(scheduleGameEvent).not.toHaveBeenCalled();
    });

    test("décale chaque event de pauseDuration et reschedule le premier", async () => {
      const baseTime = new Date("2024-01-01T00:00:00Z");
      const prisma = createMockPrisma();
      prisma.gameInstanceEvent.findMany = mock(async () => [
        { id: 1, scheduledAt: baseTime },
        { id: 2, scheduledAt: new Date(baseTime.getTime() + 60_000) },
      ]);

      const service = new GameInstanceEventService(prisma as unknown as PrismaClient);
      await service.shiftScheduledEvents(1, 30);

      expect(prisma.gameInstanceEvent.update).toHaveBeenCalledTimes(2);
      expect(cancelGameEvent).toHaveBeenCalledWith(1);
      const newFirstTime = new Date(baseTime.getTime() + 30_000);
      expect(scheduleGameEvent).toHaveBeenCalledWith(1, newFirstTime);
    });
  });

  describe("markEventAsTriggered", () => {
    test("update triggeredAt à la date courante", async () => {
      const prisma = createMockPrisma();
      const service = new GameInstanceEventService(prisma as unknown as PrismaClient);
      await service.markEventAsTriggered(42);
      const updateArgs = (prisma.gameInstanceEvent.update.mock.calls[0]?.[0] ?? {}) as { where: unknown; data: Record<string, unknown> };
      expect(updateArgs.where).toEqual({ id: 42 });
      expect(updateArgs.data.triggeredAt).toBeInstanceOf(Date);
    });
  });

  describe("findDueEvents", () => {
    test("delegate à prisma.gameInstanceEvent.findMany avec les bons filtres", async () => {
      const prisma = createMockPrisma();
      prisma.gameInstanceEvent.findMany = mock(async () => [
        {
          id: 1,
          gameInstanceId: 10,
          gameInstance: { userId: "u1", user: { id: "u1", expoPushToken: "tok" } },
        },
      ]);
      const service = new GameInstanceEventService(prisma as unknown as PrismaClient);
      const events = await service.findDueEvents();
      expect(events).toHaveLength(1);
      const arg = (prisma.gameInstanceEvent.findMany.mock.calls[0]?.[0] ?? {}) as { where: Record<string, unknown> };
      expect(arg.where.triggeredAt).toBeNull();
      expect(arg.where.processingStartedAt).toBeNull();
    });
  });

  describe("findByGameInstance", () => {
    test("retourne les events triés par scheduledAt asc", async () => {
      const prisma = createMockPrisma();
      const expected = [{ id: 1 }, { id: 2 }];
      prisma.gameInstanceEvent.findMany = mock(async (_args?: unknown): Promise<unknown[]> => expected);
      const service = new GameInstanceEventService(prisma as unknown as PrismaClient);
      const result = await service.findByGameInstance(10);
      expect(result as unknown).toBe(expected);
      const arg = (prisma.gameInstanceEvent.findMany.mock.calls[0]?.[0] ?? {}) as { where: unknown; orderBy: unknown };
      expect(arg.where).toEqual({ gameInstanceId: 10 });
      expect(arg.orderBy).toEqual({ scheduledAt: "asc" });
    });
  });
});
