// tests/router/wallet.router.test.ts
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import type { Wallet } from "@cashou/db-app";
import { Prisma } from "@cashou/db-app";
import { walletRouter } from "../../src/trpc/routers/wallet.router";
import { WalletService } from "../../src/trpc/services/wallet.service";
import { createRouterTestSetup } from "../helpers/router-test-factory";

function makeWallet(id: number, over: Partial<Wallet> = {}): Wallet {
  const now = new Date();
  return {
    id,
    userId: over.userId ?? `user${id}`,
    amount: over.amount ?? new Prisma.Decimal(1000),
    gameInstanceId: over.gameInstanceId ?? 1,
    createdAt: over.createdAt ?? now,
    updatedAt: over.updatedAt ?? now,
  };
}

const { wasMethodCalled, findCall } = createRouterTestSetup(WalletService, makeWallet);

// Méthodes spéciales de WalletService
type ExtraCall =
  | { method: "findByUser"; args: { userId: string } }
  | { method: "findByGameInstance"; args: { gameInstanceId: number } }
  | { method: "updateAmount"; args: { id: number; amount: number } }
  | { method: "addAmount"; args: { id: number; amountToAdd: number } };

const extraCalls: ExtraCall[] = [];
const extraOriginal = {
  findByUser: WalletService.prototype.findByUser,
  findByGameInstance: WalletService.prototype.findByGameInstance,
  updateAmount: WalletService.prototype.updateAmount,
  addAmount: WalletService.prototype.addAmount,
};

beforeEach(() => {
  extraCalls.length = 0;

  WalletService.prototype.findByUser = async function (userId: string): Promise<Wallet[]> {
    extraCalls.push({ method: "findByUser", args: { userId } });
    return [makeWallet(1, { userId })];
  };

  WalletService.prototype.findByGameInstance = async function (gameInstanceId: number): Promise<Wallet[]> {
    extraCalls.push({ method: "findByGameInstance", args: { gameInstanceId } });
    return [makeWallet(1, { gameInstanceId })];
  };

  WalletService.prototype.updateAmount = async function (id: number, amount: number): Promise<Wallet> {
    extraCalls.push({ method: "updateAmount", args: { id, amount } });
    return makeWallet(id, { amount: new Prisma.Decimal(amount) });
  };

  WalletService.prototype.addAmount = async function (id: number, amountToAdd: number): Promise<Wallet> {
    extraCalls.push({ method: "addAmount", args: { id, amountToAdd } });
    return makeWallet(id, { amount: new Prisma.Decimal(1000 + amountToAdd) });
  };
});

afterEach(() => {
  Object.assign(WalletService.prototype, extraOriginal);
});

type Ctx = Parameters<typeof walletRouter.createCaller>[0];

describe("wallet.router — CRUD standard", () => {
  it("wallet.getAll → appelle service.findAll", async () => {
    const caller = walletRouter.createCaller({} as Ctx);
    const res = await caller.getAll();
    expect(res).toMatchObject([{ id: 1, userId: "user1" }]);
    expect(wasMethodCalled("findAll")).toBe(true);
  });

  it("wallet.getById → appelle service.findOne(id)", async () => {
    const caller = walletRouter.createCaller({} as Ctx);
    const res = await caller.getById({ id: 7 });
    expect(res).toMatchObject({ id: 7 });
    const hit = findCall("findOne");
    expect(hit?.args).toEqual({ id: 7 });
  });

  it("wallet.create → appelle service.create(data)", async () => {
    const caller = walletRouter.createCaller({} as Ctx);
    const payload = { userId: "user123", amount: 5000, gameInstanceId: 2 };
    const res = await caller.create(payload);
    expect(res).toMatchObject({ id: 123 });
    expect(wasMethodCalled("create")).toBe(true);
  });

  it("wallet.update → appelle service.update(id, data)", async () => {
    const caller = walletRouter.createCaller({} as Ctx);
    const res = await caller.update({ id: 99, data: { amount: 2000 } });
    expect(res).toMatchObject({ id: 99 });
    const hit = findCall("update");
    expect(hit).toBeDefined();
  });

  it("wallet.delete → appelle service.delete(id)", async () => {
    const caller = walletRouter.createCaller({} as Ctx);
    const res = await caller.delete({ id: 5 });
    expect(res.id).toBe(5);
    const hit = findCall("delete");
    expect(hit?.args).toEqual({ id: 5 });
  });
});

describe("wallet.router — Méthodes spéciales", () => {
  it("wallet.getByUser → appelle service.findByUser(userId)", async () => {
    const caller = walletRouter.createCaller({} as Ctx);
    const res = await caller.getByUser({ userId: "user123" });
    expect(res).toMatchObject([{ userId: "user123" }]);
    const hit = extraCalls.find((c) => c.method === "findByUser");
    expect(hit?.args).toEqual({ userId: "user123" });
  });

  it("wallet.getByGameInstance → appelle service.findByGameInstance(gameInstanceId)", async () => {
    const caller = walletRouter.createCaller({} as Ctx);
    const res = await caller.getByGameInstance({ gameInstanceId: 42 });
    expect(res).toMatchObject([{ gameInstanceId: 42 }]);
    const hit = extraCalls.find((c) => c.method === "findByGameInstance");
    expect(hit?.args).toEqual({ gameInstanceId: 42 });
  });

  it("wallet.updateAmount → appelle service.updateAmount(id, amount)", async () => {
    const caller = walletRouter.createCaller({} as Ctx);
    const res = await caller.updateAmount({ id: 10, amount: 3500 });
    expect(res).toMatchObject({ id: 10 });
    expect(Number(res.amount)).toBe(3500);
    const hit = extraCalls.find((c) => c.method === "updateAmount");
    expect(hit?.args).toEqual({ id: 10, amount: 3500 });
  });

  it("wallet.addAmount → appelle service.addAmount(id, amountToAdd)", async () => {
    const caller = walletRouter.createCaller({} as Ctx);
    const res = await caller.addAmount({ id: 10, amountToAdd: 500 });
    expect(res).toMatchObject({ id: 10 });
    expect(Number(res.amount)).toBe(1500); // 1000 + 500
    const hit = extraCalls.find((c) => c.method === "addAmount");
    expect(hit?.args).toEqual({ id: 10, amountToAdd: 500 });
  });
});

describe("wallet.router — Validations Zod", () => {
  it("getById avec id invalide → rejette", async () => {
    const caller = walletRouter.createCaller({} as Ctx);
    expect(caller.getById({ id: 0 })).rejects.toBeDefined();
  });

  it("updateAmount avec id invalide → rejette", async () => {
    const caller = walletRouter.createCaller({} as Ctx);
    expect(caller.updateAmount({ id: 0, amount: 100 })).rejects.toBeDefined();
  });

  it("addAmount avec id invalide → rejette", async () => {
    const caller = walletRouter.createCaller({} as Ctx);
    expect(caller.addAmount({ id: -1, amountToAdd: 100 })).rejects.toBeDefined();
  });

  it("getByUser avec userId vide → rejette", async () => {
    const caller = walletRouter.createCaller({} as Ctx);
    expect(caller.getByUser({ userId: "" })).rejects.toBeDefined();
  });

  it("getByGameInstance avec gameInstanceId invalide → rejette", async () => {
    const caller = walletRouter.createCaller({} as Ctx);
    expect(caller.getByGameInstance({ gameInstanceId: 0 })).rejects.toBeDefined();
  });
});
