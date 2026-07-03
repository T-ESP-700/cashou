// tests/service/question.service.unit.test.ts
import { describe, it, expect, mock } from "bun:test";
import type { Question, PrismaClient } from "@cashou/db-app";
import { QuestionService } from "../../src/trpc/services/question.service";
import { createServiceTestSetup } from "../helpers/service-test-factory";

function makeQuestion(id: number, over: Partial<Question> = {}): Question {
  const now = new Date();
  return {
    id,
    text: over.text ?? `Question ${id}`,
    explanation: over.explanation ?? `Explanation ${id}`,
    createdAt: over.createdAt ?? now,
    updatedAt: over.updatedAt ?? now,
  };
}

describe("QuestionService — Tests unitaires", () => {
  const { service, wasMethodCalled } = createServiceTestSetup(
    QuestionService,
    makeQuestion,
    "question"
  );

  it("findAll retourne toutes les questions", async () => {
    const result = await service.findAll();
    expect(result).toHaveLength(1);
    expect(wasMethodCalled("findMany")).toBeTrue();
  });

  it("findOne retourne une question par ID", async () => {
    const result = await service.findOne(7);
    expect(result).toMatchObject({ id: 7 });
    expect(wasMethodCalled("findUnique")).toBeTrue();
  });

  it("create crée une nouvelle question", async () => {
    const data = { text: "Nouvelle question?", explanation: "Explication" };
    const result = await service.create(data);
    expect(result.question.id).toBe(123);
    expect(result.message).toBe("La question a été créée avec succès");
    expect(wasMethodCalled("create")).toBeTrue();
  });

  it("update met à jour une question", async () => {
    const result = await service.update(5, { text: "Question modifiée?" });
    expect(result.id).toBe(5);
    expect(wasMethodCalled("update")).toBeTrue();
  });

  it("delete supprime une question", async () => {
    const result = await service.delete(10);
    expect(result.id).toBe(10);
    expect(wasMethodCalled("delete")).toBeTrue();
  });
});

describe("QuestionService — search", () => {
  it("search filtre par contains case-insensitive", async () => {
    const prisma = {
      question: {
        findMany: mock(async (_a?: unknown): Promise<unknown[]> => []),
      },
    };
    const service = new QuestionService(prisma as unknown as PrismaClient);
    await service.search("bitcoin");
    const args = (prisma.question.findMany.mock.calls[0]?.[0] ?? {}) as unknown as {
      where: { text: { contains: string; mode: string } };
      orderBy: unknown;
    };
    expect(args.where.text.contains).toBe("bitcoin");
    expect(args.where.text.mode).toBe("insensitive");
    expect(args.orderBy).toEqual({ createdAt: "desc" });
  });
});
