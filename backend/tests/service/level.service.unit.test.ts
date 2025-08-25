
import { describe, it, expect } from "bun:test";
import {LevelService} from "../../src/services/level.service.ts";

type AnyPrisma = any;

function makePrismaMock() {
  const calls: Array<[string, any]> = [];

  const prisma = {
    level: {
      findMany: async (args: any) => {
        calls.push(["findMany", args]);
        return [];
      },
      findUnique: async (args: any) => {
        calls.push(["findUnique", args]);
        return null;
      },
      create: async (args: any) => {
        calls.push(["create", args]);
        return { id: 123, ...args.data };
      },
      update: async (args: any) => {
        calls.push(["update", args]);
        return { id: args.where.id, ...(args.data ?? {}) };
      },
      delete: async (args: any) => {
        calls.push(["delete", args]);
        return { id: args.where.id };
      },
    },
  } as AnyPrisma;

  return { prisma, calls };
}

describe("LevelService — Tests unitaires", () => {
  it("findAll utilise include et orderBy corrects", async () => {
    const { prisma, calls } = makePrismaMock();
    const service = new LevelService(prisma as any);
    await service.findAll();
    const entry = calls.find((c) => c[0] === "findMany");
    expect(entry).toBeDefined();
    const [, args] = entry!;
    expect(args).toEqual({
      include: {
        levelGoals: { include: { goal: true } },
        levelEvents: { include: { event: true } },
      },
      orderBy: { number: "asc" },
    });
  });

  it("findOne utilise where.id et include cohérent", async () => {
    const { prisma, calls } = makePrismaMock();
    const service = new LevelService(prisma as any);
    await service.findOne(42);
    const entry = calls.find((c) => c[0] === "findUnique");
    expect(entry).toBeDefined();
    const [, args] = entry!;
    expect(args.where).toEqual({ id: 42 });
    expect(args.include).toEqual({
      levelGoals: { include: { goal: true } },
      levelEvents: { include: { event: true } },
    });
  });

  it("create transmet les données telles quelles à Prisma", async () => {
    const { prisma, calls } = makePrismaMock();
    const service = new LevelService(prisma as any);
    const data = {
      title: "Niveau 1",
      number: 1,
      duration: 30,
      speed: 1,
      startBalance: 1000,
      pointsRequired: 50,
      description: "Intro",
    };
    const created = await service.create(data as any);
    expect(created).toMatchObject({ id: 123, ...data });
    const [, args] = calls.find((c) => c[0] === "create")!;
    expect(args).toEqual({ data });
  });

  it("update transmet where.id + data", async () => {
    const { prisma, calls } = makePrismaMock();
    const service = new LevelService(prisma as any);
    const updated = await service.update(7, { title: "Maj" } as any);
    expect(updated).toMatchObject({ id: 7, title: "Maj" });
    const [, args] = calls.find((c) => c[0] === "update")!;
    expect(args).toEqual({ where: { id: 7 }, data: { title: "Maj" } });
  });

  it("delete transmet where.id", async () => {
    const { prisma, calls } = makePrismaMock();
    const service = new LevelService(prisma as any);
    const deleted = await service.delete(9);
    expect(deleted).toMatchObject({ id: 9 });
    const [, args] = calls.find((c) => c[0] === "delete")!;
    expect(args).toEqual({ where: { id: 9 } });
  });
});
