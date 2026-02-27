// tests/router/event.router.test.ts
import { describe, it, expect } from "bun:test";
import type { Event } from "@cashou/db-app";
import { eventRouter } from "../../src/trpc/routers/event.router";
import { EventService } from "../../src/trpc/services/event.service";
import { createRouterTestSetup } from "../helpers/router-test-factory";

function makeEvent(id: number, over: Partial<Event> = {}): Event {
    const now = new Date();
    return {
        id,
        title: over.title ?? `Event ${id}`,
        description: over.description ?? null,
        hasImpact: over.hasImpact ?? null,
        createdAt: over.createdAt ?? now,
        updatedAt: over.updatedAt ?? now,
    };
}

// Configuration automatique des mocks avec le helper
const { calls } = createRouterTestSetup(EventService, makeEvent);

type Ctx = Parameters<typeof eventRouter.createCaller>[0];

describe("event.router — createCaller (sans HTTP)", () => {
    it("event.getAll → appelle service.findAll et retourne la liste", async () => {
        const caller = eventRouter.createCaller({} as Ctx);
        const res = await caller.getAll();
        expect(res).toMatchObject([{ id: 1, title: "Event 1" }]);
        const hit = calls.find((c) => c.method === "findAll");
        expect(hit).toBeDefined();
    });

    it("event.getById → valide l'input et appelle service.findOne(id)", async () => {
        const caller = eventRouter.createCaller({} as Ctx);
        const res = await caller.getById({ id: 7 });
        expect(res).toMatchObject({ id: 7, title: "Event 7" });
        const hit = calls.find((c) => c.method === "findOne");
        expect(hit?.args).toEqual({ id: 7 });
    });

    it("event.create → valide l'input (zod) puis appelle service.create(data)", async () => {
        const caller = eventRouter.createCaller({} as Ctx);
        const payload: Partial<Event> = { title: "Nouvel événement", description: "Description test", hasImpact: true };
        const res = await caller.create(payload as unknown as never);
        expect(res).toMatchObject({ id: 123, ...payload });
        const hit = calls.find((c) => c.method === "create");
        expect(hit?.args).toEqual({ data: payload });
    });

    it("event.update → appelle service.update(id, data)", async () => {
        const caller = eventRouter.createCaller({} as Ctx);
        const res = await caller.update({ id: 99, data: { title: "Événement modifié" } as Partial<Event> } as unknown as never);
        expect(res).toMatchObject({ id: 99, title: "Événement modifié" });
        const hit = calls.find((c) => c.method === "update");
        expect(hit?.args).toEqual({ id: 99, data: { title: "Événement modifié" } });
    });

    it("event.delete → appelle service.delete(id)", async () => {
        const caller = eventRouter.createCaller({} as Ctx);
        const res = await caller.delete({ id: 5 });
        expect(res.id).toBe(5);
        const hit = calls.find((c) => c.method === "delete");
        expect(hit?.args).toEqual({ id: 5 });
    });
});

describe("event.router — validations Zod (erreurs attendues)", () => {
    it("getById avec id <= 0 → rejette", async () => {
        const caller = eventRouter.createCaller({} as Ctx);
        expect(caller.getById({id: 0} as unknown as never)).rejects.toBeDefined();
        expect(caller.getById({id: -1} as unknown as never)).rejects.toBeDefined();
    });

    it("update avec id invalide → rejette", async () => {
        const caller = eventRouter.createCaller({} as Ctx);
        expect(caller.update({id: 0, data: {}} as unknown as never)).rejects.toBeDefined();
    });

    it("delete avec id invalide → rejette", async () => {
        const caller = eventRouter.createCaller({} as Ctx);
        expect(caller.delete({id: 0} as unknown as never)).rejects.toBeDefined();
    });
});
