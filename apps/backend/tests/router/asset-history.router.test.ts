import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import type { AssetHistory } from "@cashou/db-app";
import { Prisma } from "@cashou/db-app";
import { assetHistoryRouter } from "../../src/trpc/routers/asset-history.router";
import { AssetHistoryService } from "../../src/trpc/services/asset-history.service";
import { createRouterTestSetup } from "../helpers/router-test-factory";

function makeAssetHistory(id: number, over: Partial<AssetHistory> = {}): AssetHistory {
  const now = new Date();
  return {
    id,
    assetId: over.assetId ?? 1,
    timestamp: over.timestamp ?? now,
    value: over.value ?? new Prisma.Decimal(100),
    createdAt: over.createdAt ?? now,
    updatedAt: over.updatedAt ?? now,
  };
}

const { wasMethodCalled, findCall } = createRouterTestSetup(AssetHistoryService, makeAssetHistory);

const originalFindByAssetId = AssetHistoryService.prototype.findByAssetId;

beforeEach(() => {
  AssetHistoryService.prototype.findByAssetId = async function (assetId: number): Promise<AssetHistory[]> {
    return [makeAssetHistory(1, { assetId })];
  };
});

afterEach(() => {
  AssetHistoryService.prototype.findByAssetId = originalFindByAssetId;
});

type Ctx = Parameters<typeof assetHistoryRouter.createCaller>[0];

describe("assetHistory.router — CRUD standard", () => {
  it("assetHistory.getAll → appelle service.findAll", async () => {
    const caller = assetHistoryRouter.createCaller({} as Ctx);
    const res = await caller.getAll();
    expect(res).toMatchObject([{ id: 1 }]);
    expect(wasMethodCalled("findAll")).toBeTrue();
  });

  it("assetHistory.getById → appelle service.findOne(id)", async () => {
    const caller = assetHistoryRouter.createCaller({} as Ctx);
    const res = await caller.getById({ id: 7 });
    expect(res).toMatchObject({ id: 7 });
    expect(findCall("findOne")?.args).toEqual({ id: 7 });
  });

  it("assetHistory.create → appelle service.create(data)", async () => {
    const caller = assetHistoryRouter.createCaller({} as Ctx);
    const payload = { assetId: 1, value: new Prisma.Decimal(150) };
    const res = await caller.create(payload);
    expect(res).toMatchObject({ id: 123 });
    expect(wasMethodCalled("create")).toBeTrue();
  });

  it("assetHistory.update → appelle service.update(id, data)", async () => {
    const caller = assetHistoryRouter.createCaller({} as Ctx);
    const res = await caller.update({ id: 99, data: { assetId: 2 } });
    expect(res).toMatchObject({ id: 99 });
    expect(findCall("update")?.args).toEqual({ id: 99, data: { assetId: 2 } });
  });

  it("assetHistory.delete → appelle service.delete(id)", async () => {
    const caller = assetHistoryRouter.createCaller({} as Ctx);
    const res = await caller.delete({ id: 5 });
    expect(res.id).toBe(5);
    expect(wasMethodCalled("delete")).toBeTrue();
  });
});

describe("assetHistory.router — Méthodes spéciales", () => {
  it("assetHistory.getByAssetId → appelle service.findByAssetId(assetId)", async () => {
    const caller = assetHistoryRouter.createCaller({} as Ctx);
    const res = await caller.getByAssetId({ assetId: 123 });
    expect(res).toMatchObject([{ assetId: 123 }]);
  });
});

describe("assetHistory.router — Validations Zod", () => {
  it("getById avec id invalide → rejette", async () => {
    const caller = assetHistoryRouter.createCaller({} as Ctx);
    expect(caller.getById({ id: 0 })).rejects.toBeDefined();
  });

  it("delete avec id invalide → rejette", async () => {
    const caller = assetHistoryRouter.createCaller({} as Ctx);
    expect(caller.delete({ id: 0 })).rejects.toBeDefined();
  });
});

describe("assetHistory.router — Méthodes additionnelles", () => {
  const extraMethods = [
    "findByAssetIdAndPeriod",
    "findLatestByAssetId",
    "findForGame",
    "getCurrentPrice",
    "getCurrentPriceWithChange",
  ] as const;

  const callsByMethod: Record<string, unknown[][]> = {};
  const originals: Record<string, unknown> = {};

  beforeEach(() => {
    for (const k of Object.keys(callsByMethod)) delete callsByMethod[k];
    for (const m of extraMethods) {
      callsByMethod[m] = [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      originals[m] = (AssetHistoryService.prototype as any)[m];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (AssetHistoryService.prototype as any)[m] = async function (...args: unknown[]) {
        callsByMethod[m]!.push(args);
        return null;
      };
    }
  });

  afterEach(() => {
    for (const m of extraMethods) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (AssetHistoryService.prototype as any)[m] = originals[m];
    }
  });

  it("getByAssetIdAndPeriod → findByAssetIdAndPeriod(assetId, start, end)", async () => {
    const caller = assetHistoryRouter.createCaller({} as Ctx);
    await caller.getByAssetIdAndPeriod({
      assetId: 1,
      startDate: "2024-01-01",
      endDate: "2024-12-31",
    });
    const args = callsByMethod.findByAssetIdAndPeriod?.[0];
    expect(args?.[0]).toBe(1);
    expect(args?.[1]).toBeInstanceOf(Date);
    expect(args?.[2]).toBeInstanceOf(Date);
  });

  it("getLatestByAssetId → findLatestByAssetId(assetId)", async () => {
    const caller = assetHistoryRouter.createCaller({} as Ctx);
    await caller.getLatestByAssetId({ assetId: 5 });
    expect(callsByMethod.findLatestByAssetId?.[0]?.[0]).toBe(5);
  });

  it("getForGame → findForGame(assetId, gameInstanceId)", async () => {
    const caller = assetHistoryRouter.createCaller({} as Ctx);
    await caller.getForGame({ assetId: 1, gameInstanceId: 2 });
    expect(callsByMethod.findForGame?.[0]).toEqual([1, 2]);
  });

  it("getCurrentPrice → getCurrentPrice(assetId, gameInstanceId)", async () => {
    const caller = assetHistoryRouter.createCaller({} as Ctx);
    await caller.getCurrentPrice({ assetId: 1, gameInstanceId: 2 });
    expect(callsByMethod.getCurrentPrice?.[0]).toEqual([1, 2]);
  });

  it("getPriceWithChange → getCurrentPriceWithChange(assetId, gameInstanceId)", async () => {
    const caller = assetHistoryRouter.createCaller({} as Ctx);
    await caller.getPriceWithChange({ assetId: 1, gameInstanceId: 2 });
    expect(callsByMethod.getCurrentPriceWithChange?.[0]).toEqual([1, 2]);
  });
});
