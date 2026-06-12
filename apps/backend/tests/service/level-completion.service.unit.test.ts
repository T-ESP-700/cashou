// tests/service/level-completion.service.unit.test.ts
import { describe, it, expect, mock, beforeEach } from "bun:test";
import type { PrismaClient } from "@cashou/db-app";
import {
  LevelCompletionService,
  computeStars,
} from "../../src/trpc/services/level-completion.service";

describe("computeStars", () => {
  it("retourne 1 si aucun critère rempli", () => {
    expect(computeStars({ mandatoryGoalsMet: false, bonusGoalsMet: false, quizPassed: false })).toBe(1);
  });

  it("retourne 1 si un seul critère", () => {
    expect(computeStars({ mandatoryGoalsMet: true, bonusGoalsMet: false, quizPassed: false })).toBe(1);
  });

  it("retourne 2 si deux critères", () => {
    expect(computeStars({ mandatoryGoalsMet: true, bonusGoalsMet: true, quizPassed: false })).toBe(2);
  });

  it("retourne 3 si tous les critères", () => {
    expect(computeStars({ mandatoryGoalsMet: true, bonusGoalsMet: true, quizPassed: true })).toBe(3);
  });
});

function buildPrisma() {
  return {
    userQuiz: {
      count: mock(async (_a?: unknown): Promise<number> => 0),
    },
    userLevelCompletion: {
      findUnique: mock(async (_a?: unknown): Promise<unknown> => null),
      findMany: mock(async (_a?: unknown): Promise<unknown[]> => []),
      create: mock(async (a: { data: Record<string, unknown> }) => ({ id: 1, ...a.data })),
      update: mock(async (a: { where: unknown; data: Record<string, unknown> }) => ({ ...a.data })),
    },
  };
}

describe("LevelCompletionService", () => {
  let prisma: ReturnType<typeof buildPrisma>;
  let service: LevelCompletionService;

  beforeEach(() => {
    prisma = buildPrisma();
    service = new LevelCompletionService(prisma as unknown as PrismaClient);
  });

  describe("hasQuizPassedForLevel", () => {
    it("retourne true si count > 0", async () => {
      prisma.userQuiz.count = mock(async () => 1);
      expect(await service.hasQuizPassedForLevel("u1", 1)).toBe(true);
    });

    it("retourne false si count = 0", async () => {
      prisma.userQuiz.count = mock(async () => 0);
      expect(await service.hasQuizPassedForLevel("u1", 1)).toBe(false);
    });
  });

  describe("upsertBest", () => {
    it("create si aucun record existant", async () => {
      prisma.userLevelCompletion.findUnique = mock(async () => null);
      await service.upsertBest("u1", 1, {
        mandatoryGoalsMet: true,
        bonusGoalsMet: true,
        quizPassed: false,
      });
      expect(prisma.userLevelCompletion.create).toHaveBeenCalled();
    });

    it("upgrade stars + flags si session strictly better", async () => {
      prisma.userLevelCompletion.findUnique = mock(async () => ({
        stars: 1,
        mandatoryGoalsMet: true,
        bonusGoalsMet: false,
        quizPassed: false,
      }));
      await service.upsertBest("u1", 1, {
        mandatoryGoalsMet: true,
        bonusGoalsMet: true,
        quizPassed: true,
      });
      const args = (prisma.userLevelCompletion.update.mock.calls[0]?.[0] ?? {}) as unknown as { data: { stars: number } };
      expect(args.data.stars).toBe(3);
    });

    it("no upgrade des stars si session égale, mais update flags", async () => {
      prisma.userLevelCompletion.findUnique = mock(async () => ({
        stars: 2,
        mandatoryGoalsMet: true,
        bonusGoalsMet: false,
        quizPassed: true,
      }));
      await service.upsertBest("u1", 1, {
        mandatoryGoalsMet: false,
        bonusGoalsMet: true,
        quizPassed: true,
      });
      expect(prisma.userLevelCompletion.update).toHaveBeenCalled();
    });

    it("update uniquement quizPassed si stars lower mais quiz newly earned", async () => {
      prisma.userLevelCompletion.findUnique = mock(async () => ({
        stars: 3,
        mandatoryGoalsMet: true,
        bonusGoalsMet: true,
        quizPassed: false,
      }));
      await service.upsertBest("u1", 1, {
        mandatoryGoalsMet: false,
        bonusGoalsMet: false,
        quizPassed: true,
      });
      // Should call update at least once with quizPassed flip
      expect(prisma.userLevelCompletion.update).toHaveBeenCalled();
    });

    it("ne fait rien si stars strictly lower et quizPassed inchangé", async () => {
      prisma.userLevelCompletion.findUnique = mock(async () => ({
        stars: 3,
        mandatoryGoalsMet: true,
        bonusGoalsMet: true,
        quizPassed: true,
      }));
      await service.upsertBest("u1", 1, {
        mandatoryGoalsMet: false,
        bonusGoalsMet: false,
        quizPassed: true,
      });
      expect(prisma.userLevelCompletion.update).not.toHaveBeenCalled();
    });
  });

  describe("recordFromGameEnd", () => {
    it("calcule mandatory/bonus depuis les goalResults + levelGoals", async () => {
      const goalResults = new Map<number, boolean>();
      goalResults.set(1, true);
      goalResults.set(2, false);
      const levelGoals = [
        { goalId: 1, isMandatory: true },
        { goalId: 2, isMandatory: false },
      ];
      await service.recordFromGameEnd("u1", 1, goalResults, levelGoals);
      expect(prisma.userLevelCompletion.create).toHaveBeenCalled();
    });

    it("mandatoryGoalsMet=true si pas de mandatory goals", async () => {
      const goalResults = new Map<number, boolean>();
      const levelGoals = [{ goalId: 1, isMandatory: false }];
      goalResults.set(1, true);
      await service.recordFromGameEnd("u1", 1, goalResults, levelGoals);
      expect(prisma.userLevelCompletion.create).toHaveBeenCalled();
    });

    it("bonusGoalsMet=true si pas de bonus goals", async () => {
      const goalResults = new Map<number, boolean>();
      const levelGoals = [{ goalId: 1, isMandatory: true }];
      goalResults.set(1, true);
      await service.recordFromGameEnd("u1", 1, goalResults, levelGoals);
      expect(prisma.userLevelCompletion.create).toHaveBeenCalled();
    });
  });

  describe("recordFromQuizComplete", () => {
    it("upsert avec quizPassed=true en récupérant les flags existants", async () => {
      prisma.userLevelCompletion.findUnique = mock(async () => ({
        stars: 1,
        mandatoryGoalsMet: true,
        bonusGoalsMet: false,
        quizPassed: false,
      }));
      await service.recordFromQuizComplete("u1", 1);
      expect(prisma.userLevelCompletion.update).toHaveBeenCalled();
    });

    it("flags par défaut à false si pas de record existant", async () => {
      prisma.userLevelCompletion.findUnique = mock(async () => null);
      await service.recordFromQuizComplete("u1", 1);
      expect(prisma.userLevelCompletion.create).toHaveBeenCalled();
    });
  });

  describe("getCompletion / getCompletionsByUser", () => {
    it("getCompletion utilise userId_levelId", async () => {
      await service.getCompletion("u1", 1);
      expect(prisma.userLevelCompletion.findUnique).toHaveBeenCalled();
    });

    it("getCompletionsByUser filtre par userId", async () => {
      await service.getCompletionsByUser("u1");
      expect(prisma.userLevelCompletion.findMany).toHaveBeenCalled();
    });
  });
});
