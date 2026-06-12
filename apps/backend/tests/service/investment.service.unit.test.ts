// tests/service/investment.service.unit.test.ts
// Tests unitaires — vérifie que applyInterestsToAllHoldings utilise $transaction
import { describe, test, expect, mock, beforeEach } from "bun:test";
import { InvestmentService } from "../../src/trpc/services/investment.service";
import type { PrismaClient } from "@cashou/db-app";

function createMockPrisma() {
  const mockHoldings = [
    {
      id: 1,
      walletId: 10,
      assetId: 20,
      gameInstanceId: 100,
      quantity: { toString: () => "1000" },
      acquiredAt: new Date(Date.now() - 86400000),
      asset: { id: 20, rate: 5.0 },
    },
    {
      id: 2,
      walletId: 10,
      assetId: 21,
      gameInstanceId: 100,
      quantity: { toString: () => "500" },
      acquiredAt: new Date(Date.now() - 86400000),
      asset: { id: 21, rate: 3.0 },
    },
  ];

  const txClient = {
    holding: {
      findMany: mock(async () => mockHoldings),
      update: mock(async () => ({})),
    },
    transaction: {
      create: mock(async () => ({})),
    },
  };

  return {
    gameInstance: {
      findUnique: mock(async () => ({
        id: 100,
        level: {
          id: 1,
          speed: 1,
          duration: 30,
        },
        createdAt: new Date(Date.now() - 172800000), // 2 jours avant
        isPaused: false,
        totalPausedDuration: 0,
      })),
      update: mock(),
      create: mock(),
    },
    holding: {
      findMany: mock(async () => mockHoldings),
      update: mock(),
    },
    wallet: {
      findUnique: mock(),
      findMany: mock(),
      update: mock(),
      create: mock(),
    },
    asset: {
      findUnique: mock(),
    },
    transaction: {
      create: mock(),
    },
    $transaction: mock(async (cb: Function) => cb(txClient)),
    _txClient: txClient,
    _mockHoldings: mockHoldings,
  };
}

describe("InvestmentService — Transactions atomiques", () => {
  let service: InvestmentService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    service = new InvestmentService(mockPrisma as unknown as PrismaClient);
    // Stub calculateInterests pour isoler le test du calcul (qui dépend d'assetHistory/transactions).
    // Ici on vérifie uniquement l'utilisation de $transaction pour les écritures.
    (service as unknown as { calculateInterests: () => Promise<number> }).calculateInterests = async () => 10;
  });

  test("applyInterestsToAllHoldings utilise $transaction", async () => {
    await service.applyInterestsToAllHoldings(100);

    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
  });

  test("applyInterestsToAllHoldings met à jour les holdings via tx", async () => {
    await service.applyInterestsToAllHoldings(100);

    const tx = mockPrisma._txClient;
    // 2 holdings avec rate > 0, donc 2 updates + 2 creates
    expect(tx.holding.update).toHaveBeenCalledTimes(2);
    expect(tx.transaction.create).toHaveBeenCalledTimes(2);
  });

  test("applyInterestsToAllHoldings n'utilise PAS this.prisma pour les écritures", async () => {
    await service.applyInterestsToAllHoldings(100);

    // Les écritures ne doivent PAS passer par this.prisma directement
    expect(mockPrisma.holding.update).not.toHaveBeenCalled();
    expect(mockPrisma.transaction.create).not.toHaveBeenCalled();
  });

  test("applyInterestsToAllHoldings ne fait rien si gameInstance inexistante", async () => {
    (mockPrisma.gameInstance.findUnique as any).mockResolvedValue(null);

    await service.applyInterestsToAllHoldings(999);

    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });
});
