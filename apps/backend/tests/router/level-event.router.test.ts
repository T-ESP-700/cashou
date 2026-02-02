// tests/router/level-event.router.test.ts
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import type { LevelEvent } from "@cashou/db-app";
import { levelEventRouter } from "../../src/trpc/routers/level-event.router";
import { LevelEventService } from "../../src/trpc/services/level-event.service";

type Call =
    | { method: "findAll"; args?: undefined }
    | { method: "findOne"; args: { id: number } }
    | { method: "findByLevelId"; args: { levelId: number } }
    | { method: "findByEventId"; args: { eventId: number } }
    | { method: "create"; args: { data: Partial<LevelEvent> } }
    | { method: "update"; args: { id: number; data: Partial<LevelEvent> } }
    | { method: "delete"; args: { id: number } };

const calls: Call[] = [];

function makeLevelEvent(id: number, over: Partial<LevelEvent> = {}): LevelEvent {
    const now = new Date();
    return {
        id,
        levelId: over.levelId ?? 1,
        eventId: over.eventId ?? 1,
        triggerPercent: over.triggerPercent ?? 0,
        position: over.position ?? 1,
        createdAt: over.createdAt ?? now,
        updatedAt: over.updatedAt ?? now,
    };
}

const original = {
    findAll: LevelEventService.prototype.findAll,
    findOne: LevelEventService.prototype.findOne,
    findByLevelId: LevelEventService.prototype.findByLevelId,
    findByEventId: LevelEventService.prototype.findByEventId,
    create: LevelEventService.prototype.create,
    update: LevelEventService.prototype.update,
    delete: LevelEventService.prototype.delete,
};

beforeEach(() => {
    calls.length = 0;

    LevelEventService.prototype.findAll = (async function (this: unknown): Promise<LevelEvent[]> {
        calls.push({ method: "findAll" });
        return [makeLevelEvent(1, { levelId: 1, eventId: 1 })];
    });

    LevelEventService.prototype.findOne = (async function (this: unknown, id: number): Promise<LevelEvent | null> {
        calls.push({ method: "findOne", args: { id } });
        if (id === 404) return null;
        return makeLevelEvent(id);
    });

    LevelEventService.prototype.findByLevelId = (async function (this: unknown, levelId: number): Promise<LevelEvent[]> {
        calls.push({ method: "findByLevelId", args: { levelId } });
        return [makeLevelEvent(1, { levelId })];
    });

    LevelEventService.prototype.findByEventId = (async function (this: unknown, eventId: number): Promise<LevelEvent[]> {
        calls.push({ method: "findByEventId", args: { eventId } });
        return [makeLevelEvent(1, { eventId })];
    });

    LevelEventService.prototype.create = (async function (this: unknown, data: Partial<LevelEvent>): Promise<LevelEvent> {
        calls.push({ method: "create", args: { data } });
        return makeLevelEvent(123, data);
    });

    LevelEventService.prototype.update = (async function (this: unknown, id: number, data: Partial<LevelEvent>): Promise<LevelEvent> {
        calls.push({ method: "update", args: { id, data } });
        return makeLevelEvent(id, data);
    });

    LevelEventService.prototype.delete = (async function (this: unknown, id: number): Promise<Pick<LevelEvent, "id">> {
        calls.push({ method: "delete", args: { id } });
        return { id };
    }) as unknown as typeof LevelEventService.prototype.delete;
});

afterEach(() => {
    LevelEventService.prototype.findAll = original.findAll;
    LevelEventService.prototype.findOne = original.findOne;
    LevelEventService.prototype.findByLevelId = original.findByLevelId;
    LevelEventService.prototype.findByEventId = original.findByEventId;
    LevelEventService.prototype.create = original.create;
    LevelEventService.prototype.update = original.update;
    LevelEventService.prototype.delete = original.delete;
});

type Ctx = Parameters<typeof levelEventRouter.createCaller>[0];

describe("levelEvent.router — createCaller (sans HTTP)", () => {
    it("levelEvent.getAll → appelle service.findAll et retourne la liste", async () => {
        const caller = levelEventRouter.createCaller({} as Ctx);
        const res = await caller.getAll();
        expect(res).toMatchObject([{ id: 1, levelId: 1, eventId: 1 }]);
        const hit = calls.find((c) => c.method === "findAll");
        expect(hit).toBeDefined();
    });

    it("levelEvent.getById → valide l'input et appelle service.findOne(id)", async () => {
        const caller = levelEventRouter.createCaller({} as Ctx);
        const res = await caller.getById({ id: 7 });
        expect(res).toMatchObject({ id: 7 });
        const hit = calls.find((c) => c.method === "findOne");
        expect(hit?.args).toEqual({ id: 7 });
    });

    it("levelEvent.getByLevelId → appelle service.findByLevelId", async () => {
        const caller = levelEventRouter.createCaller({} as Ctx);
        const res = await caller.getByLevelId({ levelId: 3 });
        expect(res).toMatchObject([{ id: 1, levelId: 3 }]);
        const hit = calls.find((c) => c.method === "findByLevelId");
        expect(hit?.args).toEqual({ levelId: 3 });
    });

    it("levelEvent.getByEventId → appelle service.findByEventId", async () => {
        const caller = levelEventRouter.createCaller({} as Ctx);
        const res = await caller.getByEventId({ eventId: 5 });
        expect(res).toMatchObject([{ id: 1, eventId: 5 }]);
        const hit = calls.find((c) => c.method === "findByEventId");
        expect(hit?.args).toEqual({ eventId: 5 });
    });

    it("levelEvent.create → valide l'input (zod) puis appelle service.create(data)", async () => {
        const caller = levelEventRouter.createCaller({} as Ctx);
        const payload = { levelId: 2, eventId: 3 };
        const res = await caller.create(payload);
        expect(res).toMatchObject({ id: 123, ...payload });
        const hit = calls.find((c) => c.method === "create");
        expect(hit?.args).toEqual({ data: payload });
    });

    it("levelEvent.update → appelle service.update(id, data)", async () => {
        const caller = levelEventRouter.createCaller({} as Ctx);
        const res = await caller.update({ id: 99, data: { levelId: 4, eventId: 5 } });
        expect(res).toMatchObject({ id: 99, levelId: 4, eventId: 5 });
        const hit = calls.find((c) => c.method === "update");
        expect(hit?.args).toEqual({ id: 99, data: { levelId: 4, eventId: 5 } });
    });

    it("levelEvent.delete → appelle service.delete(id)", async () => {
        const caller = levelEventRouter.createCaller({} as Ctx);
        const res = await caller.delete({ id: 5 });
        expect(res.id).toBe(5);
        const hit = calls.find((c) => c.method === "delete");
        expect(hit?.args).toEqual({ id: 5 });
    });
});

describe("levelEvent.router — validations Zod (erreurs attendues)", () => {
    it("getById avec id <= 0 → rejette", async () => {
        const caller = levelEventRouter.createCaller({} as Ctx);
        expect(caller.getById({id: 0} as unknown as never)).rejects.toBeDefined();
        expect(caller.getById({id: -1} as unknown as never)).rejects.toBeDefined();
    });

    it("create avec levelId/eventId invalides → rejette", async () => {
        const caller = levelEventRouter.createCaller({} as Ctx);
        expect(caller.create({levelId: 0, eventId: 1} as unknown as never)).rejects.toBeDefined();
        expect(caller.create({levelId: 1, eventId: -1} as unknown as never)).rejects.toBeDefined();
    });

    it("update avec id invalide → rejette", async () => {
        const caller = levelEventRouter.createCaller({} as Ctx);
        expect(caller.update({id: 0, data: {levelId: 1, eventId: 1}} as unknown as never)).rejects.toBeDefined();
    });
});
