// tests/service/investment.service.methods.unit.test.ts
// Tests unitaires ciblés pour buy / sell / calculateInterests / getPortfolioSnapshot /
// getHoldingWithInterests — chemins nominaux ET erreurs (TRPCError).
import { describe, test, expect, mock, beforeEach } from "bun:test";
import { Prisma } from "@cashou/db-app";
import type { PrismaClient } from "@cashou/db-app";
import { InvestmentService } from "../../src/trpc/services/investment.service";
import { gameCache, computeCache } from "../../src/lib/cache";

type AnyMock = ReturnType<typeof mock>;

function makeWallet(over: Partial<{ id: number; amount: number }> = {}) {
  return {
    id: over.id ?? 10,
    amount: new Prisma.Decimal(over.amount ?? 1000),
  };
}

function makeAsset(over: Partial<{
  id: number;
  maxAmount: number | null;
  minAmount: number | null;
  rate: number | null;
  title: string;
}> = {}) {
  return {
    id: over.id ?? 20,
    title: over.title ?? "Livret A",
    maxAmount: over.maxAmount === null ? null : (over.maxAmount ?? null),
    minAmount: over.minAmount === null ? null : (over.minAmount ?? null),
    rate: over.rate === null ? null : (over.rate ?? 3),
  };
}

function makeGameInstance() {
  return {
    id: 100,
    level: {
      id: 1,
      speed: 1,
      duration: 30,
      historyStartDay: 0,
      // Vides = aucun gating par niveau ni verrou d'actif : tous les actifs restent disponibles.
      levelAssets: [],
      assetUnlocks: [],
    },
    createdAt: new Date(Date.now() - 172800000),
    isPaused: false,
    totalPausedDuration: 0,
  };
}

function createMockPrisma() {
  const txClient = {
    wallet: {
      update: mock(async () => ({})),
      findUnique: mock(async () => makeWallet({ amount: 500 })),
    },
    holding: {
      create: mock(async () => ({ id: 1, asset: makeAsset() })),
      update: mock(async () => ({ id: 1, asset: makeAsset() })),
      delete: mock(async () => ({})),
      findMany: mock(async () => []),
    },
    transaction: {
      create: mock(async () => ({})),
    },
  };

  const prisma = {
    wallet: { findUnique: mock(async (): Promise<unknown | null> => makeWallet()) },
    asset: { findUnique: mock(async (): Promise<unknown | null> => makeAsset()) },
    gameInstance: { findUnique: mock(async (): Promise<unknown | null> => makeGameInstance()) },
    gameInstanceEvent: { findMany: mock(async (): Promise<unknown[]> => []) },
    holding: { findMany: mock(async (): Promise<unknown[]> => []) },
    transaction: { findMany: mock(async (): Promise<unknown[]> => []) },
    $transaction: mock(async (cb: (tx: unknown) => unknown) => cb(txClient)),
    _txClient: txClient,
  };
  return prisma;
}

type MockPrisma = ReturnType<typeof createMockPrisma>;

// Vide les caches LRU singletons avant chaque test pour éviter la pollution
// (getCurrentPrice, findForGame, portfolio sont cachés par (assetId, gameInstanceId)).
beforeEach(() => {
  gameCache.clear();
  computeCache.clear();
});

function buildService(prisma: MockPrisma) {
  const service = new InvestmentService(prisma as unknown as PrismaClient);
  // Stubbing des dépendances pour isoler la logique testée
  const stub = service as unknown as Record<string, unknown>;
  stub.walletService = {
    findOne: mock(async (id: number) => (id === 10 ? makeWallet() : null)),
  };
  stub.holdingService = {
    findByWalletAndAsset: mock(async () => null),
    findByWallet: mock(async () => []),
    findOne: mock(async (id: number) => (id === 1 ? { id: 1, walletId: 10, assetId: 20, gameInstanceId: 100, quantity: new Prisma.Decimal(500), acquiredAt: new Date(), asset: makeAsset() } : null)),
  };
  stub.assetHistoryService = {
    getCurrentPrice: mock(async () => 10000),
    findForGame: mock(async () => []),
    // Vide = aucun changement de taux en cours de partie : le taux reste constant.
    getRateImpacts: mock(async () => []),
  };
  stub.gameTimeService = {
    calculateElapsedTimeSince: mock(() => 86400),
    convertRealSecondsToGameDays: mock(() => 1),
  };
  return service;
}

describe("InvestmentService.buy", () => {
  let prisma: MockPrisma;
  let service: InvestmentService;

  beforeEach(() => {
    prisma = createMockPrisma();
    service = buildService(prisma);
  });

  test("rejette si wallet introuvable", async () => {
    (service as unknown as { walletService: { findOne: AnyMock } }).walletService.findOne = mock(async () => null);
    await expect(
      service.buy({ walletId: 99, assetId: 20, amount: 100, gameInstanceId: 100 })
    ).rejects.toMatchObject({ code: "NOT_FOUND", message: expect.stringMatching(/Portefeuille/) });
  });

  test("rejette si solde insuffisant", async () => {
    (service as unknown as { walletService: { findOne: AnyMock } }).walletService.findOne = mock(async () => makeWallet({ amount: 50 }));
    await expect(
      service.buy({ walletId: 10, assetId: 20, amount: 500, gameInstanceId: 100 })
    ).rejects.toMatchObject({ code: "BAD_REQUEST", message: expect.stringMatching(/Solde insuffisant/) });
  });

  test("rejette si asset introuvable", async () => {
    prisma.asset.findUnique = mock(async () => null);
    await expect(
      service.buy({ walletId: 10, assetId: 20, amount: 100, gameInstanceId: 100 })
    ).rejects.toMatchObject({ code: "NOT_FOUND", message: expect.stringMatching(/Asset/) });
  });

  test("rejette si plafond dépassé", async () => {
    prisma.asset.findUnique = mock(async () => makeAsset({ maxAmount: 100 }));
    await expect(
      service.buy({ walletId: 10, assetId: 20, amount: 200, gameInstanceId: 100 })
    ).rejects.toMatchObject({ code: "BAD_REQUEST", message: expect.stringMatching(/Plafond/) });
  });

  test("rejette si montant < minimum", async () => {
    prisma.asset.findUnique = mock(async () => makeAsset({ minAmount: 100 }));
    await expect(
      service.buy({ walletId: 10, assetId: 20, amount: 50, gameInstanceId: 100 })
    ).rejects.toMatchObject({ code: "BAD_REQUEST", message: expect.stringMatching(/minimum/) });
  });

  test("achat happy path — crée un nouveau holding", async () => {
    await service.buy({ walletId: 10, assetId: 20, amount: 100, gameInstanceId: 100 });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma._txClient.wallet.update).toHaveBeenCalledTimes(1);
    expect(prisma._txClient.holding.create).toHaveBeenCalledTimes(1);
    expect(prisma._txClient.holding.update).not.toHaveBeenCalled();
    expect(prisma._txClient.transaction.create).toHaveBeenCalledTimes(1);
  });

  test("achat existant — met à jour le holding existant", async () => {
    (service as unknown as { holdingService: { findByWalletAndAsset: AnyMock } }).holdingService.findByWalletAndAsset = mock(async () => ({
      id: 5,
      quantity: new Prisma.Decimal(50),
      // buy() calcule les intérêts courus du holding existant, ce qui déréférence holding.asset
      // (la vraie requête inclut la relation).
      asset: makeAsset(),
    }));
    await service.buy({ walletId: 10, assetId: 20, amount: 100, gameInstanceId: 100 });
    expect(prisma._txClient.holding.update).toHaveBeenCalledTimes(1);
    expect(prisma._txClient.holding.create).not.toHaveBeenCalled();
  });

  test("prix marché fallback à 10000 si getCurrentPrice retourne null", async () => {
    (service as unknown as { assetHistoryService: { getCurrentPrice: AnyMock } }).assetHistoryService.getCurrentPrice = mock(async () => null);
    await service.buy({ walletId: 10, assetId: 20, amount: 100, gameInstanceId: 100 });
    const calls = prisma._txClient.transaction.create.mock.calls as unknown as Array<Array<{ data: { unitPrice: unknown } }>>;
    expect(calls[0]).toBeDefined();
    expect(Number(calls[0]![0]!.data.unitPrice)).toBe(10000);
  });
});

describe("InvestmentService.sell", () => {
  let prisma: MockPrisma;
  let service: InvestmentService;

  beforeEach(() => {
    prisma = createMockPrisma();
    service = buildService(prisma);
    (service as unknown as { holdingService: { findByWalletAndAsset: AnyMock } }).holdingService.findByWalletAndAsset = mock(async () => ({
      id: 5,
      walletId: 10,
      assetId: 20,
      gameInstanceId: 100,
      quantity: new Prisma.Decimal(500),
      acquiredAt: new Date(),
      asset: makeAsset(),
    }));
    // Isole du calcul d'intérêts
    (service as unknown as { calculateInterests: () => Promise<number> }).calculateInterests = async () => 0;
  });

  test("rejette si aucun holding", async () => {
    (service as unknown as { holdingService: { findByWalletAndAsset: AnyMock } }).holdingService.findByWalletAndAsset = mock(async () => null);
    await expect(
      service.sell({ walletId: 10, assetId: 20, amount: 100, gameInstanceId: 100 })
    ).rejects.toMatchObject({ code: "NOT_FOUND", message: expect.stringMatching(/holding/) });
  });

  test("rejette si quantité insuffisante", async () => {
    await expect(
      service.sell({ walletId: 10, assetId: 20, amount: 999, gameInstanceId: 100 })
    ).rejects.toMatchObject({ code: "BAD_REQUEST", message: expect.stringMatching(/insuffisante/) });
  });

  test("rejette si gameInstance introuvable", async () => {
    prisma.gameInstance.findUnique = mock(async () => null);
    await expect(
      service.sell({ walletId: 10, assetId: 20, amount: 100, gameInstanceId: 100 })
    ).rejects.toMatchObject({ code: "NOT_FOUND", message: expect.stringMatching(/Instance/) });
  });

  test("vente partielle — met à jour le holding", async () => {
    const result = await service.sell({ walletId: 10, assetId: 20, amount: 100, gameInstanceId: 100 });
    expect(prisma._txClient.holding.update).toHaveBeenCalledTimes(1);
    expect(prisma._txClient.holding.delete).not.toHaveBeenCalled();
    expect(prisma._txClient.wallet.update).toHaveBeenCalledTimes(1);
    expect(result.amountReceived).toBe(100);
    expect(result.interests).toBe(0);
  });

  test("vente totale — supprime le holding", async () => {
    const result = await service.sell({ walletId: 10, assetId: 20, amount: 500, gameInstanceId: 100 });
    expect(prisma._txClient.holding.delete).toHaveBeenCalledTimes(1);
    expect(prisma._txClient.holding.update).not.toHaveBeenCalled();
    expect(result.holding).toBeNull();
  });

  test("vente avec intérêts — amountReceived arrondi supérieur", async () => {
    (service as unknown as { calculateInterests: () => Promise<number> }).calculateInterests = async () => 25;
    const result = await service.sell({ walletId: 10, assetId: 20, amount: 100, gameInstanceId: 100 });
    // proportionalInterests = 100/500 × 25 = 5 → ceil(105) = 105
    expect(result.amountReceived).toBe(105);
    expect(result.interests).toBe(5);
  });
});

describe("InvestmentService.calculateInterests", () => {
  let prisma: MockPrisma;
  let service: InvestmentService;

  beforeEach(() => {
    prisma = createMockPrisma();
    service = buildService(prisma);
  });

  test("retourne 0 si level=null", async () => {
    const holding = { walletId: 10, quantity: new Prisma.Decimal(100), asset: makeAsset(), acquiredAt: new Date() };
    const gi = { ...makeGameInstance(), level: null };
    const result = await service.calculateInterests(holding as never, gi as never);
    expect(result).toBe(0);
  });

  test("retourne 0 si quantity=0", async () => {
    const holding = { walletId: 10, quantity: new Prisma.Decimal(0), asset: makeAsset(), acquiredAt: new Date() };
    const result = await service.calculateInterests(holding as never, makeGameInstance() as never);
    expect(result).toBe(0);
  });

  test("price-based avec BUY transactions — calcul du gain", async () => {
    const holding = { walletId: 10, quantity: new Prisma.Decimal(100), asset: makeAsset(), acquiredAt: new Date() };
    (service as unknown as { assetHistoryService: { getCurrentPrice: AnyMock } }).assetHistoryService.getCurrentPrice = mock(async () => 12000);
    prisma.transaction.findMany = mock(async () => [
      { quantity: 100, unitPrice: new Prisma.Decimal(10000) },
    ]);
    const result = await service.calculateInterests(holding as never, makeGameInstance() as never);
    // returnRate = (12000-10000)/10000 = 0.2, gain = 100 × 0.2 = 20
    expect(result).toBe(20);
  });

  test("price-based sans BUY tx — fallback sur history", async () => {
    const holding = { walletId: 10, quantity: new Prisma.Decimal(100), asset: makeAsset(), acquiredAt: new Date() };
    (service as unknown as { assetHistoryService: { getCurrentPrice: AnyMock; findForGame: AnyMock } }).assetHistoryService.getCurrentPrice = mock(async () => 12000);
    (service as unknown as { assetHistoryService: { findForGame: AnyMock } }).assetHistoryService.findForGame = mock(async () => [
      { value: new Prisma.Decimal(10000) },
    ]);
    const result = await service.calculateInterests(holding as never, makeGameInstance() as never);
    expect(result).toBe(20);
  });

  test("rate-based fallback quand pas de prix", async () => {
    const holding = { walletId: 10, quantity: new Prisma.Decimal(1000), asset: makeAsset({ rate: 3.65 }), acquiredAt: new Date() };
    (service as unknown as { assetHistoryService: { getCurrentPrice: AnyMock } }).assetHistoryService.getCurrentPrice = mock(async () => null);
    const result = await service.calculateInterests(holding as never, makeGameInstance() as never);
    // dailyRate = 3.65/100/365 = 0.0001, 1 game day → gain = 1000 × 0.0001 × 1 = 0.1
    expect(result).toBeCloseTo(0.1, 3);
  });

  test("retourne 0 si ni prix ni rate", async () => {
    const holding = { walletId: 10, quantity: new Prisma.Decimal(100), asset: makeAsset({ rate: null }), acquiredAt: new Date() };
    (service as unknown as { assetHistoryService: { getCurrentPrice: AnyMock } }).assetHistoryService.getCurrentPrice = mock(async () => null);
    const result = await service.calculateInterests(holding as never, makeGameInstance() as never);
    expect(result).toBe(0);
  });
});

describe("InvestmentService.getHoldingWithInterests", () => {
  let prisma: MockPrisma;
  let service: InvestmentService;

  beforeEach(() => {
    prisma = createMockPrisma();
    service = buildService(prisma);
    (service as unknown as { calculateInterests: () => Promise<number> }).calculateInterests = async () => 15;
  });

  test("retourne null si holding introuvable", async () => {
    (service as unknown as { holdingService: { findOne: AnyMock } }).holdingService.findOne = mock(async () => null);
    const result = await service.getHoldingWithInterests(999, 100);
    expect(result).toBeNull();
  });

  test("rejette si gameInstance introuvable", async () => {
    prisma.gameInstance.findUnique = mock(async () => null);
    await expect(service.getHoldingWithInterests(1, 100)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  test("retourne l'item avec intérêts", async () => {
    const result = await service.getHoldingWithInterests(1, 100);
    expect(result).not.toBeNull();
    expect(result!.currentValue).toBe(500);
    expect(result!.interests).toBe(15);
    expect(result!.totalValue).toBe(515);
  });
});

describe("InvestmentService.getPortfolioSnapshot", () => {
  let prisma: MockPrisma;
  let service: InvestmentService;

  beforeEach(() => {
    prisma = createMockPrisma();
    service = buildService(prisma);
  });

  test("agrège correctement deposits (BUY) et withdrawals (SELL) par asset", async () => {
    const holdingWithAsset = {
      id: 1,
      walletId: 10,
      assetId: 20,
      quantity: new Prisma.Decimal(300),
      asset: makeAsset({ title: "Livret A" }),
    };
    (service as unknown as { holdingService: { findByWallet: AnyMock } }).holdingService.findByWallet = mock(async () => [holdingWithAsset]);
    (service as unknown as { calculateInterests: () => Promise<number> }).calculateInterests = async () => 10;
    prisma.transaction.findMany = mock(async () => [
      { assetId: 20, type: "BUY", totalValue: new Prisma.Decimal(200) },
      { assetId: 20, type: "BUY", totalValue: new Prisma.Decimal(100) },
      { assetId: 20, type: "SELL", totalValue: new Prisma.Decimal(50) },
      { assetId: null, type: "BUY", totalValue: new Prisma.Decimal(999) },
    ]);

    const snap = await service.getPortfolioSnapshot(10, 100);
    expect(snap.holdings).toHaveLength(1);
    expect(snap.holdings[0].totalDeposited).toBe(300);
    expect(snap.holdings[0].totalWithdrawn).toBe(50);
    expect(snap.holdings[0].assetName).toBe("Livret A");
    expect(snap.holdings[0].change).toBe(10);
  });
});
