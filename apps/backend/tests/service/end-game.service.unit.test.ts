// tests/service/end-game.service.unit.test.ts
// Tests unitaires — vérifie que endGame utilise $transaction
import { describe, test, expect, mock, beforeEach } from "bun:test";
import { EndGameService } from "../../src/trpc/services/end-game.service";
import type { PrismaClient } from "@cashou/db-app";

function createMockGameInstance() {
  return {
    id: 100,
    startBalance: 1000,
    isEnded: false,
    isPaused: false,
    totalPausedDuration: 0,
    createdAt: new Date(Date.now() - 86400000),
    level: {
      id: 1,
      startBalance: 1000,
      speed: 1,
      duration: 30,
      levelGoals: [
        {
          goal: {
            id: 1,
            title: "Objectif test",
            description: "Ne pas perdre d'argent",
            goalType: "wallet_gte_start",
            goalValue: 0,
          },
        },
      ],
    },
    wallets: [
      { id: 10, amount: "1100" },
    ],
    holdings: [
      {
        id: 1,
        quantity: "500",
        acquiredAt: new Date(Date.now() - 43200000),
        walletId: 10,
        asset: { id: 20, rate: 5.0 },
      },
    ],
  };
}

function createMockPrisma() {
  const gameInstance = createMockGameInstance();

  const txClient = {
    gameInstance: {
      findUnique: mock(async () => gameInstance),
      update: mock(async () => ({ ...gameInstance, isEnded: true })),
    },
  };

  return {
    gameInstance: {
      findUnique: mock(async () => gameInstance),
      update: mock(),
    },
    $transaction: mock(async (cb: Function) => cb(txClient)),
    _txClient: txClient,
  };
}

describe("EndGameService — Transactions atomiques", () => {
  let service: EndGameService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    service = new EndGameService(mockPrisma as unknown as PrismaClient);
  });

  test("endGame utilise $transaction", async () => {
    await service.endGame(100);

    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
  });

  test("endGame lit les données via tx (pas this.prisma)", async () => {
    await service.endGame(100);

    expect(mockPrisma._txClient.gameInstance.findUnique).toHaveBeenCalledTimes(1);
    // this.prisma.gameInstance.findUnique ne doit PAS être appelé
    expect(mockPrisma.gameInstance.findUnique).not.toHaveBeenCalled();
  });

  test("endGame marque la partie comme terminée via tx", async () => {
    await service.endGame(100);

    expect(mockPrisma._txClient.gameInstance.update).toHaveBeenCalledWith({
      where: { id: 100 },
      data: {
        isEnded: true,
        endedAt: expect.any(Date),
      },
    });
  });

  test("endGame n'utilise PAS this.prisma pour l'update", async () => {
    await service.endGame(100);

    expect(mockPrisma.gameInstance.update).not.toHaveBeenCalled();
  });

  test("endGame retourne le résultat avec les calculs corrects", async () => {
    const result = await service.endGame(100);

    expect(result.gameInstanceId).toBe(100);
    expect(result.startBalance).toBe(1000);
    expect(result.walletBalance).toBe(1100);
    expect(result.goals).toHaveLength(1);
    // totalValue = walletBalance (1100) + assets (500 + intérêts)
    expect(result.totalValue).toBeGreaterThan(1100);
  });

  test("endGame throw si gameInstance introuvable", async () => {
    (mockPrisma._txClient.gameInstance.findUnique as any).mockResolvedValue(null);

    expect(service.endGame(999)).rejects.toThrow("non trouvée");
  });

  test("endGame throw si pas de wallet", async () => {
    const gi = createMockGameInstance();
    gi.wallets = [];
    (mockPrisma._txClient.gameInstance.findUnique as any).mockResolvedValue(gi);

    expect(service.endGame(100)).rejects.toThrow("Aucun wallet");
  });
});
