// tests/service/goal.service.unit.test.ts
// Tests unitaires du service d'objectifs sans `any` (ESLint friendly)
import { describe, it, expect } from "bun:test";
import type { Prisma, Goal, PrismaClient } from "@prisma/client";
import { GoalService } from "../../src/services/goal.service";

type Call =
    | { method: "findMany"; args: Prisma.GoalFindManyArgs }
    | { method: "findUnique"; args: Prisma.GoalFindUniqueArgs }
    | { method: "create"; args: Prisma.GoalCreateArgs }
    | { method: "update"; args: Prisma.GoalUpdateArgs }
    | { method: "delete"; args: Prisma.GoalDeleteArgs };

function makePrismaMock() {
    const calls: Call[] = [];

    const prisma = {
        goal: {
            findMany: async (args: Prisma.GoalFindManyArgs): Promise<Goal[]> => {
                calls.push({ method: "findMany", args });
                return [];
            },
            findUnique: async (args: Prisma.GoalFindUniqueArgs): Promise<Goal | null> => {
                calls.push({ method: "findUnique", args });
                return null;
            },
            create: async (args: Prisma.GoalCreateArgs): Promise<Goal> => {
                calls.push({ method: "create", args });
                const now = new Date();
                const data = (args.data ?? {}) as Partial<Goal>;
                return {
                    id: 123,
                    title: (data as Goal).title ?? "Objectif",
                    description: (data as Goal).description ?? null,
                    createdAt: now,
                    updatedAt: now,
                };
            },
            update: async (args: Prisma.GoalUpdateArgs): Promise<Goal> => {
                calls.push({ method: "update", args });
                const now = new Date();
                const data = (args.data ?? {}) as Partial<Goal>;
                const id = Number((args.where as { id: number }).id);
                return {
                    id,
                    title: (data as Goal).title ?? "Objectif",
                    description: (data as Goal).description ?? null,
                    createdAt: now,
                    updatedAt: now,
                };
            },
            delete: async (args: Prisma.GoalDeleteArgs): Promise<Goal> => {
                calls.push({ method: "delete", args });
                const now = new Date();
                const id = Number((args.where as { id: number }).id);
                return {
                    id,
                    title: "Deleted",
                    description: null,
                    createdAt: now,
                    updatedAt: now,
                };
            },
        },
    };

    void prisma.goal.findMany;
    void prisma.goal.findUnique;
    void prisma.goal.create;
    void prisma.goal.update;
    void prisma.goal.delete;

    return { prisma, calls };
}

describe("GoalService — Tests unitaires", () => {
    it("findAll utilise include et orderBy corrects", async () => {
        const { prisma, calls } = makePrismaMock();
        const service = new GoalService(prisma as unknown as PrismaClient);
        await service.findAll();
        const entry = calls.find((c) => c.method === "findMany");
        expect(entry).toBeDefined();
        expect(entry?.args).toEqual({
            include: {
                levelGoals: { include: { level: true } },
            },
            orderBy: { title: "asc" },
        });
    });

    it("findOne utilise where.id et include cohérent", async () => {
        const { prisma, calls } = makePrismaMock();
        const service = new GoalService(prisma as unknown as PrismaClient);
        await service.findOne(42);
        const entry = calls.find((c) => c.method === "findUnique");
        expect(entry).toBeDefined();
        if (entry && entry.method === "findUnique") {
            expect(entry.args.where).toEqual({ id: 42 });
            expect(entry.args.include).toEqual({
                levelGoals: { include: { level: true } },
            });
        }
    });

    it("create transmet les données telles quelles à Prisma", async () => {
        const { prisma, calls } = makePrismaMock();
        const service = new GoalService(prisma as unknown as PrismaClient);
        const data: Partial<Goal> = {
            title: "Atteindre 1000 points",
            description: "Objectif de points pour débloquer le niveau suivant",
        };
        const created = await service.create(data as Goal);
        expect(created).toMatchObject({ id: 123, ...data });
        const createCall = calls.find((c) => c.method === "create");
        expect(createCall).toBeDefined();
        expect(createCall?.args).toEqual({ data });
    });

    it("update transmet where.id + data", async () => {
        const { prisma, calls } = makePrismaMock();
        const service = new GoalService(prisma as unknown as PrismaClient);
        const updated = await service.update(7, { title: "Objectif modifié" } as Partial<Goal> as Goal);
        expect(updated).toMatchObject({ id: 7, title: "Objectif modifié" });
        const updateCall = calls.find((c) => c.method === "update");
        expect(updateCall?.args).toEqual({ where: { id: 7 }, data: { title: "Objectif modifié" } });
    });

    it("delete transmet where.id", async () => {
        const { prisma, calls } = makePrismaMock();
        const service = new GoalService(prisma as unknown as PrismaClient);
        const deleted = await service.delete(9);
        expect(deleted.id).toBe(9);
        const deleteCall = calls.find((c) => c.method === "delete");
        expect(deleteCall?.args).toEqual({ where: { id: 9 } });
    });
});
