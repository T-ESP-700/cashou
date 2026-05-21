// tests/service/answer.service.unit.test.ts
import { describe, it, expect } from "bun:test";
import type { Answer } from "@cashou/db-app";
import { AnswerService } from "../../src/trpc/services/answer.service";
import { createServiceTestSetup } from "../helpers/service-test-factory";

function makeAnswer(id: number, over: Partial<Answer> = {}): Answer {
  const now = new Date();
  return {
    id,
    questionId: over.questionId ?? 1,
    text: over.text ?? `Answer ${id}`,
    isCorrect: over.isCorrect ?? false,
    createdAt: over.createdAt ?? now,
    updatedAt: over.updatedAt ?? now,
  };
}

describe("AnswerService — Tests unitaires", () => {
  const { service, wasMethodCalled } = createServiceTestSetup(
    AnswerService,
    makeAnswer,
    "answer"
  );

  it("findAll retourne toutes les réponses", async () => {
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
    const data = { questionId: 1, text: "Réponse A", isCorrect: true };
    const result = await service.create(data);
    expect(result.id).toBe(123);
    expect(wasMethodCalled("create")).toBeTrue();
  });

  it("update met à jour une réponse", async () => {
    const result = await service.update(5, { text: "Réponse modifiée" });
    expect(result.id).toBe(5);
    expect(wasMethodCalled("update")).toBeTrue();
  });

  it("delete supprime une réponse", async () => {
    const result = await service.delete(10);
    expect(result.id).toBe(10);
    expect(wasMethodCalled("delete")).toBeTrue();
  });
});
