// tests/router/investment.router.test.ts
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { investmentRouter } from "../../src/trpc/routers/investment.router";
import { InvestmentService } from "../../src/trpc/services/investment.service";
import { Prisma } from "@cashou/db-app";

type BuyInput = { walletId: number; assetId: number; amount: number; gameInstanceId: number };
type SellInput = { walletId: number; assetId: number; amount: number; gameInstanceId: number };

type Call =
  | { method: "buy"; args: { input: BuyInput } }
  | { method: "sell"; args: { input: SellInput } }
  | { method: "getPortfolio"; args: { walletId: number; gameInstanceId: number } }
  | { method: "getHoldingWithInterests"; args: { holdingId: number; gameInstanceId: number } }
  | { method: "applyInterestsToAllHoldings"; args: { gameInstanceId: number } };

const calls: Call[] = [];

const original = {
  buy: InvestmentService.prototype.buy,
  sell: InvestmentService.prototype.sell,
  getPortfolio: InvestmentService.prototype.getPortfolio,
  getHoldingWithInterests: InvestmentService.prototype.getHoldingWithInterests,
  applyInterestsToAllHoldings: InvestmentService.prototype.applyInterestsToAllHoldings,
};

beforeEach(() => {
  calls.length = 0;

  InvestmentService.prototype.buy = async function (input: BuyInput): Promise<{ id: number; walletId: number; assetId: number; gameInstanceId: number; quantity: Prisma.Decimal; acquiredAt: Date; lastInterestAt: Date | null; createdAt: Date; updatedAt: Date }> {
    calls.push({ method: "buy", args: { input } });
    return { id: 1, walletId: input.walletId, assetId: input.assetId, gameInstanceId: input.gameInstanceId, quantity: new Prisma.Decimal(input.amount), acquiredAt: new Date(), lastInterestAt: null, createdAt: new Date(), updatedAt: new Date() };
  };

  InvestmentService.prototype.sell = async function (input: SellInput): Promise<{ holding: { id: number; walletId: number; assetId: number; gameInstanceId: number; quantity: Prisma.Decimal; acquiredAt: Date; lastInterestAt: Date | null; createdAt: Date; updatedAt: Date } | null; amountReceived: number; interests: number }> {
    calls.push({ method: "sell", args: { input } });
    return {
      holding: input.amount < 100 ? { id: 1, walletId: input.walletId, assetId: input.assetId, gameInstanceId: input.gameInstanceId, quantity: new Prisma.Decimal(50), acquiredAt: new Date(), lastInterestAt: null, createdAt: new Date(), updatedAt: new Date() } : null,
      amountReceived: input.amount,
      interests: 10,
    };
  };

  InvestmentService.prototype.getPortfolio = async function (walletId: number, gameInstanceId: number): Promise<any> {
    calls.push({ method: "getPortfolio", args: { walletId, gameInstanceId } });
    return {
      items: [{ holding: { id: 1, walletId, assetId: 1, gameInstanceId, quantity: new Prisma.Decimal(100), acquiredAt: new Date(), lastInterestAt: null, createdAt: new Date(), updatedAt: new Date(), asset: {} }, currentValue: 100, interests: 5, totalValue: 105 }],
      totalValue: 10000,
      totalInvested: 9500,
      totalInterests: 500,
      walletBalance: 1000,
      netWorth: 11000,
    };
  };

  InvestmentService.prototype.getHoldingWithInterests = async function (holdingId: number, gameInstanceId: number): Promise<any> {
    calls.push({ method: "getHoldingWithInterests", args: { holdingId, gameInstanceId } });
    return {
      holding: { id: holdingId, walletId: 1, assetId: 1, gameInstanceId, quantity: new Prisma.Decimal(100), acquiredAt: new Date(), lastInterestAt: null, createdAt: new Date(), updatedAt: new Date(), asset: {} },
      currentValue: 100,
      interests: 50,
      totalValue: 10050,
    };
  };

  InvestmentService.prototype.applyInterestsToAllHoldings = async function (gameInstanceId: number): Promise<void> {
    calls.push({ method: "applyInterestsToAllHoldings", args: { gameInstanceId } });
  };
});

afterEach(() => {
  Object.assign(InvestmentService.prototype, original);
});

type Ctx = Parameters<typeof investmentRouter.createCaller>[0];

describe("investment.router — Achat/Vente", () => {
  it("investment.buy → appelle service.buy(input)", async () => {
    const caller = investmentRouter.createCaller({} as Ctx);
    const payload = { walletId: 1, assetId: 2, amount: 1000, gameInstanceId: 1 };
    const res = await caller.buy(payload);
    expect(res).toBeDefined();
    const hit = calls.find((c) => c.method === "buy");
    expect(hit).toBeDefined();
    expect(hit?.args).toMatchObject({ input: payload });
  });

  it("investment.sell → appelle service.sell(input)", async () => {
    const caller = investmentRouter.createCaller({} as Ctx);
    const payload = { walletId: 1, assetId: 2, amount: 500, gameInstanceId: 1 };
    const res = await caller.sell(payload);
    expect(res.holding).toBeDefined();
    expect(res.amountReceived).toBe(500);
    const hit = calls.find((c) => c.method === "sell");
    expect(hit).toBeDefined();
    expect(hit?.args).toMatchObject({ input: payload });
  });
});

describe("investment.router — Portfolio et Intérêts", () => {
  it("investment.getPortfolio → appelle service.getPortfolio(walletId, gameInstanceId)", async () => {
    const caller = investmentRouter.createCaller({} as Ctx);
    const res = await caller.getPortfolio({ walletId: 1, gameInstanceId: 1 });
    expect(res.totalValue).toBe(10000);
    expect(res.items).toHaveLength(1);
    const hit = calls.find((c) => c.method === "getPortfolio");
    expect(hit?.args).toEqual({ walletId: 1, gameInstanceId: 1 });
  });

  it("investment.getHoldingWithInterests → appelle service.getHoldingWithInterests(holdingId, gameInstanceId)", async () => {
    const caller = investmentRouter.createCaller({} as Ctx);
    const res = await caller.getHoldingWithInterests({ holdingId: 1, gameInstanceId: 1 });
    expect(res).toBeDefined();
    if (res) {
      expect(res.interests).toBe(50);
      expect(res.totalValue).toBe(10050);
    }
    const hit = calls.find((c) => c.method === "getHoldingWithInterests");
    expect(hit?.args).toEqual({ holdingId: 1, gameInstanceId: 1 });
  });

  it("investment.applyInterests → appelle service.applyInterestsToAllHoldings(gameInstanceId)", async () => {
    const caller = investmentRouter.createCaller({} as Ctx);
    const res = await caller.applyInterests({ gameInstanceId: 1 });
    expect(res.success).toBe(true);
    const hit = calls.find((c) => c.method === "applyInterestsToAllHoldings");
    expect(hit?.args).toEqual({ gameInstanceId: 1 });
  });
});

describe("investment.router — Validations Zod", () => {
  it("buy avec walletId invalide → rejette", async () => {
    const caller = investmentRouter.createCaller({} as Ctx);
    expect(caller.buy({ walletId: 0, assetId: 1, amount: 10, gameInstanceId: 1 })).rejects.toBeDefined();
  });

  it("sell avec walletId invalide → rejette", async () => {
    const caller = investmentRouter.createCaller({} as Ctx);
    expect(caller.sell({ walletId: 0, assetId: 1, amount: 100, gameInstanceId: 1 })).rejects.toBeDefined();
  });

  it("getPortfolio avec walletId invalide → rejette", async () => {
    const caller = investmentRouter.createCaller({} as Ctx);
    expect(caller.getPortfolio({ walletId: 0, gameInstanceId: 1 })).rejects.toBeDefined();
  });

  it("applyInterests avec gameInstanceId invalide → rejette", async () => {
    const caller = investmentRouter.createCaller({} as Ctx);
    expect(caller.applyInterests({ gameInstanceId: 0 })).rejects.toBeDefined();
  });
});
