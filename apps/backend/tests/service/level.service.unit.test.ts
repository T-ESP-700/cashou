// tests/service/level.service.unit.test.ts
// Tests unitaires du service de niveaux sans `any` (ESLint friendly)
import { describe, it, expect } from "bun:test";
import type { Prisma, Level, PrismaClient } from "@cashou/db-app";
import { LevelService } from "../../src/trpc/services/level.service";

type Call =
    | { method: "findMany"; args: Prisma.LevelFindManyArgs }
    | { method: "findUnique"; args: Prisma.LevelFindUniqueArgs }
    | { method: "create"; args: Prisma.LevelCreateArgs }
    | { method: "update"; args: Prisma.LevelUpdateArgs }
    | { method: "delete"; args: Prisma.LevelDeleteArgs };

function makePrismaMock() {
  const calls: Call[] = [];

  const prisma = {
    level: {
      findMany: async (args: Prisma.LevelFindManyArgs): Promise<Level[]> => {
        calls.push({ method: "findMany", args });
        return [];
      },
      findUnique: async (args: Prisma.LevelFindUniqueArgs): Promise<Level | null> => {
        calls.push({ method: "findUnique", args });
        return null;
      },
      create: async (args: Prisma.LevelCreateArgs): Promise<Level> => {
        calls.push({ method: "create", args });
        const now = new Date();
        const data = (args.data ?? {}) as Partial<Level>;
        return {
          id: 123,
          title: (data as Level).title ?? "Niveau",
          number: (data as Level).number ?? null,
          duration: (data as Level).duration ?? null,
          speed: (data as Level).speed ?? null,
          startBalance: (data as Level).startBalance ?? null,
          pointsRequired: (data as Level).pointsRequired ?? null,
          historyStartDay: (data as Level).historyStartDay ?? null,
          description: (data as Level).description ?? null,
          tip: (data as Level).tip ?? null,
          createdAt: now,
          updatedAt: now,
        };
      },
      update: async (args: Prisma.LevelUpdateArgs): Promise<Level> => {
        calls.push({ method: "update", args });
        const now = new Date();
        const data = (args.data ?? {}) as Partial<Level>;
        const id = Number((args.where as { id: number }).id);
        return {
          id,
          title: (data as Level).title ?? "Niveau",
          number: (data as Level).number ?? null,
          duration: (data as Level).duration ?? null,
          speed: (data as Level).speed ?? null,
          startBalance: (data as Level).startBalance ?? null,
          pointsRequired: (data as Level).pointsRequired ?? null,
          historyStartDay: (data as Level).historyStartDay ?? null,
          description: (data as Level).description ?? null,
          tip: (data as Level).tip ?? null,
          createdAt: now,
          updatedAt: now,
        };
      },
      delete: async (args: Prisma.LevelDeleteArgs): Promise<Level> => {
        calls.push({ method: "delete", args });
        const now = new Date();
        const id = Number((args.where as { id: number }).id);
        return {
          id,
          title: "Deleted",
          number: null,
          duration: null,
          speed: null,
          startBalance: null,
          pointsRequired: null,
          historyStartDay: null,
          description: null,
          tip: null,
          createdAt: now,
          updatedAt: now,
        };
      },
    },
  };

  void prisma.level.findMany;
  void prisma.level.findUnique;
  void prisma.level.create;
  void prisma.level.update;
  void prisma.level.delete;

  return { prisma, calls };
}

describe("LevelService — Tests unitaires", () => {
  it("findAll utilise include et orderBy corrects", async () => {
    const { prisma, calls } = makePrismaMock();
    const service = new LevelService(prisma as unknown as PrismaClient);
    await service.findAll();
    const entry = calls.find((c) => c.method === "findMany");
    expect(entry).toBeDefined();
    expect(entry?.args).toEqual({
      include: {
        levelGoals: { include: { goal: true } },
        levelEvents: { include: { event: true } },
      },
      orderBy: { number: "asc" },
    });
  });

  it("findOne utilise where.id et include cohérent", async () => {
    const { prisma, calls } = makePrismaMock();
    const service = new LevelService(prisma as unknown as PrismaClient);
    await service.findOne(42);
    const entry = calls.find((c) => c.method === "findUnique");
    expect(entry).toBeDefined();
    if (entry && entry.method === "findUnique") {
      expect(entry.args.where).toEqual({ id: 42 });
      expect(entry.args.include).toEqual({
        levelGoals: { include: { goal: true } },
        levelEvents: { include: { event: true } },
      });
    }
  });

  it("create transmet les données telles quelles à Prisma", async () => {
    const { prisma, calls } = makePrismaMock();
    const service = new LevelService(prisma as unknown as PrismaClient);
    const data: Partial<Level> = {
      title: "Niveau 1",
      number: 1,
      duration: 30,
      speed: 1,
      startBalance: 1000,
      pointsRequired: 50,
      description: "Intro",
    };
    const created = await service.create(data as Level);
    expect(created).toMatchObject({ id: 123, ...data });
    const createCall = calls.find((c) => c.method === "create");
    expect(createCall).toBeDefined();
    expect(createCall?.args).toEqual({ data });
  });

  it("update transmet where.id + data", async () => {
    const { prisma, calls } = makePrismaMock();
    const service = new LevelService(prisma as unknown as PrismaClient);
    const updated = await service.update(7, { title: "Maj" } as Partial<Level> as Level);
    expect(updated).toMatchObject({ id: 7, title: "Maj" });
    const updateCall = calls.find((c) => c.method === "update");
    expect(updateCall?.args).toEqual({ where: { id: 7 }, data: { title: "Maj" } });
  });

  it("delete transmet where.id", async () => {
    const { prisma, calls } = makePrismaMock();
    const service = new LevelService(prisma as unknown as PrismaClient);
    const deleted = await service.delete(9);
    expect(deleted.id).toBe(9);
    const deleteCall = calls.find((c) => c.method === "delete");
    expect(deleteCall?.args).toEqual({ where: { id: 9 } });
  });
});

// ---------------------------------------------------------------------------
// Tests intensifs : findGoals, findEvents, getSummary, duplicate,
// getUserLevels, getAvailability
// ---------------------------------------------------------------------------
import { mock, beforeEach } from "bun:test";

function buildFullPrisma() {
  return {
    level: {
      findUnique: mock(async (_a?: unknown): Promise<unknown> => null),
      findMany: mock(async (_a?: unknown): Promise<unknown[]> => []),
      create: mock(async (a: { data: Record<string, unknown> }) => ({ id: 99, ...a.data })),
    },
    goal: {
      findMany: mock(async (_a?: unknown): Promise<unknown[]> => []),
    },
    event: {
      findMany: mock(async (_a?: unknown): Promise<unknown[]> => []),
    },
    levelGoal: {
      createMany: mock(async () => ({ count: 0 })),
    },
    levelEvent: {
      createMany: mock(async () => ({ count: 0 })),
    },
    user: {
      findUnique: mock(async (_a?: unknown): Promise<unknown> => null),
    },
    userLevelCompletion: {
      findMany: mock(async (_a?: unknown): Promise<unknown[]> => []),
    },
  };
}

describe("LevelService — Méthodes spécialisées", () => {
  let prisma: ReturnType<typeof buildFullPrisma>;
  let service: LevelService;

  beforeEach(() => {
    prisma = buildFullPrisma();
    service = new LevelService(prisma as unknown as PrismaClient);
  });

  describe("findGoals", () => {
    it("filtre goals par levelGoals.some.levelId", async () => {
      prisma.goal.findMany = mock(async () => [{ id: 1, title: "Goal" }]);
      const res = await service.findGoals(5);
      expect(res).toHaveLength(1);
      const args = (prisma.goal.findMany.mock.calls[0]?.[0] ?? {}) as { where: { levelGoals: { some: { levelId: number } } } };
      expect(args.where.levelGoals.some.levelId).toBe(5);
    });
  });

  describe("findEvents", () => {
    it("filtre events par levelEvents.some.levelId", async () => {
      prisma.event.findMany = mock(async () => [{ id: 1, title: "Event" }]);
      const res = await service.findEvents(7);
      expect(res).toHaveLength(1);
    });
  });

  describe("getSummary", () => {
    it("retourne level=null si introuvable", async () => {
      prisma.level.findUnique = mock(async () => null);
      const res = await service.getSummary(999);
      expect(res.level).toBeNull();
    });

    it("retourne level + goals + events + levelGoals", async () => {
      prisma.level.findUnique = mock(async () => ({
        id: 1,
        title: "L1",
        number: 1,
        description: "d",
        tip: null,
        startBalance: 1000,
        pointsRequired: 0,
        duration: 30,
        speed: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        levelGoals: [{ id: 10, goalId: 100, goal: { id: 100, title: "G" }, isMandatory: true }],
      }));
      prisma.event.findMany = mock(async () => [{ id: 1, title: "E" }]);
      const res = await service.getSummary(1);
      expect(res.level?.id).toBe(1);
      expect(res.goals).toHaveLength(1);
      expect(res.events).toHaveLength(1);
    });
  });

  describe("duplicate", () => {
    it("retourne null si le niveau source n'existe pas", async () => {
      prisma.level.findUnique = mock(async () => null);
      const res = await service.duplicate(999);
      expect(res).toBeNull();
    });

    it("clone le niveau + recrée levelGoals et levelEvents", async () => {
      const src = {
        id: 1,
        title: "Source",
        number: 1,
        duration: 30,
        speed: 1,
        startBalance: 1000,
        pointsRequired: 50,
        historyStartDay: 0,
        description: "d",
        tip: null,
        levelGoals: [{ goalId: 10, isMandatory: false }],
        levelEvents: [{ eventId: 20 }],
      };
      // First call: get src; later calls: getSummary on duplicate
      let call = 0;
      prisma.level.findUnique = mock(async () => {
        call++;
        if (call === 1) return src;
        return { ...src, id: 99, levelGoals: [{ id: 1, goalId: 10, goal: { id: 10 }, isMandatory: false }] };
      });
      const res = await service.duplicate(1);
      expect(prisma.level.create).toHaveBeenCalled();
      expect(prisma.levelGoal.createMany).toHaveBeenCalled();
      expect(prisma.levelEvent.createMany).toHaveBeenCalled();
      expect(res).toBeDefined();
    });

    it("ne recrée rien si pas de levelGoals/levelEvents", async () => {
      prisma.level.findUnique = mock(async () => ({
        id: 1,
        title: "Source",
        number: 1,
        duration: 30,
        speed: 1,
        startBalance: 1000,
        pointsRequired: 50,
        historyStartDay: 0,
        description: "d",
        tip: null,
        levelGoals: [],
        levelEvents: [],
      }));
      await service.duplicate(1);
      expect(prisma.levelGoal.createMany).not.toHaveBeenCalled();
      expect(prisma.levelEvent.createMany).not.toHaveBeenCalled();
    });
  });

  describe("getUserLevels", () => {
    it("retourne [] si user introuvable", async () => {
      prisma.user.findUnique = mock(async () => null);
      const res = await service.getUserLevels("u1");
      expect(res).toEqual([]);
    });

    it("merge levels + completions, calcule unlocked", async () => {
      prisma.user.findUnique = mock(async () => ({ id: "u1", levelId: 2, points: 100 }));
      prisma.level.findMany = mock(async () => [
        { id: 1, number: 1, pointsRequired: 0 },
        { id: 2, number: 2, pointsRequired: 50 },
        { id: 3, number: 3, pointsRequired: 200 },
      ]);
      prisma.userLevelCompletion.findMany = mock(async () => [
        { levelId: 1, stars: 3, mandatoryGoalsMet: true, bonusGoalsMet: true, quizPassed: true },
      ]);
      const res = await service.getUserLevels("u1");
      expect(res).toHaveLength(3);
      expect(res[0].stars).toBe(3);
      expect(res[0].unlocked).toBe(true);
      expect(res[2].unlocked).toBe(false); // pointsRequired (200) > user.points (100)
    });
  });

  describe("getAvailability", () => {
    it("retourne NOT_FOUND si user ou level introuvable", async () => {
      prisma.user.findUnique = mock(async () => null);
      prisma.level.findUnique = mock(async () => null);
      const res = await service.getAvailability("u1", 1);
      expect(res).toMatchObject({ canUnlock: false, reason: "NOT_FOUND" });
    });

    it("canUnlock=true si user.points >= level.pointsRequired", async () => {
      prisma.user.findUnique = mock(async () => ({ id: "u1", points: 100 }));
      prisma.level.findUnique = mock(async () => ({ id: 1, pointsRequired: 50 }));
      const res = await service.getAvailability("u1", 1);
      expect(res).toMatchObject({ canUnlock: true, required: 50, userPoints: 100 });
    });

    it("canUnlock=false si points insuffisants", async () => {
      prisma.user.findUnique = mock(async () => ({ id: "u1", points: 10 }));
      prisma.level.findUnique = mock(async () => ({ id: 1, pointsRequired: 50 }));
      const res = await service.getAvailability("u1", 1);
      expect(res).toMatchObject({ canUnlock: false });
    });
  });
});