// tests/service/user-answer.service.unit.test.ts
import { describe, it, expect } from "bun:test";
import type { UserAnswer } from "@cashou/db-app";
import { UserAnswerService } from "../../src/trpc/services/user-answer.service";
import { createServiceTestSetup } from "../helpers/service-test-factory";

function makeUserAnswer(id: number, over: Partial<UserAnswer> = {}): UserAnswer {
  const now = new Date();
  return {
    id,
    userId: over.userId ?? "user1",
    questionId: over.questionId ?? 1,
    answerId: over.answerId ?? 1,
    accurate: over.accurate ?? false,
    createdAt: over.createdAt ?? now,
    updatedAt: over.updatedAt ?? now,
  };
}

describe("UserAnswerService — Tests unitaires", () => {
  const { service, wasMethodCalled } = createServiceTestSetup(
    UserAnswerService,
    makeUserAnswer,
    "userAnswer"
  );

  it("findAll retourne toutes les réponses utilisateur", async () => {
    const result = await service.findAll();
    expect(result).toHaveLength(1);
    expect(wasMethodCalled("findMany")).toBeTrue();
  });

  it("findOne retourne une réponse par ID", async () => {
    const result = await service.findOne(7);
    expect(result).toMatchObject({ id: 7 });
    expect(wasMethodCalled("findUnique")).toBeTrue();
  });

  it("create crée une nouvelle réponse", async () => {
    const data = { userId: "user1", questionId: 1, answerId: 1, accurate: true };
    const result = await service.create(data);
    expect(result.id).toBe(123);
    expect(wasMethodCalled("create")).toBeTrue();
  });

  it("update met à jour une réponse", async () => {
    const result = await service.update(5, { accurate: true });
    expect(result.id).toBe(5);
    expect(wasMethodCalled("update")).toBeTrue();
  });

  it("delete supprime une réponse", async () => {
    const result = await service.delete(10);
    expect(result.id).toBe(10);
    expect(wasMethodCalled("delete")).toBeTrue();
  });
});
