// tests/router/level.router.test.ts
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import type { Level } from "@prisma/client";
import { levelRouter } from "../../src/routers/level.router";
import { LevelService } from "../../src/services/level.service";

type Call =
    | { method: "findAll"; args?: undefined }
    | { method: "findOne"; args: { id: number } }
    | { method: "create"; args: { data: Partial<Level> } }
    | { method: "update"; args: { id: number; data: Partial<Level> } }
    | { method: "delete"; args: { id: number } };

const calls: Call[] = [];

function makeLevel(id: number, over: Partial<Level> = {}): Level {
  const now = new Date();
  return {
    id,
    title: over.title ?? `N${id}`,
    number: over.number ?? null,
    duration: over.duration ?? null,
    speed: over.speed ?? null,
    startBalance: over.startBalance ?? null,
    pointsRequired: over.pointsRequired ?? null,
    description: over.description ?? null,
    createdAt: over.createdAt ?? now,
    updatedAt: over.updatedAt ?? now,
  };
}

const original = {
  findAll: LevelService.prototype.findAll,
  findOne: LevelService.prototype.findOne,
  create: LevelService.prototype.create,
  update: LevelService.prototype.update,
  delete: LevelService.prototype.delete,
};

beforeEach(() => {
  calls.length = 0;

  LevelService.prototype.findAll = (async function (this: unknown): Promise<Level[]> {
    calls.push({ method: "findAll" });
    return [makeLevel(1, { title: "N1" })];
  });

  LevelService.prototype.findOne = (async function (this: unknown, id: number): Promise<Level | null> {
    calls.push({ method: "findOne", args: { id } });
    if (id === 404) return null;
    return makeLevel(id);
  });

  LevelService.prototype.create = (async function (this: unknown, data: Partial<Level>): Promise<Level> {
    calls.push({ method: "create", args: { data } });
    return makeLevel(123, data);
  });

  LevelService.prototype.update = (async function (this: unknown, id: number, data: Partial<Level>): Promise<Level> {
    calls.push({ method: "update", args: { id, data } });
    return makeLevel(id, data);
  });

  LevelService.prototype.delete = (async function (this: unknown, id: number): Promise<Pick<Level, "id">> {
    calls.push({ method: "delete", args: { id } });
    return { id };
  }) as unknown as typeof LevelService.prototype.delete;
});

afterEach(() => {
  LevelService.prototype.findAll = original.findAll;
  LevelService.prototype.findOne = original.findOne;
  LevelService.prototype.create = original.create;
  LevelService.prototype.update = original.update;
  LevelService.prototype.delete = original.delete;
});

type Ctx = Parameters<typeof levelRouter.createCaller>[0];

describe("level.router — createCaller (sans HTTP)", () => {
  it("level.getAll → appelle service.findAll et retourne la liste", async () => {
    const caller = levelRouter.createCaller({} as Ctx);
    const res = await caller.getAll();
    expect(res).toMatchObject([{ id: 1, title: "N1" }]);
    const hit = calls.find((c) => c.method === "findAll");
    expect(hit).toBeDefined();
  });

  it("level.getById → valide l'input et appelle service.findOne(id)", async () => {
    const caller = levelRouter.createCaller({} as Ctx);
    const res = await caller.getById({ id: 7 });
    expect(res).toMatchObject({ id: 7, title: "N7" });
    const hit = calls.find((c) => c.method === "findOne");
    expect(hit?.args).toEqual({ id: 7 });
  });

  it("level.create → valide l'input (zod) puis appelle service.create(data)", async () => {
    const caller = levelRouter.createCaller({} as Ctx);
    const payload: Partial<Level> = { title: "T", number: 1, duration: 10 };
    const res = await caller.create(payload as unknown as never);
    expect(res).toMatchObject({ id: 123, ...payload });
    const hit = calls.find((c) => c.method === "create");
    expect(hit?.args).toEqual({ data: payload });
  });

  it("level.update → appelle service.update(id, data)", async () => {
    const caller = levelRouter.createCaller({} as Ctx);
    const res = await caller.update({ id: 99, data: { title: "Up" } as Partial<Level> } as unknown as never);
    expect(res).toMatchObject({ id: 99, title: "Up" });
    const hit = calls.find((c) => c.method === "update");
    expect(hit?.args).toEqual({ id: 99, data: { title: "Up" } });
  });

  it("level.delete → appelle service.delete(id)", async () => {
    const caller = levelRouter.createCaller({} as Ctx);
    const res = await caller.delete({ id: 5 });
    expect(res.id).toBe(5);
    const hit = calls.find((c) => c.method === "delete");
    expect(hit?.args).toEqual({ id: 5 });
  });
});

describe("level.router — validations Zod (erreurs attendues)", () => {
  it("getById avec id <= 0 → rejette", async () => {
    const caller = levelRouter.createCaller({} as Ctx);
    expect(caller.getById({id: 0} as unknown as never)).rejects.toBeDefined();
    expect(caller.getById({id: -1} as unknown as never)).rejects.toBeDefined();
  });

  it("update avec id invalide → rejette", async () => {
    const caller = levelRouter.createCaller({} as Ctx);
    expect(caller.update({id: 0, data: {}} as unknown as never)).rejects.toBeDefined();
  });

  it("delete avec id invalide → rejette", async () => {
    const caller = levelRouter.createCaller({} as Ctx);
    expect(caller.delete({id: 0} as unknown as never)).rejects.toBeDefined();
  });
});
