import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import type { Market } from "@cashou/db-app";
import { marketRouter } from "../../src/trpc/routers/market.router";
import { MarketService } from "../../src/trpc/services/market.service";
import { createRouterTestSetup } from "../helpers/router-test-factory";

function makeMarket(id: number, over: Partial<Market> = {}): Market {
  const now = new Date();
  return {
    id,
    title: over.title ?? `Market ${id}`,
    description: over.description ?? `Description ${id}`,
    createdAt: over.createdAt ?? now,
    updatedAt: over.updatedAt ?? now,
  };
}

const { wasMethodCalled, findCall } = createRouterTestSetup(
  MarketService,
  makeMarket
);

// Manually mock business methods not covered by the factory
const originalList = MarketService.prototype.list;
const originalSearch = MarketService.prototype.search;
const originalGetTree = MarketService.prototype.getTree;
const originalGetOverview = MarketService.prototype.getOverview;
const originalGetSnapshot = MarketService.prototype.getSnapshot;
const originalGetHistory = MarketService.prototype.getHistory;
const originalGetHeatmap = MarketService.prototype.getHeatmap;

beforeEach(() => {
  MarketService.prototype.list = async function (limit: number, offset: number): Promise<any> {
    return {
      markets: [makeMarket(1)],
      total: 1,
      limit,
      offset,
    };
  };
  MarketService.prototype.search = async function (): Promise<any[]> {
    return [makeMarket(1)];
  };
  MarketService.prototype.getTree = async function (marketId: number): Promise<any> {
    return {
      market: makeMarket(marketId),
      submarkets: [],
    };
  };
  MarketService.prototype.getOverview = async function (marketId: number): Promise<any> {
    return {
      market: makeMarket(marketId),
      kpis: {},
      topAssets: [],
    };
  };
  MarketService.prototype.getSnapshot = async function (marketId: number): Promise<any> {
    return {
      marketId,
      timestamp: new Date(),
      metrics: {},
    };
  };
  MarketService.prototype.getHistory = async function (marketId: number, from: Date, to: Date): Promise<any> {
    return {
      marketId,
      from,
      to,
      data: [],
    };
  };
  MarketService.prototype.getHeatmap = async function (marketId: number, metric: string): Promise<any> {
    return {
      marketId,
      metric,
      data: [],
    };
  };
});

afterEach(() => {
  MarketService.prototype.list = originalList;
  MarketService.prototype.search = originalSearch;
  MarketService.prototype.getTree = originalGetTree;
  MarketService.prototype.getOverview = originalGetOverview;
  MarketService.prototype.getSnapshot = originalGetSnapshot;
  MarketService.prototype.getHistory = originalGetHistory;
  MarketService.prototype.getHeatmap = originalGetHeatmap;
});

type Ctx = Parameters<typeof marketRouter.createCaller>[0];

describe("market.router — CRUD standard", () => {
  it("market.getAll → appelle service.findAll", async () => {
    const caller = marketRouter.createCaller({} as Ctx);
    const res = await caller.getAll();
    expect(res).toMatchObject([{ id: 1 }]);
    expect(wasMethodCalled("findAll")).toBeTrue();
  });

  it("market.getById → appelle service.findOne(id)", async () => {
    const caller = marketRouter.createCaller({} as Ctx);
    const res = await caller.getById({ id: 7 });
    expect(res).toMatchObject({ id: 7 });
    expect(findCall("findOne")?.args).toEqual({ id: 7 });
  });

  it("market.create → appelle service.create(data)", async () => {
    const caller = marketRouter.createCaller({} as Ctx);
    const payload = {
      title: "Test Market",
      description: "Test Description",
    };
    const res = await caller.create(payload);
    expect(res).toMatchObject({ id: 123 });
    expect(wasMethodCalled("create")).toBeTrue();
  });

  it("market.update → appelle service.update(id, data)", async () => {
    const caller = marketRouter.createCaller({} as Ctx);
    const res = await caller.update({ id: 99, data: { title: "Updated Market" } });
    expect(res).toMatchObject({ id: 99, title: "Updated Market" });
    expect(findCall("update")?.args).toEqual({ id: 99, data: { title: "Updated Market" } });
  });

  it("market.delete → appelle service.delete(id)", async () => {
    const caller = marketRouter.createCaller({} as Ctx);
    const res = await caller.delete({ id: 5 });
    expect(res.id).toBe(5);
    expect(wasMethodCalled("delete")).toBeTrue();
  });
});

describe("market.router — Méthodes métiers", () => {
  it("market.list → appelle service.list(limit, offset)", async () => {
    const caller = marketRouter.createCaller({} as Ctx);
    const res = await caller.list({ limit: 20, offset: 0 });
    expect(res).toMatchObject({ markets: [{ id: 1 }], total: 1, limit: 20, offset: 0 });
  });

  it("market.search → appelle service.search(query, tag, trend)", async () => {
    const caller = marketRouter.createCaller({} as Ctx);
    const res = await caller.search({ query: "tech" });
    expect(res).toMatchObject([{ id: 1 }]);
  });

  it("market.getTree → appelle service.getTree(marketId)", async () => {
    const caller = marketRouter.createCaller({} as Ctx);
    const res = await caller.getTree({ marketId: 1 });
    expect(res).toMatchObject({ market: { id: 1 }, submarkets: [] });
  });

  it("market.getOverview → appelle service.getOverview(marketId)", async () => {
    const caller = marketRouter.createCaller({} as Ctx);
    const res = await caller.getOverview({ marketId: 1 });
    expect(res).toMatchObject({ market: { id: 1 }, kpis: {}, topAssets: [] });
  });

  it("market.getSnapshot → appelle service.getSnapshot(marketId)", async () => {
    const caller = marketRouter.createCaller({} as Ctx);
    const res = await caller.getSnapshot({ marketId: 1 });
    expect(res).toMatchObject({ marketId: 1 });
  });

  it("market.getHistory → appelle service.getHistory(marketId, from, to)", async () => {
    const caller = marketRouter.createCaller({} as Ctx);
    const res = await caller.getHistory({ marketId: 1, from: "2024-01-01", to: "2024-01-31" });
    expect(res).toMatchObject({ marketId: 1 });
  });

  it("market.getHeatmap → appelle service.getHeatmap(marketId, metric)", async () => {
    const caller = marketRouter.createCaller({} as Ctx);
    const res = await caller.getHeatmap({ marketId: 1, metric: "performance" });
    expect(res).toMatchObject({ marketId: 1, metric: "performance" });
  });
});

describe("market.router — Validations Zod", () => {
  it("getById avec id invalide → rejette", async () => {
    const caller = marketRouter.createCaller({} as Ctx);
    expect(caller.getById({ id: 0 })).rejects.toBeDefined();
  });

  it("update avec id invalide → rejette", async () => {
    const caller = marketRouter.createCaller({} as Ctx);
    expect(caller.update({ id: 0, data: { title: "Test" } })).rejects.toBeDefined();
  });

  it("delete avec id invalide → rejette", async () => {
    const caller = marketRouter.createCaller({} as Ctx);
    expect(caller.delete({ id: 0 })).rejects.toBeDefined();
  });

  it("list avec limit invalide → rejette", async () => {
    const caller = marketRouter.createCaller({} as Ctx);
    expect(caller.list({ limit: -1, offset: 0 })).rejects.toBeDefined();
  });

  it("getHeatmap avec metric invalide → rejette", async () => {
    const caller = marketRouter.createCaller({} as Ctx);
    expect(caller.getHeatmap({ marketId: 1, metric: "invalid" as any })).rejects.toBeDefined();
  });
});
