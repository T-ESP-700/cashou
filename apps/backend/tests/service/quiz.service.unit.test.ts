// tests/service/quiz.service.unit.test.ts
import { describe, it, expect } from "bun:test";
import type { Quiz } from "@cashou/db-app";
import { QuizService } from "../../src/trpc/services/quiz.service";
import { createServiceTestSetup } from "../helpers/service-test-factory";

function makeQuiz(id: number, over: Partial<Quiz> = {}): Quiz {
  const now = new Date();
  return {
    id,
    levelId: over.levelId ?? 1,
    title: over.title ?? `Quiz ${id}`,
    description: over.description ?? `Description ${id}`,
    type: over.type ?? "MCQ",
    date: over.date ?? now,
    createdAt: over.createdAt ?? now,
    updatedAt: over.updatedAt ?? now,
  };
}

describe("QuizService — Tests unitaires", () => {
  const { service, wasMethodCalled, findCall } = createServiceTestSetup(
    QuizService,
    makeQuiz,
    "quiz"
  );

  it("findAll retourne tous les quiz avec orderBy correct", async () => {
    const result = await service.findAll();
    expect(result).toHaveLength(1);
    expect(wasMethodCalled("findMany")).toBeTrue();
    const call = findCall("findMany");
    expect(call?.args).toHaveProperty("orderBy");
  });

  it("findOne retourne un quiz par ID", async () => {
    const result = await service.findOne(7);
    expect(result).toMatchObject({ id: 7 });
    expect(wasMethodCalled("findUnique")).toBeTrue();
  });

  it("findOne retourne null si quiz introuvable", async () => {
    const result = await service.findOne(999);
    expect(result).toBeNull();
  });

  it("create crée un nouveau quiz", async () => {
    const data = { levelId: 1, title: "Nouveau Quiz", type: "MCQ" as const };
    const result = await service.create(data);
    expect(result.id).toBe(123);
    expect(wasMethodCalled("create")).toBeTrue();
  });

  it("update met à jour un quiz", async () => {
    const result = await service.update(5, { title: "Quiz modifié" });
    expect(result.id).toBe(5);
    expect(wasMethodCalled("update")).toBeTrue();
  });

  it("delete supprime un quiz", async () => {
    const result = await service.delete(10);
    expect(result.id).toBe(10);
    expect(wasMethodCalled("delete")).toBeTrue();
  });
});
