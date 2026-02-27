// tests/router/transaction.router.test.ts
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import type { Transaction } from "@cashou/db-app";
import { Prisma } from "@cashou/db-app";
import { transactionRouter } from "../../src/trpc/routers/transaction.router";
import { TransactionService } from "../../src/trpc/services/transaction.service";
import { createRouterTestSetup } from "../helpers/router-test-factory";

function makeTransaction(id: number, over: Partial<Transaction> = {}): Transaction {
  const now = new Date();
  return {
    id,
    type: over.type ?? "BUY",
    gameInstanceId: over.gameInstanceId ?? 1,
    assetId: over.assetId ?? 1,
    walletId: over.walletId ?? 1,
    quantity: over.quantity ?? 10,
    unitPrice: over.unitPrice ?? new Prisma.Decimal(100),
    totalValue: over.totalValue ?? new Prisma.Decimal(1000),
    transactionDate: over.transactionDate ?? now,
    source: over.source ?? null,
    createdAt: over.createdAt ?? now,
    updatedAt: over.updatedAt ?? now,
  };
}

const { wasMethodCalled, findCall } = createRouterTestSetup(TransactionService, makeTransaction);

type Ctx = Parameters<typeof transactionRouter.createCaller>[0];

describe("transaction.router — CRUD standard", () => {
  it("transaction.getAll → appelle service.findAll", async () => {
    const caller = transactionRouter.createCaller({} as Ctx);
    const res = await caller.getAll();
    expect(res).toHaveLength(1);
    expect(wasMethodCalled("findAll")).toBe(true);
  });

  it("transaction.getById → appelle service.findOne(id)", async () => {
    const caller = transactionRouter.createCaller({} as Ctx);
    const res = await caller.getById({ id: 7 });
    expect(res).toMatchObject({ id: 7 });
    const hit = findCall("findOne");
    expect(hit?.args).toEqual({ id: 7 });
  });

  it("transaction.create → appelle service.create(data)", async () => {
    const caller = transactionRouter.createCaller({} as Ctx);
    const data = { walletId: 1, assetId: 2, type: "SELL", quantity: 5 };
    const res = await caller.create(data);
    expect(res.id).toBe(123);
    expect(wasMethodCalled("create")).toBe(true);
  });

  it("transaction.update → appelle service.update(id, data)", async () => {
    const caller = transactionRouter.createCaller({} as Ctx);
    console.log("Updating transaction 99");
    const res = await caller.update({ id: 99, data: { quantity: 20 } });
    console.log("Transaction Data", res);
    expect(res).toMatchObject({ id: 99 });
    const hit = findCall("update");
    expect(hit).toBeDefined();
    if (hit?.args && "id" in hit.args) {
      expect(hit.args.id).toBe(99);
    }
  });

  it("transaction.delete → appelle service.delete(id)", async () => {
    const caller = transactionRouter.createCaller({} as Ctx);
    const res = await caller.delete({ id: 5 });
    expect(res.id).toBe(5);
    const hit = findCall("delete");
    expect(hit?.args).toEqual({ id: 5 });
  });
});

describe("transaction.router — Méthodes spéciales", () => {
  // Ces méthodes nécessitent des mocks custom car elles ne sont pas dans le helper standard
  const extraCalls: Array<{ method: string; args?: any }> = [];
  const extraOriginal = {
    findByWallet: TransactionService.prototype.findByWallet,
    findByAsset: TransactionService.prototype.findByAsset,
    findByType: TransactionService.prototype.findByType,
    getTotalValueByWallet: TransactionService.prototype.getTotalValueByWallet,
  };

  beforeEach(() => {
    extraCalls.length = 0;
    TransactionService.prototype.findByWallet = async function (walletId: number) {
      extraCalls.push({ method: "findByWallet", args: { walletId } });
      return [makeTransaction(1, { walletId })];
    };
    TransactionService.prototype.findByAsset = async function (assetId: number) {
      extraCalls.push({ method: "findByAsset", args: { assetId } });
      return [makeTransaction(1, { assetId })];
    };
    TransactionService.prototype.findByType = async function (type: string) {
      extraCalls.push({ method: "findByType", args: { type } });
      return [makeTransaction(1, { type })];
    };
    TransactionService.prototype.getTotalValueByWallet = async function (walletId: number) {
      extraCalls.push({ method: "getTotalValueByWallet", args: { walletId } });
      return 5000;
    };
  });

  afterEach(() => {
    Object.assign(TransactionService.prototype, extraOriginal);
  });

  it("transaction.getByWallet → appelle service.findByWallet(walletId)", async () => {
    const caller = transactionRouter.createCaller({} as Ctx);
    const res = await caller.getByWallet({ walletId: 42 });
    expect(res).toMatchObject([{ walletId: 42 }]);
    const hit = extraCalls.find((c) => c.method === "findByWallet");
    expect(hit?.args).toEqual({ walletId: 42 });
  });

  it("transaction.getByAsset → appelle service.findByAsset(assetId)", async () => {
    const caller = transactionRouter.createCaller({} as Ctx);
    const res = await caller.getByAsset({ assetId: 10 });
    expect(res).toMatchObject([{ assetId: 10 }]);
    const hit = extraCalls.find((c) => c.method === "findByAsset");
    expect(hit?.args).toEqual({ assetId: 10 });
  });

  it("transaction.getByType → appelle service.findByType(type)", async () => {
    const caller = transactionRouter.createCaller({} as Ctx);
    const res = await caller.getByType({ type: "SELL" });
    expect(res).toMatchObject([{ type: "SELL" }]);
    const hit = extraCalls.find((c) => c.method === "findByType");
    expect(hit?.args).toEqual({ type: "SELL" });
  });

  it("transaction.getTotalValueByWallet → appelle service.getTotalValueByWallet(walletId)", async () => {
    const caller = transactionRouter.createCaller({} as Ctx);
    const res = await caller.getTotalValueByWallet({ walletId: 7 });
    expect(res).toBe(5000);
    const hit = extraCalls.find((c) => c.method === "getTotalValueByWallet");
    expect(hit?.args).toEqual({ walletId: 7 });
  });
});

describe("transaction.router — Validations Zod", () => {
  it("getById avec id invalide → rejette", async () => {
    const caller = transactionRouter.createCaller({} as Ctx);
    expect(caller.getById({ id: 0 })).rejects.toBeDefined();
  });

  it("update avec id invalide → rejette", async () => {
    const caller = transactionRouter.createCaller({} as Ctx);
    expect(caller.update({ id: -1, data: { quantity: 10 } })).rejects.toBeDefined();
  });

  it("delete avec id invalide → rejette", async () => {
    const caller = transactionRouter.createCaller({} as Ctx);
    expect(caller.delete({ id: 0 })).rejects.toBeDefined();
  });
});
