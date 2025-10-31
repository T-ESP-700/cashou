// tests/service/level-event.service.unit.test.ts
import { describe, it, expect } from "bun:test";
import type { Prisma, LevelEvent, PrismaClient } from "@prisma/client";
import { LevelEventService } from "../../src/services/level-event.service";

type Call =
    | { method: "findMany"; args: Prisma.LevelEventFindManyArgs }
    | { method: "findUnique"; args: Prisma.LevelEventFindUniqueArgs }
    | { method: "create"; args: Prisma.LevelEventCreateArgs }
    | { method: "update"; args: Prisma.LevelEventUpdateArgs }
    | { method: "delete"; args: Prisma.LevelEventDeleteArgs };

function makePrismaMock() {
    const calls: Call[] = [];

    const prisma = {
        levelEvent: {
            findMany: async (args: Prisma.LevelEventFindManyArgs): Promise<LevelEvent[]> => {
                calls.push({ method: "findMany", args });
                return [];
            },
            findUnique: async (args: Prisma.LevelEventFindUniqueArgs): Promise<LevelEvent | null> => {
                calls.push({ method: "findUnique", args });
                return null;
            },
            create: async (args: Prisma.LevelEventCreateArgs): Promise<LevelEvent> => {
                calls.push({ method: "create", args });
                const now = new Date();
                const data = (args.data ?? {}) as Partial<LevelEvent>;
                return {
                    id: 123,
                    levelId: (data as LevelEvent).levelId ?? 1,
                    eventId: (data as LevelEvent).eventId ?? 1,
                    createdAt: now,
                    updatedAt: now,
                };
            },
            update: async (args: Prisma.LevelEventUpdateArgs): Promise<LevelEvent> => {
                calls.push({ method: "update", args });
                const now = new Date();
                const data = (args.data ?? {}) as Partial<LevelEvent>;
                const id = Number((args.where as { id: number }).id);
                return {
                    id,
                    levelId: (data as LevelEvent).levelId ?? 1,
                    eventId: (data as LevelEvent).eventId ?? 1,
                    createdAt: now,
                    updatedAt: now,
                };
            },
            delete: async (args: Prisma.LevelEventDeleteArgs): Promise<LevelEvent> => {
                calls.push({ method: "delete", args });
                const now = new Date();
                const id = Number((args.where as { id: number }).id);
                return {
                    id,
                    levelId: 1,
                    eventId: 1,
                    createdAt: now,
                    updatedAt: now,
                };
            },
        },
    };

    return { prisma, calls };
}

describe("LevelEventService — Tests unitaires", () => {
    it("findAll utilise include et orderBy corrects", async () => {
        const { prisma, calls } = makePrismaMock();
        const service = new LevelEventService(prisma as unknown as PrismaClient);
        await service.findAll();
        const entry = calls.find((c) => c.method === "findMany");
        expect(entry).toBeDefined();
        expect(entry?.args).toEqual({
            include: {
                level: true,
                event: true,
            },
            orderBy: { id: "asc" },
        });
    });

    it("findOne utilise where.id et include cohérent", async () => {
        const { prisma, calls } = makePrismaMock();
        const service = new LevelEventService(prisma as unknown as PrismaClient);
        await service.findOne(42);
        const entry = calls.find((c) => c.method === "findUnique");
        expect(entry).toBeDefined();
        if (entry && entry.method === "findUnique") {
            expect(entry.args.where).toEqual({ id: 42 });
            expect(entry.args.include).toEqual({
                level: true,
                event: true,
            });
        }
    });

    it("findByLevelId utilise where.levelId correct", async () => {
        const { prisma, calls } = makePrismaMock();
        const service = new LevelEventService(prisma as unknown as PrismaClient);
        await service.findByLevelId(7);
        const entry = calls.find((c) => c.method === "findMany");
        expect(entry).toBeDefined();
        if (entry && entry.method === "findMany") {
            expect(entry.args.where).toEqual({ levelId: 7 });
            expect(entry.args.orderBy).toEqual({ eventId: "asc" });
        }
    });

    it("findByEventId utilise where.eventId correct", async () => {
        const { prisma, calls } = makePrismaMock();
        const service = new LevelEventService(prisma as unknown as PrismaClient);
        await service.findByEventId(9);
        const entry = calls.find((c) => c.method === "findMany");
        expect(entry).toBeDefined();
        if (entry && entry.method === "findMany") {
            expect(entry.args.where).toEqual({ eventId: 9 });
            expect(entry.args.orderBy).toEqual({ levelId: "asc" });
        }
    });

    it("create transmet les données telles quelles à Prisma", async () => {
        const { prisma, calls } = makePrismaMock();
        const service = new LevelEventService(prisma as unknown as PrismaClient);
        const data = { levelId: 2, eventId: 3 };
        const created = await service.create(data);
        expect(created).toMatchObject({ id: 123, ...data });
        const createCall = calls.find((c) => c.method === "create");
        expect(createCall?.args).toEqual({ data });
    });

    it("update transmet where.id + data", async () => {
        const { prisma, calls } = makePrismaMock();
        const service = new LevelEventService(prisma as unknown as PrismaClient);
        const updated = await service.update(7, { levelId: 4, eventId: 5 });
        expect(updated).toMatchObject({ id: 7, levelId: 4, eventId: 5 });
        const updateCall = calls.find((c) => c.method === "update");
        expect(updateCall?.args).toEqual({ where: { id: 7 }, data: { levelId: 4, eventId: 5 } });
    });

    it("delete transmet where.id", async () => {
        const { prisma, calls } = makePrismaMock();
        const service = new LevelEventService(prisma as unknown as PrismaClient);
        const deleted = await service.delete(9);
        expect(deleted.id).toBe(9);
        const deleteCall = calls.find((c) => c.method === "delete");
        expect(deleteCall?.args).toEqual({ where: { id: 9 } });
    });
});
