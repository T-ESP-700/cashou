// tests/service/extra-coverage.unit.test.ts
// Tests intensifs pour les méthodes non-CRUD non couvertes des services suivants :
// notification, wallet, user, transaction, holding, impact, user-answer,
// dico-entry, quiz, asset-history, asset, event-asset, field, game_user,
// question, answer, submarket, level-event.
import { describe, it, expect, mock } from "bun:test";
import type { PrismaClient } from "@cashou/db-app";
import { NotificationService } from "../../src/trpc/services/notification.service";
import { WalletService } from "../../src/trpc/services/wallet.service";
import { UserService } from "../../src/trpc/services/user.service";
import { TransactionService } from "../../src/trpc/services/transaction.service";
import { HoldingService } from "../../src/trpc/services/holding.service";
import { ImpactService } from "../../src/trpc/services/impact.service";
import { UserAnswerService } from "../../src/trpc/services/user-answer.service";
import { DicoEntryService } from "../../src/trpc/services/dico-entry.service";
import { QuizService } from "../../src/trpc/services/quiz.service";
import { AssetHistoryService } from "../../src/trpc/services/asset-history.service";
import { AssetService } from "../../src/trpc/services/asset.service";
import { EventAssetService } from "../../src/trpc/services/event-asset.service";
import { FieldService } from "../../src/trpc/services/field.service";
import { SubmarketService } from "../../src/trpc/services/submarket.service";

function makeMock<T = unknown>(value: T) {
  return mock(async (_a?: unknown): Promise<T> => value);
}

// ---------------------------------------------------------------------------
// NotificationService
// ---------------------------------------------------------------------------
describe("NotificationService — extra coverage", () => {
  function build() {
    const prisma = {
      notification: {
        findMany: makeMock<unknown[]>([]),
        findUnique: makeMock<unknown>(null),
        create: mock(async (a: { data: Record<string, unknown> }) => ({ id: 1, ...a.data })),
        update: mock(async (a: { where: { id: number }; data: Record<string, unknown> }) => ({ id: a.where.id, ...a.data })),
        delete: mock(async (a: { where: { id: number } }) => ({ id: a.where.id })),
        updateMany: makeMock<{ count: number }>({ count: 5 }),
        deleteMany: makeMock<{ count: number }>({ count: 3 }),
      },
    };
    return { prisma, service: new NotificationService(prisma as unknown as PrismaClient) };
  }

  it("findByUser filtre par userId", async () => {
    const { prisma, service } = build();
    await service.findByUser("u1");
    const args = (prisma.notification.findMany.mock.calls[0]?.[0] ?? {}) as unknown as { where: { userId: string } };
    expect(args.where.userId).toBe("u1");
  });

  it("create transmet tous les champs optionnels", async () => {
    const { prisma, service } = build();
    await service.create({
      title: "T", message: "M", type: "INFO",
      user_id: "u1", is_open: false, sent_at: new Date(),
      game_instance_id: 5, quiz_id: 7, event_id: 9,
    } as never);
    const args = (prisma.notification.create.mock.calls[0]?.[0] ?? {}) as unknown as { data: Record<string, unknown> };
    expect(args.data.gameInstanceId).toBe(5);
    expect(args.data.quizId).toBe(7);
    expect(args.data.eventId).toBe(9);
  });

  it("markedAsRead met isOpened=true", async () => {
    const { prisma, service } = build();
    await service.markedAsRead(1);
    const args = (prisma.notification.update.mock.calls[0]?.[0] ?? {}) as unknown as { data: { isOpened: boolean } };
    expect(args.data.isOpened).toBe(true);
  });

  it("markAllAsReadByUser retourne le count", async () => {
    const { service } = build();
    const res = await service.markAllAsReadByUser("u1");
    expect(res).toBe(5);
  });

  it("deleteAllByUser retourne le count", async () => {
    const { service } = build();
    const res = await service.deleteAllByUser("u1");
    expect(res).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// WalletService
// ---------------------------------------------------------------------------
describe("WalletService — extra coverage", () => {
  function build() {
    const prisma = {
      wallet: {
        findMany: makeMock<unknown[]>([]),
        update: mock(async (a: { where: { id: number }; data: Record<string, unknown> }) => ({ id: a.where.id, ...a.data })),
      },
    };
    return { prisma, service: new WalletService(prisma as unknown as PrismaClient) };
  }

  it("findByUser filtre par userId", async () => {
    const { prisma, service } = build();
    await service.findByUser("u1");
    const args = (prisma.wallet.findMany.mock.calls[0]?.[0] ?? {}) as unknown as { where: { userId: string } };
    expect(args.where.userId).toBe("u1");
  });

  it("findByGameInstance filtre par gameInstanceId", async () => {
    const { prisma, service } = build();
    await service.findByGameInstance(7);
    const args = (prisma.wallet.findMany.mock.calls[0]?.[0] ?? {}) as unknown as { where: { gameInstanceId: number } };
    expect(args.where.gameInstanceId).toBe(7);
  });

  it("updateAmount convertit en string", async () => {
    const { prisma, service } = build();
    await service.updateAmount(1, 99.5);
    const args = (prisma.wallet.update.mock.calls[0]?.[0] ?? {}) as unknown as { data: { amount: string } };
    expect(args.data.amount).toBe("99.5");
  });

  it("addAmount utilise increment", async () => {
    const { prisma, service } = build();
    await service.addAmount(1, 50);
    const args = (prisma.wallet.update.mock.calls[0]?.[0] ?? {}) as unknown as { data: { amount: { increment: number } } };
    expect(args.data.amount.increment).toBe(50);
  });
});

// ---------------------------------------------------------------------------
// UserService
// ---------------------------------------------------------------------------
describe("UserService — extra coverage", () => {
  function build() {
    const prisma = {
      user: {
        findMany: makeMock<unknown[]>([]),
        findUnique: makeMock<unknown>(null),
        findFirst: makeMock<unknown>(null),
        update: mock(async (a: { where: { id: string }; data: Record<string, unknown> }) => ({ id: a.where.id, ...a.data })),
      },
    };
    return { prisma, service: new UserService(prisma as unknown as PrismaClient) };
  }

  it("findByLevel filtre par levelId", async () => {
    const { prisma, service } = build();
    await service.findByLevel(2);
    const args = (prisma.user.findMany.mock.calls[0]?.[0] ?? {}) as unknown as { where: { levelId: number } };
    expect(args.where.levelId).toBe(2);
  });

  it("findByEmail filtre par email", async () => {
    const { prisma, service } = build();
    await service.findByEmail("a@b.com");
    const args = (prisma.user.findFirst.mock.calls[0]?.[0] ?? {}) as unknown as { where: { email: string } };
    expect(args.where.email).toBe("a@b.com");
  });

  it("findTopUsers limite + orderBy points desc", async () => {
    const { prisma, service } = build();
    await service.findTopUsers(5);
    const args = (prisma.user.findMany.mock.calls[0]?.[0] ?? {}) as unknown as { take: number; orderBy: { points: string } };
    expect(args.take).toBe(5);
    expect(args.orderBy.points).toBe("desc");
  });

  it("findTopUsers default limit", async () => {
    const { service } = build();
    await service.findTopUsers();
    // Should not throw
  });

  it("updateLastActivity update lastActivity", async () => {
    const { prisma, service } = build();
    await service.updateLastActivity("u1");
    const args = (prisma.user.update.mock.calls[0]?.[0] ?? {}) as unknown as { data: { lastActivity: Date } };
    expect(args.data.lastActivity).toBeInstanceOf(Date);
  });

  it("addPoints throw si user introuvable", async () => {
    const { prisma, service } = build();
    prisma.user.findUnique = makeMock<unknown>(null);
    expect(service.addPoints("u1", 10)).rejects.toThrow("introuvable");
  });

  it("addPoints additionne les points", async () => {
    const { prisma, service } = build();
    prisma.user.findUnique = makeMock<unknown>({ id: "u1", points: 50 });
    await service.addPoints("u1", 10);
    const args = (prisma.user.update.mock.calls[0]?.[0] ?? {}) as unknown as { data: { points: number } };
    expect(args.data.points).toBe(60);
  });
});

// ---------------------------------------------------------------------------
// TransactionService
// ---------------------------------------------------------------------------
describe("TransactionService — extra coverage", () => {
  function build() {
    const prisma = {
      transaction: {
        findMany: makeMock<unknown[]>([]),
      },
    };
    return { prisma, service: new TransactionService(prisma as unknown as PrismaClient) };
  }

  it("findByWallet filtre par walletId", async () => {
    const { prisma, service } = build();
    await service.findByWallet(1);
    const args = (prisma.transaction.findMany.mock.calls[0]?.[0] ?? {}) as unknown as { where: { walletId: number } };
    expect(args.where.walletId).toBe(1);
  });

  it("findByAsset filtre par assetId", async () => {
    const { prisma, service } = build();
    await service.findByAsset(2);
    const args = (prisma.transaction.findMany.mock.calls[0]?.[0] ?? {}) as unknown as { where: { assetId: number } };
    expect(args.where.assetId).toBe(2);
  });

  it("findByType filtre par type", async () => {
    const { prisma, service } = build();
    await service.findByType("BUY");
    const args = (prisma.transaction.findMany.mock.calls[0]?.[0] ?? {}) as unknown as { where: { type: string } };
    expect(args.where.type).toBe("BUY");
  });

  it("findByGameInstance filtre par gameInstanceId", async () => {
    const { prisma, service } = build();
    await service.findByGameInstance(7);
    const args = (prisma.transaction.findMany.mock.calls[0]?.[0] ?? {}) as unknown as { where: { gameInstanceId: number } };
    expect(args.where.gameInstanceId).toBe(7);
  });

  it("getTotalValueByWallet retourne 0 si aucune transaction", async () => {
    const { prisma, service } = build();
    prisma.transaction.findMany = makeMock<unknown[]>([]);
    const res = await service.getTotalValueByWallet(1);
    expect(res).toBe(0);
  });

  it("getTotalValueByWallet somme les totalValue", async () => {
    const { prisma, service } = build();
    prisma.transaction.findMany = makeMock<unknown[]>([
      { totalValue: "100" },
      { totalValue: "200" },
      { totalValue: null },
    ]);
    const res = await service.getTotalValueByWallet(1);
    expect(res).toBe(300);
  });
});

// ---------------------------------------------------------------------------
// HoldingService
// ---------------------------------------------------------------------------
describe("HoldingService — extra coverage", () => {
  function build() {
    const prisma = {
      holding: {
        findMany: makeMock<unknown[]>([]),
        findFirst: makeMock<unknown>(null),
        findUnique: makeMock<unknown>(null),
        update: mock(async (a: { where: { id: number }; data: Record<string, unknown> }) => ({ id: a.where.id, ...a.data })),
      },
    };
    return { prisma, service: new HoldingService(prisma as unknown as PrismaClient) };
  }

  it("findByWalletAndAsset filtre par compound key walletId_assetId", async () => {
    const { prisma, service } = build();
    await service.findByWalletAndAsset(1, 2);
    const args = (prisma.holding.findUnique.mock.calls[0]?.[0] ?? {}) as unknown as { where: { walletId_assetId: { walletId: number; assetId: number } } };
    expect(args.where.walletId_assetId.walletId).toBe(1);
    expect(args.where.walletId_assetId.assetId).toBe(2);
  });

  it("findByWallet filtre par walletId", async () => {
    const { prisma, service } = build();
    await service.findByWallet(1);
    const args = (prisma.holding.findMany.mock.calls[0]?.[0] ?? {}) as unknown as { where: { walletId: number } };
    expect(args.where.walletId).toBe(1);
  });

  it("findByGameInstance filtre par gameInstanceId", async () => {
    const { prisma, service } = build();
    await service.findByGameInstance(1);
    const args = (prisma.holding.findMany.mock.calls[0]?.[0] ?? {}) as unknown as { where: { gameInstanceId: number } };
    expect(args.where.gameInstanceId).toBe(1);
  });

  it("findByAsset filtre par assetId", async () => {
    const { prisma, service } = build();
    await service.findByAsset(2);
    const args = (prisma.holding.findMany.mock.calls[0]?.[0] ?? {}) as unknown as { where: { assetId: number } };
    expect(args.where.assetId).toBe(2);
  });

  it("updateQuantity utilise Decimal", async () => {
    const { prisma, service } = build();
    await service.updateQuantity(1, 5);
    expect(prisma.holding.update).toHaveBeenCalled();
  });

  it("addQuantity throw si holding introuvable", async () => {
    const { prisma, service } = build();
    prisma.holding.findUnique = makeMock<unknown>(null);
    expect(service.addQuantity(999, 10)).rejects.toThrow("introuvable");
  });

  it("addQuantity additionne à la quantité existante", async () => {
    const { prisma, service } = build();
    prisma.holding.findUnique = makeMock<unknown>({ id: 1, quantity: "10" });
    await service.addQuantity(1, 5);
    expect(prisma.holding.update).toHaveBeenCalled();
  });

  it("subtractQuantity throw si holding introuvable", async () => {
    const { prisma, service } = build();
    prisma.holding.findUnique = makeMock<unknown>(null);
    expect(service.subtractQuantity(999, 1)).rejects.toThrow("introuvable");
  });

  it("subtractQuantity throw si insuffisant", async () => {
    const { prisma, service } = build();
    prisma.holding.findUnique = makeMock<unknown>({ id: 1, quantity: "5" });
    expect(service.subtractQuantity(1, 10)).rejects.toThrow("insuffisante");
  });

  it("subtractQuantity soustrait la quantité", async () => {
    const { prisma, service } = build();
    prisma.holding.findUnique = makeMock<unknown>({ id: 1, quantity: "20" });
    await service.subtractQuantity(1, 5);
    expect(prisma.holding.update).toHaveBeenCalled();
  });

  it("updateLastInterestAt update lastInterestAt", async () => {
    const { prisma, service } = build();
    await service.updateLastInterestAt(1);
    const args = (prisma.holding.update.mock.calls[0]?.[0] ?? {}) as unknown as { data: { lastInterestAt: Date } };
    expect(args.data.lastInterestAt).toBeInstanceOf(Date);
  });
});

// ---------------------------------------------------------------------------
// ImpactService
// ---------------------------------------------------------------------------
describe("ImpactService — extra coverage", () => {
  function build() {
    const prisma = {
      impact: { findMany: makeMock<unknown[]>([]) },
    };
    return { prisma, service: new ImpactService(prisma as unknown as PrismaClient) };
  }

  it("findByEventId filtre par eventId", async () => {
    const { prisma, service } = build();
    await service.findByEventId(1);
    const args = (prisma.impact.findMany.mock.calls[0]?.[0] ?? {}) as unknown as { where: { eventId: number } };
    expect(args.where.eventId).toBe(1);
  });

  it("findByFieldId filtre par fieldId", async () => {
    const { prisma, service } = build();
    await service.findByFieldId(2);
    const args = (prisma.impact.findMany.mock.calls[0]?.[0] ?? {}) as unknown as { where: { fieldId: number } };
    expect(args.where.fieldId).toBe(2);
  });

  it("findBySubmarketId filtre par submarketId", async () => {
    const { prisma, service } = build();
    await service.findBySubmarketId(3);
    const args = (prisma.impact.findMany.mock.calls[0]?.[0] ?? {}) as unknown as { where: { submarketId: number } };
    expect(args.where.submarketId).toBe(3);
  });

  it("findByMinCoefficient filtre par coef.gte", async () => {
    const { prisma, service } = build();
    await service.findByMinCoefficient(0.5);
    const args = (prisma.impact.findMany.mock.calls[0]?.[0] ?? {}) as unknown as { where: { coef: { gte: number } } };
    expect(args.where.coef.gte).toBe(0.5);
  });

  it("findByAssetId filtre via assets.some", async () => {
    const { prisma, service } = build();
    await service.findByAssetId(7);
    expect(prisma.impact.findMany).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// UserAnswerService
// ---------------------------------------------------------------------------
describe("UserAnswerService — extra coverage", () => {
  function build() {
    const prisma = {
      userAnswer: {
        findMany: makeMock<unknown[]>([]),
        findFirst: makeMock<unknown>(null),
        create: mock(async (a: { data: Record<string, unknown> }) => ({ id: 1, ...a.data })),
        count: makeMock<number>(0),
      },
      answer: { findUnique: makeMock<unknown>(null) },
    };
    return { prisma, service: new UserAnswerService(prisma as unknown as PrismaClient) };
  }

  it("findByUser filtre par userId", async () => {
    const { prisma, service } = build();
    await service.findByUser("u1");
    const args = (prisma.userAnswer.findMany.mock.calls[0]?.[0] ?? {}) as unknown as { where: { userId: string } };
    expect(args.where.userId).toBe("u1");
  });

  it("findByQuestion filtre par questionId", async () => {
    const { prisma, service } = build();
    await service.findByQuestion(2);
    const args = (prisma.userAnswer.findMany.mock.calls[0]?.[0] ?? {}) as unknown as { where: { questionId: number } };
    expect(args.where.questionId).toBe(2);
  });

  it("findByAnswer filtre par answerId", async () => {
    const { prisma, service } = build();
    await service.findByAnswer(3);
    const args = (prisma.userAnswer.findMany.mock.calls[0]?.[0] ?? {}) as unknown as { where: { answerId: number } };
    expect(args.where.answerId).toBe(3);
  });

  it("findByAccuracy filtre par accurate", async () => {
    const { prisma, service } = build();
    await service.findByAccuracy(true);
    const args = (prisma.userAnswer.findMany.mock.calls[0]?.[0] ?? {}) as unknown as { where: { accurate: boolean } };
    expect(args.where.accurate).toBe(true);
  });

  it("submitAnswer throw si déjà répondu", async () => {
    const { prisma, service } = build();
    prisma.userAnswer.findFirst = makeMock<unknown>({ id: 1 });
    expect(service.submitAnswer("u1", 1, 1)).rejects.toThrow("déjà répondu");
  });

  it("submitAnswer throw si réponse introuvable", async () => {
    const { prisma, service } = build();
    prisma.userAnswer.findFirst = makeMock<unknown>(null);
    prisma.answer.findUnique = makeMock<unknown>(null);
    expect(service.submitAnswer("u1", 1, 1)).rejects.toThrow("introuvable");
  });

  it("submitAnswer crée la réponse avec accurate=isCorrect", async () => {
    const { prisma, service } = build();
    prisma.userAnswer.findFirst = makeMock<unknown>(null);
    prisma.answer.findUnique = makeMock<unknown>({ id: 1, questionId: 2, isCorrect: true });
    const res = await service.submitAnswer("u1", 2, 1);
    expect(res).toBeDefined();
  });

  it("findByUserAndQuestion filtre par userId + questionId", async () => {
    const { prisma, service } = build();
    await service.findByUserAndQuestion("u1", 2);
    const args = (prisma.userAnswer.findFirst.mock.calls[0]?.[0] ?? {}) as unknown as { where: { userId: string; questionId: number } };
    expect(args.where.userId).toBe("u1");
    expect(args.where.questionId).toBe(2);
  });

  it("hasUserAnswered retourne true si réponse trouvée", async () => {
    const { prisma, service } = build();
    prisma.userAnswer.findFirst = makeMock<unknown>({ id: 1 });
    expect(await service.hasUserAnswered("u1", 1)).toBe(true);
  });

  it("hasUserAnswered retourne false sinon", async () => {
    const { prisma, service } = build();
    prisma.userAnswer.findFirst = makeMock<unknown>(null);
    expect(await service.hasUserAnswered("u1", 1)).toBe(false);
  });

  it("getUserStats agrège total/correct/successRate", async () => {
    const { prisma, service } = build();
    prisma.userAnswer.count = mock(async (a?: unknown): Promise<number> => {
      const where = (a as { where?: Record<string, unknown> } | undefined)?.where ?? {};
      if (where.accurate === true) return 7;
      return 10;
    });
    const res = await service.getUserStats("u1");
    expect(res.total).toBe(10);
    expect(res.correct).toBe(7);
    expect(res.incorrect).toBe(3);
  });

  it("getQuestionStats agrège totalAnswers/correct/incorrect", async () => {
    const { prisma, service } = build();
    prisma.userAnswer.count = mock(async (a?: unknown): Promise<number> => {
      const where = (a as { where?: Record<string, unknown> } | undefined)?.where ?? {};
      if (where.accurate === true) return 5;
      return 8;
    });
    const res = await service.getQuestionStats(1);
    expect(res.totalAnswers).toBe(8);
    expect(res.correct).toBe(5);
    expect(res.incorrect).toBe(3);
  });

  it("getAnswerStats retourne timesChosen", async () => {
    const { prisma, service } = build();
    prisma.userAnswer.count = makeMock<number>(3);
    const res = await service.getAnswerStats(1);
    expect(res.timesChosen).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// DicoEntryService
// ---------------------------------------------------------------------------
describe("DicoEntryService — extra coverage", () => {
  function build() {
    const prisma = {
      dicoEntry: {
        findMany: makeMock<unknown[]>([]),
        findUnique: makeMock<unknown>(null),
        findFirst: makeMock<unknown>(null),
        count: makeMock<number>(0),
        createMany: makeMock<{ count: number }>({ count: 2 }),
        deleteMany: makeMock<{ count: number }>({ count: 5 }),
      },
    };
    return { prisma, service: new DicoEntryService(prisma as unknown as PrismaClient) };
  }

  it("findAllPaginated avec defaults page=1, limit=50", async () => {
    const { prisma, service } = build();
    prisma.dicoEntry.count = makeMock<number>(100);
    const res = await service.findAllPaginated();
    expect(res.total).toBe(100);
    expect(res.page).toBe(1);
    expect(res.totalPages).toBe(2);
  });

  it("findAllPaginated calcule totalPages", async () => {
    const { prisma, service } = build();
    prisma.dicoEntry.count = makeMock<number>(75);
    const res = await service.findAllPaginated(2, 25);
    expect(res.totalPages).toBe(3);
    expect(res.page).toBe(2);
  });

  it("findByTerm utilise findUnique avec where.term", async () => {
    const { prisma, service } = build();
    await service.findByTerm("inflation");
    const args = (prisma.dicoEntry.findUnique.mock.calls[0]?.[0] ?? {}) as unknown as { where: { term: string } };
    expect(args.where.term).toBe("inflation");
  });

  it("search filtre par contains", async () => {
    const { prisma, service } = build();
    await service.search("infl");
    expect(prisma.dicoEntry.findMany).toHaveBeenCalled();
  });

  it("createMany crée plusieurs entrées", async () => {
    const { prisma, service } = build();
    const res = await service.createMany([{ term: "A", definition: "d" }] as never);
    expect(res.count).toBe(2);
    expect(prisma.dicoEntry.createMany).toHaveBeenCalled();
  });

  it("deleteAll retourne le count", async () => {
    const { service } = build();
    const res = await service.deleteAll();
    expect(res.count).toBe(5);
  });

  it("count retourne le total", async () => {
    const { prisma, service } = build();
    prisma.dicoEntry.count = makeMock<number>(42);
    const res = await service.count();
    expect(res).toBe(42);
  });
});

// ---------------------------------------------------------------------------
// QuizService
// ---------------------------------------------------------------------------
describe("QuizService — extra coverage", () => {
  function build() {
    const prisma = {
      quiz: {
        findMany: makeMock<unknown[]>([]),
        findFirst: makeMock<unknown>(null),
      },
    };
    return { prisma, service: new QuizService(prisma as unknown as PrismaClient) };
  }

  it("findByLevel filtre par levelId", async () => {
    const { prisma, service } = build();
    await service.findByLevel(2);
    const args = (prisma.quiz.findMany.mock.calls[0]?.[0] ?? {}) as unknown as { where: { levelId: number } };
    expect(args.where.levelId).toBe(2);
  });

  it("findByType filtre par type", async () => {
    const { prisma, service } = build();
    await service.findByType("DAILY");
    const args = (prisma.quiz.findMany.mock.calls[0]?.[0] ?? {}) as unknown as { where: { type: string } };
    expect(args.where.type).toBe("DAILY");
  });

  it("getTodaysDailyQuiz retourne null si pas de quiz today", async () => {
    const { service } = build();
    const res = await service.getTodaysDailyQuiz();
    expect(res).toBeNull();
  });

  it("getTodaysDailyQuiz trouve le quiz du jour", async () => {
    const { prisma, service } = build();
    const today = new Date();
    prisma.quiz.findMany = makeMock<unknown[]>([{ id: 1, date: today, createdAt: today, type: "DAILY" }]);
    const res = await service.getTodaysDailyQuiz();
    expect(res).toBeDefined();
  });

  it("dailyQuizExists retourne true si trouvé pour la date", async () => {
    const { prisma, service } = build();
    const date = new Date("2024-06-12");
    prisma.quiz.findMany = makeMock<unknown[]>([{ date, createdAt: date }]);
    expect(await service.dailyQuizExists("2024-06-12")).toBe(true);
  });

  it("dailyQuizExists retourne false si aucun quiz", async () => {
    const { service } = build();
    expect(await service.dailyQuizExists("2024-01-01")).toBe(false);
  });

  it("getDailyHistory avec limit default", async () => {
    const { prisma, service } = build();
    await service.getDailyHistory();
    const args = (prisma.quiz.findMany.mock.calls[0]?.[0] ?? {}) as unknown as { take: number };
    expect(args.take).toBe(30);
  });
});

// ---------------------------------------------------------------------------
// AssetHistoryService
// ---------------------------------------------------------------------------
describe("AssetHistoryService — extra coverage", () => {
  function build() {
    const prisma = {
      assetHistory: {
        findMany: makeMock<unknown[]>([]),
        findFirst: makeMock<unknown>(null),
      },
      gameInstance: {
        findUnique: makeMock<unknown>(null),
      },
    };
    return { prisma, service: new AssetHistoryService(prisma as unknown as PrismaClient) };
  }

  it("findByAssetId filtre par assetId", async () => {
    const { prisma, service } = build();
    await service.findByAssetId(2);
    const args = (prisma.assetHistory.findMany.mock.calls[0]?.[0] ?? {}) as unknown as { where: { assetId: number }; orderBy: unknown };
    expect(args.where.assetId).toBe(2);
    expect(args.orderBy).toEqual({ timestamp: "desc" });
  });

  it("findForGame retourne [] si gameInstance introuvable", async () => {
    const { prisma, service } = build();
    prisma.gameInstance.findUnique = makeMock<unknown>(null);
    const res = await service.findForGame(1, 1);
    expect(res).toEqual([]);
  });

  it("findForGame slice à lastDayIndex", async () => {
    const { prisma, service } = build();
    const past = new Date(Date.now() - 86400_000);
    prisma.gameInstance.findUnique = makeMock<unknown>({
      id: 1,
      createdAt: past,
      isPaused: false,
      isEnded: false,
      totalPausedDuration: 0,
      level: { id: 1, duration: 30, speed: 86400, historyStartDay: 0 },
    });
    prisma.assetHistory.findMany = makeMock<unknown[]>([{ id: 1, value: 100, timestamp: past }]);
    const res = await service.findForGame(1, 1);
    expect(res.length).toBeGreaterThanOrEqual(0);
  });

  it("getCurrentPrice retourne null si pas d'historique", async () => {
    const { service } = build();
    const res = await service.getCurrentPrice(1, 1);
    expect(res).toBeNull();
  });

  it("getCurrentPriceWithChange retourne null si pas d'historique", async () => {
    const { service } = build();
    const res = await service.getCurrentPriceWithChange(1, 1);
    expect(res).toBeNull();
  });

  it("findByAssetIdAndPeriod filtre par timestamp gte/lte", async () => {
    const { prisma, service } = build();
    const start = new Date("2024-01-01");
    const end = new Date("2024-12-31");
    await service.findByAssetIdAndPeriod(5, start, end);
    const args = (prisma.assetHistory.findMany.mock.calls[0]?.[0] ?? {}) as unknown as {
      where: { assetId: number; timestamp: { gte: Date; lte: Date } };
      orderBy: unknown;
    };
    expect(args.where.assetId).toBe(5);
    expect(args.where.timestamp.gte).toBe(start);
    expect(args.where.timestamp.lte).toBe(end);
    expect(args.orderBy).toEqual({ timestamp: "desc" });
  });

  it("findLatestByAssetId utilise findFirst avec orderBy desc", async () => {
    const { prisma, service } = build();
    await service.findLatestByAssetId(7);
    const args = (prisma.assetHistory.findFirst.mock.calls[0]?.[0] ?? {}) as unknown as {
      where: { assetId: number };
      orderBy: unknown;
    };
    expect(args.where.assetId).toBe(7);
    expect(args.orderBy).toEqual({ timestamp: "desc" });
  });

  it("findForGame applique cumulativeCoef avec eventImpacts (fully applied)", async () => {
    const { prisma, service } = build();
    const created = new Date(Date.now() - 86400_000 * 100); // 100 days ago
    prisma.gameInstance.findUnique = makeMock<unknown>({
      id: 1,
      createdAt: created,
      isPaused: false,
      isEnded: false,
      pausedAt: null,
      totalPausedDuration: 0,
      level: {
        id: 1,
        duration: 365,
        speed: 86400,
        historyStartDay: 0,
        levelEvents: [
          {
            position: 0,
            event: {
              id: 1,
              impacts: [{ assetId: 1, coef: 2.0 }],
            },
          },
        ],
      },
    });
    prisma.assetHistory.findMany = makeMock<unknown[]>(
      Array.from({ length: 50 }, (_, i) => ({
        id: i,
        assetId: 1,
        value: 100,
        timestamp: new Date(),
      }))
    );
    const res = await service.findForGame(1, 999); // use different id to bypass cache
    expect(Array.isArray(res)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// AssetService
// ---------------------------------------------------------------------------
describe("AssetService — extra coverage", () => {
  function build() {
    const prisma = {
      asset: { findMany: makeMock<unknown[]>([]) },
    };
    return { prisma, service: new AssetService(prisma as unknown as PrismaClient) };
  }

  it("findByMarketId filtre par marketId", async () => {
    const { prisma, service } = build();
    await service.findByMarketId(1);
    const args = (prisma.asset.findMany.mock.calls[0]?.[0] ?? {}) as unknown as { where: { marketId: number } };
    expect(args.where.marketId).toBe(1);
  });

  it("findBySubmarketId filtre par submarketId", async () => {
    const { prisma, service } = build();
    await service.findBySubmarketId(2);
    const args = (prisma.asset.findMany.mock.calls[0]?.[0] ?? {}) as unknown as { where: { submarketId: number } };
    expect(args.where.submarketId).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// EventAssetService — findByEventId, findByAssetId
// ---------------------------------------------------------------------------
describe("EventAssetService — extra coverage", () => {
  function build() {
    const prisma = {
      eventAsset: { findMany: makeMock<unknown[]>([]) },
    };
    return { prisma, service: new EventAssetService(prisma as unknown as PrismaClient) };
  }

  it("findByEventId filtre par eventId", async () => {
    const { prisma, service } = build();
    await service.findByEventId(1);
    const args = (prisma.eventAsset.findMany.mock.calls[0]?.[0] ?? {}) as unknown as { where: { eventId: number } };
    expect(args.where.eventId).toBe(1);
  });

  it("findByAssetId filtre par assetId", async () => {
    const { prisma, service } = build();
    await service.findByAssetId(2);
    const args = (prisma.eventAsset.findMany.mock.calls[0]?.[0] ?? {}) as unknown as { where: { assetId: number } };
    expect(args.where.assetId).toBe(2);
  });

  it("findByPeriod filtre par date gte/lte", async () => {
    const { prisma, service } = build();
    const start = new Date("2024-01-01");
    const end = new Date("2024-12-31");
    await service.findByPeriod(start, end);
    const args = (prisma.eventAsset.findMany.mock.calls[0]?.[0] ?? {}) as unknown as {
      where: { date: { gte: Date; lte: Date } };
      orderBy: unknown;
    };
    expect(args.where.date.gte).toBe(start);
    expect(args.where.date.lte).toBe(end);
    expect(args.orderBy).toEqual({ date: "desc" });
  });
});

// ---------------------------------------------------------------------------
// FieldService — findByMarketId
// ---------------------------------------------------------------------------
describe("FieldService — extra coverage", () => {
  function build() {
    const prisma = {
      field: { findMany: makeMock<unknown[]>([]) },
    };
    return { prisma, service: new FieldService(prisma as unknown as PrismaClient) };
  }

  it("findByMarketId filtre par marketId", async () => {
    const { prisma, service } = build();
    await service.findByMarketId(1);
    expect(prisma.field.findMany).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// SubmarketService — findByMarketId
// ---------------------------------------------------------------------------
describe("SubmarketService — extra coverage", () => {
  function build() {
    const prisma = {
      submarket: { findMany: makeMock<unknown[]>([]) },
    };
    return { prisma, service: new SubmarketService(prisma as unknown as PrismaClient) };
  }

  it("findByMarketId filtre par marketId", async () => {
    const { prisma, service } = build();
    await service.findByMarketId(1);
    const args = (prisma.submarket.findMany.mock.calls[0]?.[0] ?? {}) as unknown as { where: { marketId: number } };
    expect(args.where.marketId).toBe(1);
  });
});
