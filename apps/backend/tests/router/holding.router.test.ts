// tests/router/holding.router.test.ts
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import type { Holding } from "@cashou/db-app";
import { Prisma } from "@cashou/db-app";
import { holdingRouter } from "../../src/trpc/routers/holding.router";
import { HoldingService } from "../../src/trpc/services/holding.service";
import { createRouterTestSetup } from "../helpers/router-test-factory";

function makeHolding(id: number, over: Partial<Holding> = {}): Holding {
  const now = new Date();
  return {
    id,
    walletId: over.walletId ?? 1,
    assetId: over.assetId ?? 1,
    gameInstanceId: over.gameInstanceId ?? 1,
    quantity: over.quantity ?? new Prisma.Decimal(100),
    acquiredAt: over.acquiredAt ?? now,
    lastInterestAt: over.lastInterestAt ?? null,
    createdAt: over.createdAt ?? now,
    updatedAt: over.updatedAt ?? now,
  };
}

const { wasMethodCalled, findCall } = createRouterTestSetup(HoldingService, makeHolding);

type Ctx = Parameters<typeof holdingRouter.createCaller>[0];

describe("holding.router — CRUD standard", () => {
  it("holding.getAll → appelle service.findAll", async () => {
    const caller = holdingRouter.createCaller({} as Ctx);
    const res = await caller.getAll();
    expect(res).toHaveLength(1);
    expect(wasMethodCalled("findAll")).toBe(true);
  });

  it("holding.getById → appelle service.findOne(id)", async () => {
    const caller = holdingRouter.createCaller({} as Ctx);
    const res = await caller.getById({ id: 7 });
    expect(res).toMatchObject({ id: 7 });
    const hit = findCall("findOne");
    expect(hit?.args).toEqual({ id: 7 });
  });

  it("holding.create → appelle service.create(data)", async () => {
    const caller = holdingRouter.createCaller({} as Ctx);
    const data = { walletId: 1, assetId: 2, gameInstanceId: 1, quantity: 50 };
    const res = await caller.create(data);
    expect(res.id).toBe(123);
    expect(wasMethodCalled("create")).toBe(true);
  });

  it("holding.update → appelle service.update(id, data)", async () => {
    const caller = holdingRouter.createCaller({} as Ctx);
    const res = await caller.update({ id: 99, data: { quantity: 200 } });
    expect(res).toMatchObject({ id: 99 });
    const hit = findCall("update");
    expect(hit).toBeDefined();
    if (hit?.args && "id" in hit.args) {
      expect(hit.args.id).toBe(99);
    }
  });

  it("holding.delete → appelle service.delete(id)", async () => {
    const caller = holdingRouter.createCaller({} as Ctx);
    const res = await caller.delete({ id: 5 });
    expect(res.id).toBe(5);
    const hit = findCall("delete");
    expect(hit?.args).toEqual({ id: 5 });
  });
});

describe("holding.router — Méthodes spéciales", () => {
  const extraCalls: Array<{ method: string; args?: any }> = [];
  const extraOriginal = {
    findByWallet: HoldingService.prototype.findByWallet,
    findByAsset: HoldingService.prototype.findByAsset,
    findByWalletAndAsset: HoldingService.prototype.findByWalletAndAsset,
  };

  beforeEach(() => {
    extraCalls.length = 0;
    HoldingService.prototype.findByWallet = async function (walletId: number) {
      extraCalls.push({ method: "findByWallet", args: { walletId } });
      return [makeHolding(1, { walletId })];
    };
    HoldingService.prototype.findByAsset = async function (assetId: number) {
      extraCalls.push({ method: "findByAsset", args: { assetId } });
      return [makeHolding(1, { assetId })];
    };
    HoldingService.prototype.findByWalletAndAsset = async function (walletId: number, assetId: number) {
      extraCalls.push({ method: "findByWalletAndAsset", args: { walletId, assetId } });
      return makeHolding(1, { walletId, assetId });
    };
  });

  afterEach(() => {
    Object.assign(HoldingService.prototype, extraOriginal);
  });

  it("holding.getByWallet → appelle service.findByWallet(walletId)", async () => {
    const caller = holdingRouter.createCaller({} as Ctx);
    const res = await caller.getByWallet({ walletId: 42 });
    expect(res).toMatchObject([{ walletId: 42 }]);
    const hit = extraCalls.find((c) => c.method === "findByWallet");
    expect(hit?.args).toEqual({ walletId: 42 });
  });

  it("holding.getByAsset → appelle service.findByAsset(assetId)", async () => {
    const caller = holdingRouter.createCaller({} as Ctx);
    const res = await caller.getByAsset({ assetId: 10 });
    expect(res).toMatchObject([{ assetId: 10 }]);
    const hit = extraCalls.find((c) => c.method === "findByAsset");
    expect(hit?.args).toEqual({ assetId: 10 });
  });

  it("holding.getByWalletAndAsset → appelle service.findByWalletAndAsset(walletId, assetId)", async () => {
    const caller = holdingRouter.createCaller({} as Ctx);
    const res = await caller.getByWalletAndAsset({ walletId: 5, assetId: 10 });
    expect(res).toMatchObject({ walletId: 5, assetId: 10 });
    const hit = extraCalls.find((c) => c.method === "findByWalletAndAsset");
    expect(hit?.args).toEqual({ walletId: 5, assetId: 10 });
  });
});

describe("holding.router — Validations Zod", () => {
  it("getById avec id invalide → rejette", async () => {
    const caller = holdingRouter.createCaller({} as Ctx);
    expect(caller.getById({ id: 0 })).rejects.toBeDefined();
  });

  it("delete avec id invalide → rejette", async () => {
    const caller = holdingRouter.createCaller({} as Ctx);
    expect(caller.delete({ id: 0 })).rejects.toBeDefined();
  });
});

describe("holding.router — Méthodes additionnelles", () => {
  const extraMethods = [
    "findByGameInstance",
    "updateQuantity",
    "addQuantity",
    "subtractQuantity",
  ] as const;

  const callsByMethod: Record<string, unknown[][]> = {};
  const originals: Record<string, unknown> = {};

  beforeEach(() => {
    for (const k of Object.keys(callsByMethod)) delete callsByMethod[k];
    for (const m of extraMethods) {
      callsByMethod[m] = [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      originals[m] = (HoldingService.prototype as any)[m];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (HoldingService.prototype as any)[m] = async function (...args: unknown[]) {
        callsByMethod[m]!.push(args);
        return { method: m, args };
      };
    }
  });

  afterEach(() => {
    for (const m of extraMethods) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (HoldingService.prototype as any)[m] = originals[m];
    }
  });

  it("getByGameInstance → findByGameInstance(gameInstanceId)", async () => {
    const caller = holdingRouter.createCaller({} as Ctx);
    await caller.getByGameInstance({ gameInstanceId: 1 });
    expect(callsByMethod.findByGameInstance?.[0]?.[0]).toBe(1);
  });

  it("updateQuantity → updateQuantity(id, quantity)", async () => {
    const caller = holdingRouter.createCaller({} as Ctx);
    await caller.updateQuantity({ id: 1, quantity: 50 });
    expect(callsByMethod.updateQuantity?.[0]).toEqual([1, 50]);
  });

  it("addQuantity → addQuantity(id, amountToAdd)", async () => {
    const caller = holdingRouter.createCaller({} as Ctx);
    await caller.addQuantity({ id: 1, amountToAdd: 10 });
    expect(callsByMethod.addQuantity?.[0]).toEqual([1, 10]);
  });

  it("subtractQuantity → subtractQuantity(id, amountToSubtract)", async () => {
    const caller = holdingRouter.createCaller({} as Ctx);
    await caller.subtractQuantity({ id: 1, amountToSubtract: 5 });
    expect(callsByMethod.subtractQuantity?.[0]).toEqual([1, 5]);
  });
});
