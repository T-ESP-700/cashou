// tests/router/goal.router.test.ts
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import type { Goal } from "@cashou/db-app";
import { goalRouter } from "../../src/trpc/routers/goal.router";
import { GoalService } from "../../src/trpc/services/goal.service";

type Call =
    | { method: "findAll"; args?: undefined }
    | { method: "findOne"; args: { id: number } }
    | { method: "create"; args: { data: Partial<Goal> } }
    | { method: "update"; args: { id: number; data: Partial<Goal> } }
    | { method: "delete"; args: { id: number } };

const calls: Call[] = [];

function makeGoal(id: number, over: Partial<Goal> = {}): Goal {
    const now = new Date();
    return {
        id,
        title: over.title ?? `Goal ${id}`,
        description: over.description ?? null,
        createdAt: over.createdAt ?? now,
        updatedAt: over.updatedAt ?? now,
    };
}

const original = {
    findAll: GoalService.prototype.findAll,
    findOne: GoalService.prototype.findOne,
    create: GoalService.prototype.create,
    update: GoalService.prototype.update,
    delete: GoalService.prototype.delete,
};

beforeEach(() => {
    calls.length = 0;

    GoalService.prototype.findAll = (async function (this: unknown): Promise<Goal[]> {
        calls.push({ method: "findAll" });
        return [makeGoal(1, { title: "Objectif 1" })];
    });

    GoalService.prototype.findOne = (async function (this: unknown, id: number): Promise<Goal | null> {
        calls.push({ method: "findOne", args: { id } });
        if (id === 404) return null;
        return makeGoal(id);
    });

    GoalService.prototype.create = (async function (this: unknown, data: Partial<Goal>): Promise<Goal> {
        calls.push({ method: "create", args: { data } });
        return makeGoal(123, data);
    });

    GoalService.prototype.update = (async function (this: unknown, id: number, data: Partial<Goal>): Promise<Goal> {
        calls.push({ method: "update", args: { id, data } });
        return makeGoal(id, data);
    });

    GoalService.prototype.delete = (async function (this: unknown, id: number): Promise<Pick<Goal, "id">> {
        calls.push({ method: "delete", args: { id } });
        return { id };
    }) as unknown as typeof GoalService.prototype.delete;
});

afterEach(() => {
    GoalService.prototype.findAll = original.findAll;
    GoalService.prototype.findOne = original.findOne;
    GoalService.prototype.create = original.create;
    GoalService.prototype.update = original.update;
    GoalService.prototype.delete = original.delete;
});

type Ctx = Parameters<typeof goalRouter.createCaller>[0];

describe("goal.router — createCaller (sans HTTP)", () => {
    it("goal.getAll → appelle service.findAll et retourne la liste", async () => {
        const caller = goalRouter.createCaller({} as Ctx);
        const res = await caller.getAll();
        expect(res).toMatchObject([{ id: 1, title: "Objectif 1" }]);
        const hit = calls.find((c) => c.method === "findAll");
        expect(hit).toBeDefined();
    });

    it("goal.getById → valide l'input et appelle service.findOne(id)", async () => {
        const caller = goalRouter.createCaller({} as Ctx);
        const res = await caller.getById({ id: 7 });
        expect(res).toMatchObject({ id: 7, title: "Goal 7" });
        const hit = calls.find((c) => c.method === "findOne");
        expect(hit?.args).toEqual({ id: 7 });
    });

    it("goal.create → valide l'input (zod) puis appelle service.create(data)", async () => {
        const caller = goalRouter.createCaller({} as Ctx);
        const payload: Partial<Goal> = { title: "Nouvel objectif", description: "Description test" };
        const res = await caller.create(payload as unknown as never);
        expect(res).toMatchObject({ id: 123, ...payload });
        const hit = calls.find((c) => c.method === "create");
        expect(hit?.args).toEqual({ data: payload });
    });

    it("goal.update → appelle service.update(id, data)", async () => {
        const caller = goalRouter.createCaller({} as Ctx);
        const res = await caller.update({ id: 99, data: { title: "Objectif modifié" } as Partial<Goal> } as unknown as never);
        expect(res).toMatchObject({ id: 99, title: "Objectif modifié" });
        const hit = calls.find((c) => c.method === "update");
        expect(hit?.args).toEqual({ id: 99, data: { title: "Objectif modifié" } });
    });

    it("goal.delete → appelle service.delete(id)", async () => {
        const caller = goalRouter.createCaller({} as Ctx);
        const res = await caller.delete({ id: 5 });
        expect(res.id).toBe(5);
        const hit = calls.find((c) => c.method === "delete");
        expect(hit?.args).toEqual({ id: 5 });
    });
});

describe("goal.router — validations Zod (erreurs attendues)", () => {
    it("getById avec id <= 0 → rejette", async () => {
        const caller = goalRouter.createCaller({} as Ctx);
        expect(caller.getById({id: 0} as unknown as never)).rejects.toBeDefined();
        expect(caller.getById({id: -1} as unknown as never)).rejects.toBeDefined();
    });

    it("update avec id invalide → rejette", async () => {
        const caller = goalRouter.createCaller({} as Ctx);
        expect(caller.update({id: 0, data: {}} as unknown as never)).rejects.toBeDefined();
    });

    it("delete avec id invalide → rejette", async () => {
        const caller = goalRouter.createCaller({} as Ctx);
        expect(caller.delete({id: 0} as unknown as never)).rejects.toBeDefined();
    });
});