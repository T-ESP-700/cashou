// tests/router/level-goal.router.test.ts
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import type { LevelGoal } from "@cashou/db-app";
import { levelGoalRouter } from "../../src/trpc/routers/level-goal.router";
import { LevelGoalService } from "../../src/trpc/services/level-goal.service";

type Call =
    | { method: "findAll"; args?: undefined }
    | { method: "findOne"; args: { id: number } }
    | { method: "findByLevelId"; args: { levelId: number } }
    | { method: "findByGoalId"; args: { goalId: number } }
    | { method: "create"; args: { data: Partial<LevelGoal> } }
    | { method: "update"; args: { id: number; data: Partial<LevelGoal> } }
    | { method: "delete"; args: { id: number } };

const calls: Call[] = [];

function makeLevelGoal(id: number, over: Partial<LevelGoal> = {}): LevelGoal {
    const now = new Date();
    return {
        id,
        levelId: over.levelId ?? 1,
        goalId: over.goalId ?? 1,
        isMandatory: over.isMandatory ?? true,
        createdAt: over.createdAt ?? now,
        updatedAt: over.updatedAt ?? now,
    };
}

const original = {
    findAll: LevelGoalService.prototype.findAll,
    findOne: LevelGoalService.prototype.findOne,
    findByLevelId: LevelGoalService.prototype.findByLevelId,
    findByGoalId: LevelGoalService.prototype.findByGoalId,
    create: LevelGoalService.prototype.create,
    update: LevelGoalService.prototype.update,
    delete: LevelGoalService.prototype.delete,
};

beforeEach(() => {
    calls.length = 0;

    LevelGoalService.prototype.findAll = async function (): Promise<LevelGoal[]> {
        calls.push({ method: "findAll" });
        return [makeLevelGoal(1, { levelId: 1, goalId: 1 })];
    };

    LevelGoalService.prototype.findOne = async function (id: number): Promise<LevelGoal | null> {
        calls.push({ method: "findOne", args: { id } });
        if (id === 404) return null;
        return makeLevelGoal(id);
    };

    LevelGoalService.prototype.findByLevelId = async function (levelId: number): Promise<LevelGoal[]> {
        calls.push({ method: "findByLevelId", args: { levelId } });
        return [makeLevelGoal(1, { levelId })];
    };

    LevelGoalService.prototype.findByGoalId = async function (goalId: number): Promise<LevelGoal[]> {
        calls.push({ method: "findByGoalId", args: { goalId } });
        return [makeLevelGoal(1, { goalId })];
    };

    LevelGoalService.prototype.create = async function (data: Partial<LevelGoal>): Promise<LevelGoal> {
        calls.push({ method: "create", args: { data } });
        return makeLevelGoal(123, data);
    };

    LevelGoalService.prototype.update = async function (id: number, data: Partial<LevelGoal>): Promise<LevelGoal> {
        calls.push({ method: "update", args: { id, data } });
        return makeLevelGoal(id, data);
    };

    LevelGoalService.prototype.delete = async function (id: number): Promise<Pick<LevelGoal, "id">> {
        calls.push({ method: "delete", args: { id } });
        return { id };
    } as typeof LevelGoalService.prototype.delete;
});

afterEach(() => {
    Object.assign(LevelGoalService.prototype, original);
});

type Ctx = Parameters<typeof levelGoalRouter.createCaller>[0];

describe("levelGoal.router — createCaller (sans HTTP)", () => {
    it("levelGoal.getAll → appelle service.findAll et retourne la liste", async () => {
        const caller = levelGoalRouter.createCaller({} as Ctx);
        const res = await caller.getAll();
        expect(res).toMatchObject([{ id: 1, levelId: 1, goalId: 1 }]);
        const hit = calls.find((c) => c.method === "findAll");
        expect(hit).toBeDefined();
    });

    it("levelGoal.getById → valide l'input et appelle service.findOne(id)", async () => {
        const caller = levelGoalRouter.createCaller({} as Ctx);
        const res = await caller.getById({ id: 7 });
        expect(res).toMatchObject({ id: 7 });
        const hit = calls.find((c) => c.method === "findOne");
        expect(hit?.args).toEqual({ id: 7 });
    });

    it("levelGoal.getByLevelId → appelle service.findByLevelId", async () => {
        const caller = levelGoalRouter.createCaller({} as Ctx);
        const res = await caller.getByLevelId({ levelId: 3 });
        expect(res).toMatchObject([{ id: 1, levelId: 3 }]);
        const hit = calls.find((c) => c.method === "findByLevelId");
        expect(hit?.args).toEqual({ levelId: 3 });
    });

    it("levelGoal.getByGoalId → appelle service.findByGoalId", async () => {
        const caller = levelGoalRouter.createCaller({} as Ctx);
        const res = await caller.getByGoalId({ goalId: 5 });
        expect(res).toMatchObject([{ id: 1, goalId: 5 }]);
        const hit = calls.find((c) => c.method === "findByGoalId");
        expect(hit?.args).toEqual({ goalId: 5 });
    });

    it("levelGoal.create → valide l'input (zod) puis appelle service.create(data)", async () => {
        const caller = levelGoalRouter.createCaller({} as Ctx);
        const payload = { levelId: 2, goalId: 3 };
        const res = await caller.create(payload);
        expect(res).toMatchObject({ id: 123, ...payload });
        const hit = calls.find((c) => c.method === "create");
        expect(hit?.args).toEqual({ data: { ...payload, isMandatory: true } });
    });

    it("levelGoal.update → appelle service.update(id, data)", async () => {
        const caller = levelGoalRouter.createCaller({} as Ctx);
        const res = await caller.update({ id: 99, data: { levelId: 4, goalId: 5 } });
        expect(res).toMatchObject({ id: 99, levelId: 4, goalId: 5 });
        const hit = calls.find((c) => c.method === "update");
        expect(hit?.args).toEqual({ id: 99, data: { levelId: 4, goalId: 5, isMandatory: true } });
    });

    it("levelGoal.delete → appelle service.delete(id)", async () => {
        const caller = levelGoalRouter.createCaller({} as Ctx);
        const res = await caller.delete({ id: 5 });
        expect(res.id).toBe(5);
        const hit = calls.find((c) => c.method === "delete");
        expect(hit?.args).toEqual({ id: 5 });
    });
});

describe("levelGoal.router — validations Zod (erreurs attendues)", () => {
    it("getById avec id <= 0 → rejette", async () => {
        const caller = levelGoalRouter.createCaller({} as Ctx);
        expect(caller.getById({id: 0} as unknown as never)).rejects.toBeDefined();
        expect(caller.getById({id: -1} as unknown as never)).rejects.toBeDefined();
    });

    it("create avec levelId/goalId invalides → rejette", async () => {
        const caller = levelGoalRouter.createCaller({} as Ctx);
        expect(caller.create({levelId: 0, goalId: 1} as unknown as never)).rejects.toBeDefined();
        expect(caller.create({levelId: 1, goalId: -1} as unknown as never)).rejects.toBeDefined();
    });

    it("update avec id invalide → rejette", async () => {
        const caller = levelGoalRouter.createCaller({} as Ctx);
        expect(caller.update({id: 0, data: {levelId: 1, goalId: 1}} as unknown as never)).rejects.toBeDefined();
    });
});
