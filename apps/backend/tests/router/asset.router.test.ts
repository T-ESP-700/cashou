import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import type { Asset } from "@cashou/db-app";
import { assetRouter } from "../../src/trpc/routers/asset.router";
import { AssetService } from "../../src/trpc/services/asset.service";
import { createRouterTestSetup } from "../helpers/router-test-factory";

function makeAsset(id: number, over: Partial<Asset> = {}): Asset {
  const now = new Date();
  return {
    id,
    title: over.title ?? `Asset ${id}`,
    symbol: over.symbol ?? `SYM${id}`,
    fieldId: over.fieldId ?? null,
    rate: over.rate ?? null,
    description: over.description ?? null,
    marketId: over.marketId ?? 1,
    submarketId: over.submarketId ?? null,
    taux: over.taux ?? null,
    maxAmount: over.maxAmount ?? null,
    minAmount: over.minAmount ?? null,
    createdAt: over.createdAt ?? now,
    updatedAt: over.updatedAt ?? now,
  };
}

const { wasMethodCalled, findCall } = createRouterTestSetup(
  AssetService,
  makeAsset
);

// Manually mock special methods not covered by the factory
const originalFindByMarketId = AssetService.prototype.findByMarketId;
const originalFindBySubmarketId = AssetService.prototype.findBySubmarketId;

beforeEach(() => {
  AssetService.prototype.findByMarketId = async function (marketId: number): Promise<Asset[]> {
    return [makeAsset(1, { marketId })];
  };
  AssetService.prototype.findBySubmarketId = async function (submarketId: number): Promise<Asset[]> {
    return [makeAsset(1, { submarketId })];
  };
});

afterEach(() => {
  AssetService.prototype.findByMarketId = originalFindByMarketId;
  AssetService.prototype.findBySubmarketId = originalFindBySubmarketId;
});

type Ctx = Parameters<typeof assetRouter.createCaller>[0];

describe("asset.router — CRUD standard", () => {
  it("asset.getAll → appelle service.findAll", async () => {
    const caller = assetRouter.createCaller({} as Ctx);
    const res = await caller.getAll();
    expect(res).toMatchObject([{ id: 1 }]);
    expect(wasMethodCalled("findAll")).toBeTrue();
  });

  it("asset.getById → appelle service.findOne(id)", async () => {
    const caller = assetRouter.createCaller({} as Ctx);
    const res = await caller.getById({ id: 7 });
    expect(res).toMatchObject({ id: 7 });
    expect(findCall("findOne")?.args).toEqual({ id: 7 });
  });

  it("asset.create → appelle service.create(data)", async () => {
    const caller = assetRouter.createCaller({} as Ctx);
    const payload = {
      title: "Test Asset",
      symbol: "TST",
      marketId: 2,
    };
    const res = await caller.create(payload);
    expect(res).toMatchObject({ id: 123 });
    expect(wasMethodCalled("create")).toBeTrue();
  });

  it("asset.update → appelle service.update(id, data)", async () => {
    const caller = assetRouter.createCaller({} as Ctx);
    const res = await caller.update({ id: 99, data: { title: "Updated Asset" } });
    expect(res).toMatchObject({ id: 99, title: "Updated Asset" });
    expect(findCall("update")?.args).toEqual({ id: 99, data: { title: "Updated Asset" } });
  });

  it("asset.delete → appelle service.delete(id)", async () => {
    const caller = assetRouter.createCaller({} as Ctx);
    const res = await caller.delete({ id: 5 });
    expect(res.id).toBe(5);
    expect(wasMethodCalled("delete")).toBeTrue();
  });
});

describe("asset.router — Méthodes spéciales", () => {
  it("asset.getByMarketId → appelle service.findByMarketId(marketId)", async () => {
    const caller = assetRouter.createCaller({} as Ctx);
    const res = await caller.getByMarketId({ marketId: 123 });
    expect(res).toMatchObject([{ marketId: 123 }]);
  });

  it("asset.getBySubmarketId → appelle service.findBySubmarketId(submarketId)", async () => {
    const caller = assetRouter.createCaller({} as Ctx);
    const res = await caller.getBySubmarketId({ submarketId: 456 });
    expect(res).toMatchObject([{ submarketId: 456 }]);
  });
});

describe("asset.router — Validations Zod", () => {
  it("getById avec id invalide → rejette", async () => {
    const caller = assetRouter.createCaller({} as Ctx);
    expect(caller.getById({ id: 0 })).rejects.toBeDefined();
  });

  it("update avec id invalide → rejette", async () => {
    const caller = assetRouter.createCaller({} as Ctx);
    expect(caller.update({ id: 0, data: { title: "Test" } })).rejects.toBeDefined();
  });

  it("delete avec id invalide → rejette", async () => {
    const caller = assetRouter.createCaller({} as Ctx);
    expect(caller.delete({ id: 0 })).rejects.toBeDefined();
  });

  it("getByMarketId avec marketId invalide → rejette", async () => {
    const caller = assetRouter.createCaller({} as Ctx);
    expect(caller.getByMarketId({ marketId: 0 })).rejects.toBeDefined();
  });

  it("getBySubmarketId avec submarketId invalide → rejette", async () => {
    const caller = assetRouter.createCaller({} as Ctx);
    expect(caller.getBySubmarketId({ submarketId: 0 })).rejects.toBeDefined();
  });
});
