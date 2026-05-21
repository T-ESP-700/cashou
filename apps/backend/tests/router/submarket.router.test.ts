import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import type { Submarket } from "@cashou/db-app";
import { submarketRouter } from "../../src/trpc/routers/submarket.router";
import { SubmarketService } from "../../src/trpc/services/submarket.service";
import { createRouterTestSetup } from "../helpers/router-test-factory";

function makeSubmarket(id: number, over: Partial<Submarket> = {}): Submarket {
  const now = new Date();
  return {
    id,
    marketId: over.marketId ?? 1,
    gameInstanceId: over.gameInstanceId ?? null,
    title: over.title ?? `Submarket ${id}`,
    description: over.description ?? `Description ${id}`,
    createdAt: over.createdAt ?? now,
    updatedAt: over.updatedAt ?? now,
  };
}

const { wasMethodCalled, findCall } = createRouterTestSetup(SubmarketService, makeSubmarket);

const originalFindByMarketId = SubmarketService.prototype.findByMarketId;

beforeEach(() => {
  SubmarketService.prototype.findByMarketId = async function (marketId: number): Promise<Submarket[]> {
    return [makeSubmarket(1, { marketId })];
  };
});

afterEach(() => {
  SubmarketService.prototype.findByMarketId = originalFindByMarketId;
});

type Ctx = Parameters<typeof submarketRouter.createCaller>[0];

describe("submarket.router — CRUD standard", () => {
  it("submarket.getAll → appelle service.findAll", async () => {
    const caller = submarketRouter.createCaller({} as Ctx);
    const res = await caller.getAll();
    expect(res).toMatchObject([{ id: 1 }]);
    expect(wasMethodCalled("findAll")).toBeTrue();
  });

  it("submarket.getById → appelle service.findOne(id)", async () => {
    const caller = submarketRouter.createCaller({} as Ctx);
    const res = await caller.getById({ id: 7 });
    expect(res).toMatchObject({ id: 7 });
    expect(findCall("findOne")?.args).toEqual({ id: 7 });
  });

  it("submarket.create → appelle service.create(data)", async () => {
    const caller = submarketRouter.createCaller({} as Ctx);
    const payload = { title: "Tech Submarket", marketId: 1 };
    const res = await caller.create(payload);
    expect(res).toMatchObject({ id: 123 });
    expect(wasMethodCalled("create")).toBeTrue();
  });

  it("submarket.update → appelle service.update(id, data)", async () => {
    const caller = submarketRouter.createCaller({} as Ctx);
    const res = await caller.update({ id: 99, data: { title: "Updated Submarket" } });
    expect(res).toMatchObject({ id: 99, title: "Updated Submarket" });
    expect(findCall("update")?.args).toEqual({ id: 99, data: { title: "Updated Submarket" } });
  });

  it("submarket.delete → appelle service.delete(id)", async () => {
    const caller = submarketRouter.createCaller({} as Ctx);
    const res = await caller.delete({ id: 5 });
    expect(res.id).toBe(5);
    expect(wasMethodCalled("delete")).toBeTrue();
  });
});

describe("submarket.router — Méthodes spéciales", () => {
  it("submarket.getByMarketId → appelle service.findByMarketId(marketId)", async () => {
    const caller = submarketRouter.createCaller({} as Ctx);
    const res = await caller.getByMarketId({ marketId: 123 });
    expect(res).toMatchObject([{ marketId: 123 }]);
  });
});

describe("submarket.router — Validations Zod", () => {
  it("getById avec id invalide → rejette", async () => {
    const caller = submarketRouter.createCaller({} as Ctx);
    expect(caller.getById({ id: 0 })).rejects.toBeDefined();
  });

  it("update avec id invalide → rejette", async () => {
    const caller = submarketRouter.createCaller({} as Ctx);
    expect(caller.update({ id: 0, data: { title: "Test" } })).rejects.toBeDefined();
  });

  it("delete avec id invalide → rejette", async () => {
    const caller = submarketRouter.createCaller({} as Ctx);
    expect(caller.delete({ id: 0 })).rejects.toBeDefined();
  });

  it("getByMarketId avec marketId invalide → rejette", async () => {
    const caller = submarketRouter.createCaller({} as Ctx);
    expect(caller.getByMarketId({ marketId: 0 })).rejects.toBeDefined();
  });
});
