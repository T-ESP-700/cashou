// tests/router/goal.router.test.ts
import { describe, it, expect } from "bun:test";
import type { Goal } from "@cashou/db-app";
import { goalRouter } from "../../src/trpc/routers/goal.router";
import { GoalService } from "../../src/trpc/services/goal.service";
import { createRouterTestSetup } from "../helpers/router-test-factory";

function makeGoal(id: number, over: Partial<Goal> = {}): Goal {
    const now = new Date();
    return {
        id,
        title: over.title ?? `Goal ${id}`,
        description: over.description ?? null,
        successMessage: over.successMessage ?? null,
        failureMessage: over.failureMessage ?? null,
        goalType: over.goalType ?? null,
        goalValue: over.goalValue ?? null,
        createdAt: over.createdAt ?? now,
        updatedAt: over.updatedAt ?? now,
    };
}

// Configuration automatique des mocks avec le helper
const { calls } = createRouterTestSetup(GoalService, makeGoal);

type Ctx = Parameters<typeof goalRouter.createCaller>[0];

describe("goal.router — createCaller (sans HTTP)", () => {
    it("goal.getAll → appelle service.findAll et retourne la liste", async () => {
        const caller = goalRouter.createCaller({} as Ctx);
        const res = await caller.getAll();
        expect(res).toMatchObject([{ id: 1, title: "Goal 1" }]);
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
