// tests/service/level.service.unit.test.ts
// Tests unitaires du service de niveaux sans `any` (ESLint friendly)
import { describe, it, expect } from "bun:test";
import type { Prisma, Level, PrismaClient } from "@prisma/client";
import { LevelService } from "../../src/services/level.service";

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
          description: (data as Level).description ?? null,
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
          description: (data as Level).description ?? null,
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
          description: null,
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