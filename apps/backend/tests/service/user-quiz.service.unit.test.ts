// tests/service/user-quiz.service.unit.test.ts
import { describe, it, expect } from "bun:test";
import type { UserQuiz } from "@cashou/db-app";
import { UserQuizService } from "../../src/trpc/services/user-quiz.service";
import { createServiceTestSetup } from "../helpers/service-test-factory";

function makeUserQuiz(id: number, over: Partial<UserQuiz> = {}): UserQuiz {
  const now = new Date();
  return {
    id,
    quizId: over.quizId ?? 1,
    userId: over.userId ?? "user1",
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
