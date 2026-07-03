// tests/service/user-quiz.service.unit.test.ts
import { describe, it, expect, mock, beforeEach } from "bun:test";
import type { UserQuiz, PrismaClient } from "@cashou/db-app";
import { UserQuizService } from "../../src/trpc/services/user-quiz.service";
import { createServiceTestSetup } from "../helpers/service-test-factory";

function makeUserQuiz(id: number, over: Partial<UserQuiz> = {}): UserQuiz {
  const now = new Date();
  return {
    id,
    quizId: over.quizId ?? 1,
    userId: over.userId ?? "user1",
    gameInstanceId: over.gameInstanceId ?? null,
    completedAt: over.completedAt ?? null,
    isCorrect: over.isCorrect ?? null,
    createdAt: over.createdAt ?? now,
    updatedAt: over.updatedAt ?? now,
  };
}

describe("UserQuizService — Tests unitaires", () => {
  const { service, wasMethodCalled } = createServiceTestSetup(
    UserQuizService,
    makeUserQuiz,
    "userQuiz"
  );

  it("findAll retourne tous les user-quiz", async () => {
    const result = await service.findAll();
    expect(result).toHaveLength(1);
    expect(wasMethodCalled("findMany")).toBeTrue();
  });

  it("findOne retourne un user-quiz par ID", async () => {
    const result = await service.findOne(7);
    expect(result).toMatchObject({ id: 7 });
    expect(wasMethodCalled("findUnique")).toBeTrue();
  });

  it("create crée un nouveau user-quiz", async () => {
    const data = { quizId: 1, userId: "user1" };
    const result = await service.create(data);
    expect(result.id).toBe(123);
    expect(wasMethodCalled("create")).toBeTrue();
  });

  it("update met à jour un user-quiz", async () => {
    const result = await service.update(5, { isCorrect: true });
    expect(result.id).toBe(5);
    expect(wasMethodCalled("update")).toBeTrue();
  });

  it("delete supprime un user-quiz", async () => {
    const result = await service.delete(10);
    expect(result.id).toBe(10);
    expect(wasMethodCalled("delete")).toBeTrue();
  });
});

// ---------------------------------------------------------------------------
// Tests intensifs des méthodes spécialisées : findBy*, startQuiz,
// createOrUpdateParticipation, completeQuiz, stats, leaderboard, streaks…
// ---------------------------------------------------------------------------

function buildPrisma() {
  const tx = {
    userQuiz: {
      findFirst: mock(async (_a?: unknown): Promise<unknown> => null),
      create: mock(async (a: { data: Record<string, unknown> }) => ({ id: 1, ...a.data })),
      update: mock(async (a: { where: { id: number }; data: Record<string, unknown> }) => ({ id: a.where.id, ...a.data })),
    },
    quiz: {
      findUnique: mock(async (_a?: unknown): Promise<unknown> => null),
    },
    quizQuestion: {
      findMany: mock(async (_a?: unknown): Promise<unknown[]> => []),
    },
    userAnswer: {
      findMany: mock(async (_a?: unknown): Promise<unknown[]> => []),
    },
    user: {
      findUnique: mock(async (_a?: unknown): Promise<unknown> => null),
      update: mock(async (a: { where: { id: string }; data: Record<string, unknown> }) => ({ id: a.where.id, ...a.data })),
    },
  };
  const prisma = {
    userQuiz: {
      findFirst: mock(async (_a?: unknown): Promise<unknown> => null),
      findUnique: mock(async (_a?: unknown): Promise<unknown> => null),
      findMany: mock(async (_a?: unknown): Promise<unknown[]> => []),
      count: mock(async (_a?: unknown): Promise<number> => 0),
      create: mock(async (a: { data: Record<string, unknown> }) => ({ id: 1, ...a.data })),
      update: mock(async (a: { where: { id: number }; data: Record<string, unknown> }) => ({ id: a.where.id, ...a.data })),
      delete: mock(async (a: { where: { id: number } }) => ({ id: a.where.id })),
    },
    quiz: {
      findUnique: mock(async (_a?: unknown): Promise<unknown> => null),
      findMany: mock(async (_a?: unknown): Promise<unknown[]> => []),
    },
    quizQuestion: {
      findMany: mock(async (_a?: unknown): Promise<unknown[]> => []),
    },
    answer: {
      findUnique: mock(async (_a?: unknown): Promise<unknown> => null),
    },
    userAnswer: {
      create: mock(async (a: { data: Record<string, unknown> }) => ({ id: 1, ...a.data })),
      findMany: mock(async (_a?: unknown): Promise<unknown[]> => []),
    },
    user: {
      findUnique: mock(async (_a?: unknown): Promise<unknown> => null),
      update: mock(async (a: { where: { id: string }; data: Record<string, unknown> }) => ({ id: a.where.id, ...a.data })),
    },
    levelStarUserAchievement: {
      upsert: mock(async () => ({})),
    },
    userLevelCompletion: {
      upsert: mock(async () => ({})),
      findUnique: mock(async (): Promise<unknown> => null),
    },
    $transaction: mock(async (cb: (t: typeof tx) => Promise<unknown>) => cb(tx)),
    _tx: tx,
  };
  return prisma;
}

describe("UserQuizService — Méthodes spécialisées", () => {
  let prisma: ReturnType<typeof buildPrisma>;
  let service: UserQuizService;

  beforeEach(() => {
    prisma = buildPrisma();
    service = new UserQuizService(prisma as unknown as PrismaClient);
  });

  describe("findByUser / findByQuiz / findByResult", () => {
    it("findByUser convertit userId en string", async () => {
      await service.findByUser(42);
      const args = (prisma.userQuiz.findMany.mock.calls[0]?.[0] ?? {}) as { where: { userId: string } };
      expect(args.where.userId).toBe("42");
    });

    it("findByQuiz filtre par quizId", async () => {
      await service.findByQuiz(7);
      const args = (prisma.userQuiz.findMany.mock.calls[0]?.[0] ?? {}) as { where: { quizId: number } };
      expect(args.where.quizId).toBe(7);
    });

    it("findByResult filtre par isCorrect", async () => {
      await service.findByResult(true);
      const args = (prisma.userQuiz.findMany.mock.calls[0]?.[0] ?? {}) as { where: { isCorrect: boolean } };
      expect(args.where.isCorrect).toBe(true);
    });
  });

  describe("startQuiz", () => {
    it("crée une nouvelle participation si aucune existante", async () => {
      prisma.userQuiz.findFirst = mock(async () => null);
      await service.startQuiz(1, "user1");
      expect(prisma.userQuiz.create).toHaveBeenCalledTimes(1);
    });

    it("throw si participation existante", async () => {
      prisma.userQuiz.findFirst = mock(async () => makeUserQuiz(1));
      expect(service.startQuiz(1, "user1")).rejects.toThrow("déjà participé");
    });
  });

  describe("createOrUpdateParticipation", () => {
    it("crée une nouvelle participation si aucune", async () => {
      prisma._tx.userQuiz.findFirst = mock(async () => null);
      prisma._tx.userQuiz.create = mock(async (a: { data: Record<string, unknown> }) => ({ id: 1, ...a.data }));
      await service.createOrUpdateParticipation(1, "user1", true);
      expect(prisma._tx.userQuiz.create).toHaveBeenCalledTimes(1);
    });

    it("met à jour la participation existante", async () => {
      prisma._tx.userQuiz.findFirst = mock(async () => makeUserQuiz(5, { isCorrect: null }));
      await service.createOrUpdateParticipation(1, "user1", true);
      expect(prisma._tx.userQuiz.update).toHaveBeenCalledTimes(1);
    });
  });

  describe("completeQuiz", () => {
    it("met à jour isCorrect et completedAt", async () => {
      prisma.userQuiz.update = mock(async () => ({ ...makeUserQuiz(1), quiz: { levelId: null } }));
      await service.completeQuiz(1, true);
      const args = (prisma.userQuiz.update.mock.calls[0]?.[0] ?? {}) as unknown as { data: { isCorrect: boolean; completedAt: Date } };
      expect(args.data.isCorrect).toBe(true);
      expect(args.data.completedAt).toBeInstanceOf(Date);
    });
  });

  describe("hasUserParticipated", () => {
    it("retourne true si une participation existe", async () => {
      prisma.userQuiz.findFirst = mock(async () => makeUserQuiz(1));
      expect(await service.hasUserParticipated(1, "u1")).toBe(true);
    });

    it("retourne false si aucune participation", async () => {
      prisma.userQuiz.findFirst = mock(async () => null);
      expect(await service.hasUserParticipated(1, "u1")).toBe(false);
    });
  });

  describe("getUserStats / getQuizStats", () => {
    it("getUserStats agrège total, completed, correct", async () => {
      prisma.userQuiz.count = mock(async (a?: unknown): Promise<number> => {
        const where = (a as { where?: Record<string, unknown> } | undefined)?.where ?? {};
        if (where.completedAt) return 8;
        if (where.isCorrect === true) return 6;
        return 10;
      });
      const res = await service.getUserStats("u1");
      expect(res.total).toBe(10);
      expect(res.completed).toBe(8);
      expect(res.correct).toBe(6);
      expect(res.incorrect).toBe(2);
      expect(res.successRate).toBe(75);
    });

    it("getQuizStats retourne 0% si pas de complétions", async () => {
      prisma.userQuiz.count = mock(async () => 0);
      const res = await service.getQuizStats(1);
      expect(res.successRate).toBe(0);
    });
  });

  describe("getStatus", () => {
    it("retourne started=false si pas de participation", async () => {
      prisma.userQuiz.findFirst = mock(async () => null);
      const res = await service.getStatus("u1", 1);
      expect(res.started).toBe(false);
      expect(res.progress).toBe(0);
    });

    it("retourne completed=true + progress=100 si quiz terminé", async () => {
      prisma.userQuiz.findFirst = mock(async () => makeUserQuiz(1, { completedAt: new Date(), isCorrect: true }));
      const res = await service.getStatus("u1", 1);
      expect(res.completed).toBe(true);
      expect(res.progress).toBe(100);
    });

    it("retourne progress=50 si quiz en cours", async () => {
      prisma.userQuiz.findFirst = mock(async () => makeUserQuiz(1, { completedAt: null }));
      const res = await service.getStatus("u1", 1);
      expect(res.progress).toBe(50);
    });
  });

  describe("getInProgressByUser / abandonQuiz", () => {
    it("getInProgressByUser filtre completedAt=null", async () => {
      await service.getInProgressByUser("u1");
      const args = (prisma.userQuiz.findMany.mock.calls[0]?.[0] ?? {}) as { where: { completedAt: null } };
      expect(args.where.completedAt).toBeNull();
    });

    it("abandonQuiz supprime la participation", async () => {
      await service.abandonQuiz(42);
      expect(prisma.userQuiz.delete).toHaveBeenCalledTimes(1);
    });
  });

  describe("resumeQuiz", () => {
    it("retourne la participation avec quiz et questions", async () => {
      const participation = { ...makeUserQuiz(1), quiz: { quizQuestions: [] } };
      prisma.userQuiz.findFirst = mock(async () => participation);
      const res = await service.resumeQuiz("u1", 1);
      expect(res as unknown).toBe(participation);
    });

    it("throw si aucun quiz en cours", async () => {
      prisma.userQuiz.findFirst = mock(async () => null);
      expect(service.resumeQuiz("u1", 1)).rejects.toThrow("Aucun quiz en cours");
    });
  });

  describe("getHistoryByUser", () => {
    it("retourne history + pagination", async () => {
      prisma.userQuiz.findMany = mock(async () => [makeUserQuiz(1, { completedAt: new Date() })]);
      prisma.userQuiz.count = mock(async () => 50);
      const res = await service.getHistoryByUser("u1", 20, 0);
      expect(res.history).toHaveLength(1);
      expect(res.pagination.total).toBe(50);
      expect(res.pagination.hasMore).toBe(true);
    });
  });

  describe("getElapsedTime", () => {
    it("retourne elapsedMinutes et elapsedSeconds", async () => {
      const createdAt = new Date(Date.now() - 5 * 60_000);
      prisma.userQuiz.findUnique = mock(async () => makeUserQuiz(1, { createdAt }));
      const res = await service.getElapsedTime(1);
      expect(res.elapsedMinutes).toBeGreaterThanOrEqual(4);
      expect(res.elapsedSeconds).toBeGreaterThanOrEqual(300);
    });

    it("throw si participation introuvable", async () => {
      prisma.userQuiz.findUnique = mock(async () => null);
      expect(service.getElapsedTime(999)).rejects.toThrow("introuvable");
    });
  });

  describe("getUserDetailedStats", () => {
    it("retourne stats sans période", async () => {
      prisma.userQuiz.count = mock(async () => 5);
      prisma.userQuiz.findMany = mock(async () => [
        { ...makeUserQuiz(1, { completedAt: new Date(), isCorrect: true }), quiz: { type: "DAILY", levelId: null } },
        { ...makeUserQuiz(2, { completedAt: new Date(), isCorrect: false }), quiz: { type: "MCQ", levelId: 1 } },
      ]);
      const res = await service.getUserDetailedStats("u1");
      expect(res.dailyQuizStats.total).toBe(1);
      expect(res.mcqQuizStats.total).toBe(1);
    });

    it("applique le filtre période week/month/year", async () => {
      prisma.userQuiz.count = mock(async () => 0);
      prisma.userQuiz.findMany = mock(async () => []);
      await service.getUserDetailedStats("u1", "week");
      await service.getUserDetailedStats("u1", "month");
      await service.getUserDetailedStats("u1", "year");
      expect(prisma.userQuiz.findMany).toHaveBeenCalledTimes(3);
    });
  });

  describe("getLeaderboard", () => {
    it("trie par score décroissant avec rang", async () => {
      prisma.userQuiz.findMany = mock(async () => [
        { ...makeUserQuiz(1, { isCorrect: true }), user: { id: "u1", username: "alice", points: 100, levelId: 1 } },
        { ...makeUserQuiz(2, { isCorrect: true }), user: { id: "u1", username: "alice", points: 100, levelId: 1 } },
        { ...makeUserQuiz(3, { isCorrect: false }), user: { id: "u2", username: "bob", points: 50, levelId: 1 } },
      ]);
      const res = await service.getLeaderboard(10);
      expect(res[0].rank).toBe(1);
      expect(res[0].score).toBeGreaterThanOrEqual(res[1]?.score ?? 0);
    });

    it("supporte les périodes daily/weekly/monthly", async () => {
      prisma.userQuiz.findMany = mock(async () => []);
      await service.getLeaderboard(10, "daily");
      await service.getLeaderboard(10, "weekly");
      await service.getLeaderboard(10, "monthly");
      expect(prisma.userQuiz.findMany).toHaveBeenCalledTimes(3);
    });
  });

  describe("getStatsByType", () => {
    it("calcule stats daily et mcq séparément", async () => {
      prisma.userQuiz.findMany = mock(async (a?: unknown): Promise<unknown[]> => {
        const where = (a as { where?: { quiz?: { type?: string } } } | undefined)?.where;
        if (where?.quiz?.type === "DAILY") {
          return [makeUserQuiz(1, { isCorrect: true }), makeUserQuiz(2, { isCorrect: false })];
        }
        return [makeUserQuiz(3, { isCorrect: true })];
      });
      const res = await service.getStatsByType("u1");
      expect(res.daily.total).toBe(2);
      expect(res.daily.correct).toBe(1);
      expect(res.mcq.total).toBe(1);
      expect(res.mcq.successRate).toBe(100);
    });
  });

  describe("getStreaks", () => {
    it("retourne 0/0 si aucun quiz terminé", async () => {
      prisma.userQuiz.findMany = mock(async () => []);
      const res = await service.getStreaks("u1");
      expect(res.currentStreak).toBe(0);
      expect(res.bestStreak).toBe(0);
    });

    it("calcule currentStreak depuis le plus récent", async () => {
      prisma.userQuiz.findMany = mock(async () => [
        makeUserQuiz(1, { isCorrect: true, completedAt: new Date() }),
        makeUserQuiz(2, { isCorrect: true, completedAt: new Date() }),
        makeUserQuiz(3, { isCorrect: false, completedAt: new Date() }),
        makeUserQuiz(4, { isCorrect: true, completedAt: new Date() }),
      ]);
      const res = await service.getStreaks("u1");
      expect(res.currentStreak).toBe(2);
      expect(res.bestStreak).toBeGreaterThanOrEqual(2);
    });
  });

  describe("hasDoneDailyToday", () => {
    it("retourne hasDone=false si pas de quiz daily aujourd'hui", async () => {
      prisma.quiz.findMany = mock(async () => []);
      const res = await service.hasDoneDailyToday("u1");
      expect(res.hasDone).toBe(false);
    });

    it("retourne hasDone=true si participation trouvée pour le quiz du jour", async () => {
      const today = new Date();
      prisma.quiz.findMany = mock(async () => [{ id: 1, date: today, createdAt: today, type: "DAILY" }]);
      prisma.userQuiz.findFirst = mock(async () => ({ ...makeUserQuiz(1, { completedAt: today, isCorrect: true }), quiz: { id: 1, title: "Daily", date: today } }));
      const res = await service.hasDoneDailyToday("u1");
      expect(res.hasDone).toBe(true);
    });
  });

  describe("getDailyHistory", () => {
    it("filtre sur quiz type=DAILY", async () => {
      await service.getDailyHistory("u1", 30);
      const args = (prisma.userQuiz.findMany.mock.calls[0]?.[0] ?? {}) as { where: { quiz: { type: string } } };
      expect(args.where.quiz.type).toBe("DAILY");
    });
  });

  describe("getQuizStatusForGame", () => {
    it("retourne notDone si aucune participation pour la gameInstance", async () => {
      prisma.userQuiz.findFirst = mock(async () => null);
      const res = await service.getQuizStatusForGame(1, "u1");
      expect(res.status).toBe("notDone");
      expect(res.userQuizId).toBeNull();
    });

    it("retourne doneAndPassed si isCorrect=true", async () => {
      prisma.userQuiz.findFirst = mock(async () => makeUserQuiz(7, { isCorrect: true, completedAt: new Date() }));
      const res = await service.getQuizStatusForGame(1, "u1");
      expect(res.status).toBe("doneAndPassed");
      expect(res.userQuizId).toBe(7);
    });

    it("retourne doneAndFailed si isCorrect=false", async () => {
      prisma.userQuiz.findFirst = mock(async () => makeUserQuiz(8, { isCorrect: false, completedAt: new Date() }));
      const res = await service.getQuizStatusForGame(1, "u1");
      expect(res.status).toBe("doneAndFailed");
    });
  });

  describe("startLevelQuiz", () => {
    it("throw si quiz introuvable", async () => {
      prisma.quiz.findUnique = mock(async () => null);
      expect(service.startLevelQuiz(1, "u1", 100)).rejects.toThrow("introuvable");
    });

    it("throw si pas de questions pour le quiz", async () => {
      prisma.quiz.findUnique = mock(async () => ({ id: 1, type: "MCQ" }));
      prisma.quizQuestion.findMany = mock(async () => []);
      expect(service.startLevelQuiz(1, "u1", 100)).rejects.toThrow("Aucune question");
    });

    it("crée un userQuiz et retourne une question tirée aléatoirement", async () => {
      prisma.quiz.findUnique = mock(async () => ({ id: 1, type: "MCQ" }));
      prisma.quizQuestion.findMany = mock(async () => [
        {
          id: 1,
          questionId: 10,
          question: {
            id: 10,
            text: "Q1?",
            explanation: "exp",
            answers: [{ id: 100, text: "A", isCorrect: true }],
          },
        },
      ]);
      prisma.userQuiz.create = mock(async (a: { data: Record<string, unknown> }) => ({ id: 99, ...a.data }));
      const res = await service.startLevelQuiz(1, "u1", 100);
      expect(res.userQuiz.id).toBe(99);
      expect(res.question.id).toBe(10);
      expect(res.question.answers).toHaveLength(1);
    });
  });

  describe("submitLevelQuizAnswer", () => {
    it("throw si participation introuvable", async () => {
      prisma.userQuiz.findUnique = mock(async () => null);
      expect(service.submitLevelQuizAnswer(1, 10, 100, "u1")).rejects.toThrow("introuvable");
    });

    it("throw si participation appartient à un autre utilisateur", async () => {
      prisma.userQuiz.findUnique = mock(async () => ({ ...makeUserQuiz(1, { userId: "other" }), quiz: { levelId: 1 } }));
      expect(service.submitLevelQuizAnswer(1, 10, 100, "u1")).rejects.toThrow("introuvable");
    });

    it("throw si quiz déjà complété", async () => {
      prisma.userQuiz.findUnique = mock(async () => ({ ...makeUserQuiz(1, { completedAt: new Date() }), quiz: { levelId: 1 } }));
      expect(service.submitLevelQuizAnswer(1, 10, 100, "user1")).rejects.toThrow("déjà été complété");
    });

    it("throw si réponse invalide pour la question", async () => {
      prisma.userQuiz.findUnique = mock(async () => ({ ...makeUserQuiz(1), quiz: { levelId: 1 } }));
      prisma.answer.findUnique = mock(async () => ({ isCorrect: true, questionId: 999 }));
      expect(service.submitLevelQuizAnswer(1, 10, 100, "user1")).rejects.toThrow("invalide");
    });

    it("marque isCorrect et completedAt si réponse correcte", async () => {
      prisma.userQuiz.findUnique = mock(async () => ({ ...makeUserQuiz(1), quiz: { levelId: null } }));
      prisma.answer.findUnique = mock(async () => ({ isCorrect: true, questionId: 10 }));
      prisma.userQuiz.update = mock(async (a: { where: { id: number }; data: Record<string, unknown> }) => ({ id: a.where.id, ...a.data }));
      const res = await service.submitLevelQuizAnswer(1, 10, 100, "user1");
      expect(res.isCorrect).toBe(true);
    });
  });

  describe("getDailyStreak", () => {
    it("retourne 0 si aucun quiz daily complété", async () => {
      prisma.userQuiz.findMany = mock(async () => []);
      const res = await service.getDailyStreak("u1");
      expect(res.currentStreak).toBe(0);
      expect(res.lastActivityDate).toBeNull();
    });

    it("calcule la série de jours consécutifs", async () => {
      const today = new Date();
      prisma.userQuiz.findMany = mock(async () => [
        makeUserQuiz(1, { isCorrect: true, completedAt: today }),
      ]);
      const res = await service.getDailyStreak("u1");
      expect(res.currentStreak).toBeGreaterThanOrEqual(1);
    });
  });
});
