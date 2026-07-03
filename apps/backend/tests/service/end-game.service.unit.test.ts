// tests/service/end-game.service.unit.test.ts
// Tests pour la méthode getEndGameResult (recalcul read-only).
import { describe, test, expect, mock, beforeEach } from "bun:test";
import type { PrismaClient } from "@cashou/db-app";
import { EndGameService } from "../../src/trpc/services/end-game.service";

function buildPrisma() {
  return {
    gameInstance: {
      findUnique: mock(async (_a?: unknown): Promise<unknown> => null),
    },
    assetHistory: {
      findMany: mock(async (_a?: unknown): Promise<unknown[]> => []),
    },
    transaction: {
      findMany: mock(async (_a?: unknown): Promise<unknown[]> => []),
    },
    userLevelCompletion: {
      findUnique: mock(async (_a?: unknown): Promise<unknown> => null),
    },
  };
}

function makeGameInstance(over: Record<string, unknown> = {}) {
  return {
    id: 100,
    userId: "u1",
    levelId: 1,
    startBalance: 1000,
    createdAt: new Date(Date.now() - 86400_000),
    isEnded: true,
    isPaused: false,
    totalPausedDuration: 0,
    endedAt: new Date(),
    level: {
      id: 1,
      duration: 30,
      speed: 1,
      historyStartDay: 0,
      startBalance: 1000,
      tip: "Astuce",
      levelGoals: [
        {
          id: 1,
          isMandatory: true,
          goal: {
            id: 10,
            title: "Wallet >= start",
            description: "Conserve ton capital",
            goalType: "wallet_gte_start",
            goalValue: 0,
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

describe("EndGameService — getEndGameResult", () => {
  let prisma: ReturnType<typeof buildPrisma>;
  let service: EndGameService;

  beforeEach(() => {
    prisma = buildPrisma();
    service = new EndGameService(prisma as unknown as PrismaClient);
  });

  test("throw si gameInstance introuvable", async () => {
    prisma.gameInstance.findUnique = mock(async () => null);
    expect(service.getEndGameResult(999)).rejects.toThrow("non trouvée");
  });

  test("throw si pas de level associé", async () => {
    prisma.gameInstance.findUnique = mock(async () => ({ ...makeGameInstance(), level: null }));
    expect(service.getEndGameResult(100)).rejects.toThrow("Aucun niveau");
  });

  test("throw si pas de wallet", async () => {
    prisma.gameInstance.findUnique = mock(async () => ({ ...makeGameInstance(), wallets: [] }));
    expect(service.getEndGameResult(100)).rejects.toThrow("Aucun wallet");
  });

  test("retourne success=true si objectifs validés", async () => {
    prisma.gameInstance.findUnique = mock(async () => makeGameInstance());
    const res = await service.getEndGameResult(100);
    expect(res.success).toBe(true);
    expect(res.gameInstanceId).toBe(100);
    expect(res.walletBalance).toBe(1100);
    expect(res.modal.type).toBe("PRIMARY_SUCCESS_ONLY");
    expect(res.modal.tip).toBe("Astuce");
  });

  test("retourne success=false si objectifs non atteints", async () => {
    prisma.gameInstance.findUnique = mock(async () => ({
      ...makeGameInstance(),
      wallets: [{ id: 1, amount: "500" }], // moins que startBalance
    }));
    const res = await service.getEndGameResult(100);
    expect(res.success).toBe(false);
    expect(res.modal.type).toBe("PRIMARY_FAILURE");
  });

  test("inclut les données de LevelCompletion si présente", async () => {
    prisma.gameInstance.findUnique = mock(async () => makeGameInstance());
    prisma.userLevelCompletion.findUnique = mock(async () => ({
      stars: 2,
      mandatoryGoalsMet: true,
      bonusGoalsMet: false,
      quizPassed: true,
    }));
    const res = await service.getEndGameResult(100);
    expect((res as { stars?: number }).stars).toBe(2);
    expect((res as { quizPassed?: boolean }).quizPassed).toBe(true);
  });

  test("agrège les holdings dans assetsValue", async () => {
    prisma.gameInstance.findUnique = mock(async () => ({
      ...makeGameInstance(),
      holdings: [
        {
          id: 1,
          quantity: "200",
          acquiredAt: new Date(Date.now() - 3600_000),
          walletId: 1,
          asset: { id: 5, rate: 0, submarketId: 1 },
        },
      ],
    }));
    const res = await service.getEndGameResult(100);
    expect(res.assetsValue).toBeGreaterThanOrEqual(200);
    expect(res.totalValue).toBeGreaterThanOrEqual(1300);
  });

  test("ignore les goals sans objet goal", async () => {
    prisma.gameInstance.findUnique = mock(async () => ({
      ...makeGameInstance(),
      level: {
        ...makeGameInstance().level,
        levelGoals: [
          { id: 1, isMandatory: true, goal: null },
          {
            id: 2,
            isMandatory: true,
            goal: { id: 20, title: "G", description: "d", goalType: "wallet_min", goalValue: 100 },
          },
        ],
      },
    }));
    const res = await service.getEndGameResult(100);
    expect(res.goals).toHaveLength(1);
  });

  test("goal sans titre → 'Objectif sans titre'", async () => {
    prisma.gameInstance.findUnique = mock(async () => ({
      ...makeGameInstance(),
      level: {
        ...makeGameInstance().level,
        levelGoals: [
          {
            id: 1,
            isMandatory: true,
            goal: { id: 10, title: null, description: null, goalType: "wallet_gte_start", goalValue: 0 },
          },
        ],
      },
    }));
    const res = await service.getEndGameResult(100);
    expect(res.goals[0].title).toBe("Objectif sans titre");
  });
});
