// tests/service/level-goal.service.unit.test.ts
import { describe, it, expect } from "bun:test";
import type { Prisma, LevelGoal, PrismaClient } from "@prisma/client";
import { LevelGoalService } from "../../src/services/level-goal.service";

type Call =
    | { method: "findMany"; args: Prisma.LevelGoalFindManyArgs }
    | { method: "findUnique"; args: Prisma.LevelGoalFindUniqueArgs }
    | { method: "create"; args: Prisma.LevelGoalCreateArgs }
    | { method: "update"; args: Prisma.LevelGoalUpdateArgs }
    | { method: "delete"; args: Prisma.LevelGoalDeleteArgs };

function makePrismaMock() {
    const calls: Call[] = [];

    const prisma = {
        levelGoal: {
            findMany: async (args: Prisma.LevelGoalFindManyArgs): Promise<LevelGoal[]> => {
                calls.push({ method: "findMany", args });
                return [];
            },
            findUnique: async (args: Prisma.LevelGoalFindUniqueArgs): Promise<LevelGoal | null> => {
                calls.push({ method: "findUnique", args });
                return null;
            },
            create: async (args: Prisma.LevelGoalCreateArgs): Promise<LevelGoal> => {
                calls.push({ method: "create", args });
                const now = new Date();
                const data = (args.data ?? {}) as Partial<LevelGoal>;
                return {
                    id: 123,
                    levelId: (data as LevelGoal).levelId ?? 1,
                    goalId: (data as LevelGoal).goalId ?? 1,
                    createdAt: now,
                    updatedAt: now,
                };
            },
            update: async (args: Prisma.LevelGoalUpdateArgs): Promise<LevelGoal> => {
                calls.push({ method: "update", args });
                const now = new Date();
                const data = (args.data ?? {}) as Partial<LevelGoal>;
                const id = Number((args.where as { id: number }).id);
                return {
                    id,
                    levelId: (data as LevelGoal).levelId ?? 1,
                    goalId: (data as LevelGoal).goalId ?? 1,
                    createdAt: now,
                    updatedAt: now,
                };
            },
            delete: async (args: Prisma.LevelGoalDeleteArgs): Promise<LevelGoal> => {
                calls.push({ method: "delete", args });
                const now = new Date();
                const id = Number((args.where as { id: number }).id);
                return {
                    id,
                    levelId: 1,
                    goalId: 1,
                    createdAt: now,
                    updatedAt: now,
                };
            },
        },
    };

    return { prisma, calls };
}

describe("LevelGoalService — Tests unitaires", () => {
    it("findAll utilise include et orderBy corrects", async () => {
        const { prisma, calls } = makePrismaMock();
        const service = new LevelGoalService(prisma as unknown as PrismaClient);
        await service.findAll();
        const entry = calls.find((c) => c.method === "findMany");
        expect(entry).toBeDefined();
        expect(entry?.args).toEqual({
            include: {
                level: true,
                goal: true,
            },
            orderBy: { id: "asc" },
        });
    });

    it("findOne utilise where.id et include cohérent", async () => {
        const { prisma, calls } = makePrismaMock();
        const service = new LevelGoalService(prisma as unknown as PrismaClient);
        await service.findOne(42);
        const entry = calls.find((c) => c.method === "findUnique");
        expect(entry).toBeDefined();
        if (entry && entry.method === "findUnique") {
            expect(entry.args.where).toEqual({ id: 42 });
            expect(entry.args.include).toEqual({
                level: true,
                goal: true,
            });
        }
    });

    it("findByLevelId utilise where.levelId correct", async () => {
        const { prisma, calls } = makePrismaMock();
        const service = new LevelGoalService(prisma as unknown as PrismaClient);
        await service.findByLevelId(7);
        const entry = calls.find((c) => c.method === "findMany");
        expect(entry).toBeDefined();
        if (entry && entry.method === "findMany") {
            expect(entry.args.where).toEqual({ levelId: 7 });
            expect(entry.args.orderBy).toEqual({ goalId: "asc" });
        }
    });

    it("findByGoalId utilise where.goalId correct", async () => {
        const { prisma, calls } = makePrismaMock();
        const service = new LevelGoalService(prisma as unknown as PrismaClient);
        await service.findByGoalId(9);
        const entry = calls.find((c) => c.method === "findMany");
        expect(entry).toBeDefined();
        if (entry && entry.method === "findMany") {
            expect(entry.args.where).toEqual({ goalId: 9 });
            expect(entry.args.orderBy).toEqual({ levelId: "asc" });
        }
    });

    it("create transmet les données telles quelles à Prisma", async () => {
        const { prisma, calls } = makePrismaMock();
        const service = new LevelGoalService(prisma as unknown as PrismaClient);
        const data = { levelId: 2, goalId: 3 };
        const created = await service.create(data);
        expect(created).toMatchObject({ id: 123, ...data });
        const createCall = calls.find((c) => c.method === "create");
        expect(createCall?.args).toEqual({ data });
    });

    it("update transmet where.id + data", async () => {
        const { prisma, calls } = makePrismaMock();
        const service = new LevelGoalService(prisma as unknown as PrismaClient);
        const updated = await service.update(7, { levelId: 4, goalId: 5 });
        expect(updated).toMatchObject({ id: 7, levelId: 4, goalId: 5 });
        const updateCall = calls.find((c) => c.method === "update");
        expect(updateCall?.args).toEqual({ where: { id: 7 }, data: { levelId: 4, goalId: 5 } });
    });

    it("delete transmet where.id", async () => {
        const { prisma, calls } = makePrismaMock();
        const service = new LevelGoalService(prisma as unknown as PrismaClient);
        const deleted = await service.delete(9);
        expect(deleted.id).toBe(9);
        const deleteCall = calls.find((c) => c.method === "delete");
        expect(deleteCall?.args).toEqual({ where: { id: 9 } });
    });
});
