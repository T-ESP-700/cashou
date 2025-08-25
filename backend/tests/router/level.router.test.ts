/**
 * tests/router/level.router.test.ts
 * Tests du tRPC levelRouter avec createCaller, en mockant LevelService via patch du prototype.
 * Pas besoin de serveur HTTP.
 */
import { describe, it, expect, beforeEach, afterEach } from "bun:test";

// IMPORTANT : adapte ce chemin à ton arborescence réelle.
// D'après ta capture: src/routers/level.router.ts
import { levelRouter } from "../../src/routers/level.router";

// On va patcher les méthodes de LevelService au niveau du prototype.
// Comme le router crée une instance interne (new LevelService()),
// remplacer le prototype suffit pour que l'instance utilise nos fonctions mockées.
import { LevelService } from "../../src/services/level.service";

type Call = [method: string, args: any];
const calls: Call[] = [];

function makeLevel(id: number, over: Partial<any> = {}) {
  const now = new Date();
  return {
    id,
    title: `N${id}`,
    number: null,
    duration: null,
    speed: null,
    startBalance: null,
    pointsRequired: null,
    description: null,
    createdAt: now,
    updatedAt: now,
    ...over,
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

  LevelService.prototype.findAll = (async function (this: any) {
    calls.push(["findAll", undefined]);
    return [makeLevel(1, { title: "N1" })] as any;
  }) as any;

  LevelService.prototype.findOne = (async function (this: any, id: number) {
    calls.push(["findOne", { id }]);
    if (id === 404) return null;
    return makeLevel(id) as any;
  }) as any;

  LevelService.prototype.create = (async function (this: any, data: any) {
    calls.push(["create", { data }]);
    return makeLevel(123, data) as any;
  }) as any;

  LevelService.prototype.update = (async function (
    this: any,
    id: number,
    data: any
  ) {
    calls.push(["update", { id, data }]);
    return makeLevel(id, data) as any;
  }) as any;

  LevelService.prototype.delete = (async function (this: any, id: number) {
    calls.push(["delete", { id }]);
    return { id } as any;
  }) as any;
});

afterEach(() => {
  // restore
  LevelService.prototype.findAll = original.findAll;
  LevelService.prototype.findOne = original.findOne;
  LevelService.prototype.create = original.create;
  LevelService.prototype.update = original.update;
  LevelService.prototype.delete = original.delete;
});

describe("level.router — createCaller (sans HTTP)", () => {
  it("level.getAll → appelle service.findAll et retourne la liste", async () => {
    const caller = levelRouter.createCaller({} as any);
    const res: any = await caller.getAll();
    expect(res).toMatchObject([{ id: 1, title: "N1" } as any]);
    const hit = calls.find((c) => c[0] === "findAll");
    expect(hit).toBeDefined();
  });

  it("level.getById → valide l'input et appelle service.findOne(id)", async () => {
    const caller = levelRouter.createCaller({} as any);
    const res: any = await caller.getById({ id: 7 });
    expect(res).toMatchObject({ id: 7, title: "N7" } as any);
    const hit = calls.find((c) => c[0] === "findOne");
    expect(hit?.[1]).toEqual({ id: 7 });
  });

  it("level.create → valide l'input (zod) puis appelle service.create(data)", async () => {
    const caller = levelRouter.createCaller({} as any);
    const payload = { title: "T", number: 1, duration: 10 };
    const res: any = await caller.create(payload as any);
    expect(res).toMatchObject({ id: 123, ...payload } as any);
    const hit = calls.find((c) => c[0] === "create");
    expect(hit?.[1]).toEqual({ data: payload });
  });

  it("level.update → appelle service.update(id, data)", async () => {
    const caller = levelRouter.createCaller({} as any);
    const res: any = await caller.update({ id: 99, data: { title: "Up" } } as any);
    expect(res).toMatchObject({ id: 99, title: "Up" } as any);
    const hit = calls.find((c) => c[0] === "update");
    expect(hit?.[1]).toEqual({ id: 99, data: { title: "Up" } });
  });

  it("level.delete → appelle service.delete(id)", async () => {
    const caller = levelRouter.createCaller({} as any);
    const res: any = await caller.delete({ id: 5 });
    expect(res).toEqual({ id: 5 } as any);
    const hit = calls.find((c) => c[0] === "delete");
    expect(hit?.[1]).toEqual({ id: 5 });
  });
});

describe("level.router — validations Zod (erreurs attendues)", () => {
  it("getById avec id <= 0 → rejette", async () => {
    const caller = levelRouter.createCaller({} as any);
    expect(caller.getById({id: 0} as any)).rejects.toBeDefined();
    expect(caller.getById({id: -1} as any)).rejects.toBeDefined();
  });

  it("update avec id invalide → rejette", async () => {
    const caller = levelRouter.createCaller({} as any);
    expect(
        caller.update({id: 0, data: {}} as any)
    ).rejects.toBeDefined();
  });

  it("delete avec id invalide → rejette", async () => {
    const caller = levelRouter.createCaller({} as any);
    expect(caller.delete({id: 0} as any)).rejects.toBeDefined();
  });
});
