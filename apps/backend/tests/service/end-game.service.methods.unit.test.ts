// tests/service/end-game.service.methods.unit.test.ts
// Tests unitaires pour endGame() + branches non couvertes de calculateInterests()
// (via getEndGameResult qui expose indirectement calculateInterests).
import { describe, test, expect, mock, beforeEach } from "bun:test";
import type { PrismaClient } from "@cashou/db-app";

// Mock des dépendances WS avant l'import du service.
mock.module("../../src/ws/game-socket", () => ({
  broadcastToGame: mock(() => {}),
  broadcastGameState: mock(async () => {}),
}));

// Import après le mock pour capter les remplacements.
import { EndGameService } from "../../src/trpc/services/end-game.service";

function makeGameInstance(over: Record<string, unknown> = {}) {
  return {
    id: 100,
    userId: "u1",
    levelId: 1,
    startBalance: 1000,
    createdAt: new Date(Date.now() - 86400_000),
    isEnded: false,
    isPaused: false,
    totalPausedDuration: 0,
    endedAt: null,
    level: {
      id: 1,
      duration: 30,
      speed: 1,
      historyStartDay: 0,
      startBalance: 1000,
      tip: "Astuce",
      levelEvents: [],
      levelGoals: [
        {
          id: 1,
          isMandatory: true,
          goalId: 10,
          goal: {
            id: 10,
            title: "Wallet >= start",
            description: "Conserve",
            goalType: "wallet_gte_start",
            goalValue: 0,
            successMessage: "Bravo objectif atteint",
            failureMessage: "Dommage",
          },
        },
      ],
    },
    wallets: [{ id: 1, amount: "1100" }],
    holdings: [],
    transactions: [],
    ...over,
  };
}

function buildPrisma() {
  const findUnique = mock(async (_a?: unknown): Promise<unknown> => null);
  return {
    gameInstance: {
      findUnique,
      update: mock(async () => ({})),
    },
    assetHistory: {
      findMany: mock(async (): Promise<unknown[]> => []),
    },
    transaction: {
      findMany: mock(async (): Promise<unknown[]> => []),
      create: mock(async () => ({})),
    },
    userLevelCompletion: {
      findUnique: mock(async (): Promise<unknown> => null),
      upsert: mock(async () => ({})),
      create: mock(async () => ({})),
      update: mock(async () => ({})),
    },
    holding: {
      findMany: mock(async (): Promise<unknown[]> => []),
      update: mock(async () => ({})),
    },
    $transaction: mock(async (cb: (tx: unknown) => unknown) => {
      // Fournit le même mock prisma dans la transaction
      return cb({
        gameInstance: {
          findUnique: mock(async () => ({ isEnded: false })),
          update: mock(async () => ({})),
        },
      });
    }),
  };
}

describe("EndGameService.endGame", () => {
  let prisma: ReturnType<typeof buildPrisma>;
  let service: EndGameService;

  beforeEach(() => {
    prisma = buildPrisma();
    service = new EndGameService(prisma as unknown as PrismaClient);
  });

  test("throw si gameInstance introuvable", async () => {
    prisma.gameInstance.findUnique = mock(async () => null);
    await expect(service.endGame(999)).rejects.toThrow(/non trouvée/);
  });

  test("throw si level absent", async () => {
    let call = 0;
    prisma.gameInstance.findUnique = mock(async () => {
      // 1er appel: guard isEnded → 2e appel: chargement complet
      call += 1;
      if (call === 1) return { isEnded: false };
      return { ...makeGameInstance(), level: null };
    });
    await expect(service.endGame(100)).rejects.toThrow(/Aucun niveau/);
  });

  test("throw si wallet absent", async () => {
    let call = 0;
    prisma.gameInstance.findUnique = mock(async () => {
      call += 1;
      if (call === 1) return { isEnded: false };
      return { ...makeGameInstance(), wallets: [] };
    });
    await expect(service.endGame(100)).rejects.toThrow(/Aucun wallet/);
  });

  test("guard: si isEnded déjà, retourne getEndGameResult (read-only)", async () => {
    // Le guard trouve isEnded=true, puis getEndGameResult refait un findUnique.
    let call = 0;
    prisma.gameInstance.findUnique = mock(async () => {
      call += 1;
      if (call === 1) return { isEnded: true };
      // getEndGameResult recharge la partie complète
      return { ...makeGameInstance(), isEnded: true };
    });
    const res = await service.endGame(100);
    expect(res.success).toBe(true);
    // Pas de $transaction (pas de mutation)
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  test("happy path: success=true, marque isEnded via $transaction", async () => {
    let call = 0;
    prisma.gameInstance.findUnique = mock(async () => {
      call += 1;
      if (call === 1) return { isEnded: false };
      return makeGameInstance();
    });
    const res = await service.endGame(100);
    expect(res.success).toBe(true);
    expect(res.modal.type).toBe("PRIMARY_SUCCESS_ONLY");
    expect(res.modal.primaryMessage).toBe("Bravo objectif atteint");
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  test("échec objectif → modal PRIMARY_FAILURE avec tip", async () => {
    let call = 0;
    prisma.gameInstance.findUnique = mock(async () => {
      call += 1;
      if (call === 1) return { isEnded: false };
      return { ...makeGameInstance(), wallets: [{ id: 1, amount: "500" }] };
    });
    const res = await service.endGame(100);
    expect(res.success).toBe(false);
    expect(res.modal.type).toBe("PRIMARY_FAILURE");
    expect(res.modal.tip).toBe("Astuce");
    expect(res.modal.primaryMessage).toBe("Dommage");
  });

  test("success + bonus goal validé → PRIMARY_AND_SECONDARY_SUCCESS", async () => {
    let call = 0;
    const gi = makeGameInstance({
      level: {
        ...makeGameInstance().level,
        levelGoals: [
          {
            id: 1,
            isMandatory: true,
            goalId: 10,
            goal: {
              id: 10,
              title: "Main",
              description: "d",
              goalType: "wallet_gte_start",
              goalValue: 0,
              successMessage: "Objectif principal OK",
              failureMessage: "Objectif principal KO",
            },
          },
          {
            id: 2,
            isMandatory: false,
            goalId: 20,
            goal: {
              id: 20,
              title: "Bonus",
              description: "d",
              goalType: "profit_min",
              goalValue: 5,
              successMessage: "Bonus atteint",
              failureMessage: "Bonus raté",
            },
          },
        ],
      },
    });
    prisma.gameInstance.findUnique = mock(async () => {
      call += 1;
      if (call === 1) return { isEnded: false };
      return gi;
    });
    const res = await service.endGame(100);
    expect(res.success).toBe(true);
    expect(res.modal.type).toBe("PRIMARY_AND_SECONDARY_SUCCESS");
    expect(res.modal.secondaryMessage).toBe("Bonus atteint");
  });

  test("rejette si la partie a été terminée entre le guard et la transaction (race)", async () => {
    let call = 0;
    prisma.gameInstance.findUnique = mock(async () => {
      call += 1;
      if (call === 1) return { isEnded: false };
      return makeGameInstance();
    });
    // Force la transaction interne à trouver isEnded=true
    prisma.$transaction = mock(async (cb: (tx: unknown) => unknown) => {
      return cb({
        gameInstance: {
          findUnique: mock(async () => ({ isEnded: true })),
          update: mock(async () => ({})),
        },
      });
    });
    await expect(service.endGame(100)).rejects.toThrow(/déjà terminée/);
  });
});

describe("EndGameService.calculateInterests (via getEndGameResult)", () => {
  let prisma: ReturnType<typeof buildPrisma>;
  let service: EndGameService;

  beforeEach(() => {
    prisma = buildPrisma();
    service = new EndGameService(prisma as unknown as PrismaClient);
  });

  test("price-based avec BUY transactions — plus-value calculée", async () => {
    prisma.gameInstance.findUnique = mock(async () =>
      makeGameInstance({
        holdings: [
          {
            id: 1,
            quantity: "100",
            acquiredAt: new Date(Date.now() - 3600_000),
            walletId: 1,
            asset: { id: 5, rate: 0, submarketId: 1 },
          },
        ],
      })
    );
    // AssetHistory a une entrée → currentPrice utilisable
    prisma.assetHistory.findMany = mock(async () => [
      { assetId: 5, value: "12000", timestamp: new Date() },
    ]);
    prisma.transaction.findMany = mock(async () => [
      { assetId: 5, quantity: 100, unitPrice: "10000", type: "BUY" },
    ]);
    const res = await service.getEndGameResult(100);
    // Gain = 100 × (12000-10000)/10000 = 20 → assetsValue = 100 + 20 = 120
    expect(res.assetsValue).toBe(120);
  });

  test("rate-based fallback si asset.rate défini et pas de currentPrice", async () => {
    // Pas d'history → getCurrentPrice retourne null → fallback rate
    prisma.gameInstance.findUnique = mock(async () =>
      makeGameInstance({
        holdings: [
          {
            id: 1,
            quantity: "1000",
            acquiredAt: new Date(Date.now() - 3600_000),
            walletId: 1,
            asset: { id: 5, rate: 3.65, submarketId: 1 },
          },
        ],
      })
    );
    prisma.assetHistory.findMany = mock(async () => []);
    prisma.transaction.findMany = mock(async () => []);
    const res = await service.getEndGameResult(100);
    // rate-based fallback → gain > 0 mais très petit sur un delta court
    expect(res.assetsValue).toBeGreaterThanOrEqual(1000);
  });

  test("holdings vides → assetsValue = 0", async () => {
    prisma.gameInstance.findUnique = mock(async () => makeGameInstance({ holdings: [] }));
    const res = await service.getEndGameResult(100);
    expect(res.assetsValue).toBe(0);
    expect(res.totalValue).toBe(1100);
  });
});
