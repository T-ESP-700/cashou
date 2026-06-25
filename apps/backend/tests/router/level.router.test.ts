// tests/router/level.router.test.ts
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import type { Level } from "@cashou/db-app";
import { levelRouter } from "../../src/trpc/routers/level.router";
import { LevelService } from "../../src/trpc/services/level.service";
import { createRouterTestSetup } from "../helpers/router-test-factory";

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
    historyStartDay: over.historyStartDay ?? null,
    description: over.description ?? null,
    tip: over.tip ?? null,
    createdAt: over.createdAt ?? now,
    updatedAt: over.updatedAt ?? now,
  };
}

// Configuration automatique des mocks avec le helper
const { calls } = createRouterTestSetup(LevelService, makeLevel);

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

// ---------------------------------------------------------------------------
// Endpoints spécialisés
// ---------------------------------------------------------------------------

describe("level.router — Endpoints spécialisés", () => {
  const extraMethods = [
    "findGoals",
    "findEvents",
    "getSummary",
    "getUserLevels",
    "getAvailability",
    "duplicate",
  ] as const;

  const callsByMethod: Record<string, unknown[][]> = {};
  const originals: Record<string, unknown> = {};

  beforeEach(() => {
    for (const k of Object.keys(callsByMethod)) delete callsByMethod[k];
    for (const m of extraMethods) {
      callsByMethod[m] = [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      originals[m] = (LevelService.prototype as any)[m];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (LevelService.prototype as any)[m] = async function (...args: unknown[]) {
        callsByMethod[m]!.push(args);
        return { method: m, args };
      };
    }
  });

  afterEach(() => {
    for (const m of extraMethods) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (LevelService.prototype as any)[m] = originals[m];
    }
  });

  it("getGoals → findGoals(id)", async () => {
    const caller = levelRouter.createCaller({} as Ctx);
    await caller.getGoals({ id: 1 });
    expect(callsByMethod.findGoals?.[0]?.[0]).toBe(1);
  });

  it("getEvents → findEvents(id)", async () => {
    const caller = levelRouter.createCaller({} as Ctx);
    await caller.getEvents({ id: 1 });
    expect(callsByMethod.findEvents?.[0]?.[0]).toBe(1);
  });

  it("getSummary → getSummary(id)", async () => {
    const caller = levelRouter.createCaller({} as Ctx);
    await caller.getSummary({ id: 1 });
    expect(callsByMethod.getSummary?.[0]?.[0]).toBe(1);
  });

  it("getUserLevels → getUserLevels(userId)", async () => {
    const caller = levelRouter.createCaller({} as Ctx);
    await caller.getUserLevels({ userId: "u1" });
    expect(callsByMethod.getUserLevels?.[0]?.[0]).toBe("u1");
  });

  it("getAvailability → getAvailability(userId, levelId)", async () => {
    const caller = levelRouter.createCaller({} as Ctx);
    await caller.getAvailability({ userId: "u1", levelId: 2 });
    expect(callsByMethod.getAvailability?.[0]).toEqual(["u1", 2]);
  });

  it("duplicate → duplicate(id)", async () => {
    const caller = levelRouter.createCaller({} as Ctx);
    await caller.duplicate({ id: 1 });
    expect(callsByMethod.duplicate?.[0]?.[0]).toBe(1);
  });
});
