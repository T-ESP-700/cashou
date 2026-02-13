// tests/service/user-quiz.service.unit.test.ts
// Tests unitaires — vérifie que createOrUpdateParticipation utilise $transaction
import { describe, test, expect, mock, beforeEach } from "bun:test";
import { UserQuizService } from "../../src/trpc/services/user-quiz.service";
import type { PrismaClient } from "@prisma/client";

function createMockPrisma() {
  const now = new Date();

  const txClient = {
    userQuiz: {
      findFirst: mock(async () => null), // Pas de participation existante
      create: mock(async () => ({
        id: 1,
        quizId: 10,
        userId: "user-123",
        completedAt: now,
        isCorrect: true,
        createdAt: now,
      })),
      update: mock(async () => ({
        id: 1,
        quizId: 10,
        userId: "user-123",
        completedAt: now,
        isCorrect: true,
        createdAt: now,
      })),
    },
    quiz: {
      findUnique: mock(async () => null), // Pas un daily quiz → skip streaks
    },
    quizQuestion: {
      findMany: mock(async () => []),
    },
    userAnswer: {
      findMany: mock(async () => []),
    },
    user: {
      findUnique: mock(async () => null),
      update: mock(async () => ({})),
    },
  };

  return {
    userQuiz: {
      findMany: mock(),
      findUnique: mock(),
      findFirst: mock(),
      create: mock(),
      update: mock(),
      delete: mock(),
      count: mock(),
    },
    quiz: { findUnique: mock(), findFirst: mock() },
    user: { findUnique: mock(), update: mock() },
    $transaction: mock(async (cb: Function) => cb(txClient)),
    _txClient: txClient,
  };
}

describe("UserQuizService — Transactions atomiques", () => {
  let service: UserQuizService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    service = new UserQuizService(mockPrisma as unknown as PrismaClient);
  });

  test("createOrUpdateParticipation utilise $transaction", async () => {
    await service.createOrUpdateParticipation(10, "user-123", true);

    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
  });

  test("crée une nouvelle participation via tx quand aucune n'existe", async () => {
    await service.createOrUpdateParticipation(10, "user-123", true);

    const tx = mockPrisma._txClient;
    expect(tx.userQuiz.findFirst).toHaveBeenCalledTimes(1);
    expect(tx.userQuiz.create).toHaveBeenCalledTimes(1);
    expect(tx.userQuiz.update).not.toHaveBeenCalled();
  });

  test("met à jour la participation existante via tx", async () => {
    const now = new Date();
    (mockPrisma._txClient.userQuiz.findFirst as any).mockResolvedValue({
      id: 1,
      quizId: 10,
      userId: "user-123",
      isCorrect: false,
      completedAt: null,
      createdAt: now,
    });

    await service.createOrUpdateParticipation(10, "user-123", true);

    const tx = mockPrisma._txClient;
    expect(tx.userQuiz.update).toHaveBeenCalledTimes(1);
    expect(tx.userQuiz.create).not.toHaveBeenCalled();
  });

  test("appelle updateStreaksIfTodaysQuiz dans la transaction", async () => {
    await service.createOrUpdateParticipation(10, "user-123", true);

    // quiz.findUnique est appelé par updateStreaksIfTodaysQuiz via tx
    expect(mockPrisma._txClient.quiz.findUnique).toHaveBeenCalledTimes(1);
  });

  test("n'utilise PAS this.prisma directement pour les écritures", async () => {
    await service.createOrUpdateParticipation(10, "user-123", true);

    expect(mockPrisma.userQuiz.create).not.toHaveBeenCalled();
    expect(mockPrisma.userQuiz.update).not.toHaveBeenCalled();
    expect(mockPrisma.userQuiz.findFirst).not.toHaveBeenCalled();
  });
});
