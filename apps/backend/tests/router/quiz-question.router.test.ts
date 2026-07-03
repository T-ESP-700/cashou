import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import type { QuizQuestion } from "@cashou/db-app";
import { quizQuestionRouter } from "../../src/trpc/routers/quiz-question.router";
import { QuizQuestionService } from "../../src/trpc/services/quiz-question.service";
import { createRouterTestSetup } from "../helpers/router-test-factory";

function makeQuizQuestion(id: number, over: Partial<QuizQuestion> = {}): QuizQuestion {
  const now = new Date();
  return {
    id,
    quizId: over.quizId ?? 1,
    questionId: over.questionId ?? 1,
    position: over.position ?? 1,
    createdAt: over.createdAt ?? now,
    updatedAt: over.updatedAt ?? now,
  };
}

const { wasMethodCalled, findCall } = createRouterTestSetup(QuizQuestionService, makeQuizQuestion);

type Ctx = Parameters<typeof quizQuestionRouter.createCaller>[0];

describe("quizQuestion.router — CRUD standard", () => {
  it("quizQuestion.getAll → appelle service.findAll", async () => {
    const caller = quizQuestionRouter.createCaller({} as Ctx);
    const res = await caller.getAll();
    expect(res).toMatchObject([{ id: 1 }]);
    expect(wasMethodCalled("findAll")).toBeTrue();
  });

  it("quizQuestion.getById → appelle service.findOne(id)", async () => {
    const caller = quizQuestionRouter.createCaller({} as Ctx);
    const res = await caller.getById({ id: 7 });
    expect(res).toMatchObject({ id: 7 });
    expect(findCall("findOne")?.args).toEqual({ id: 7 });
  });

  it("quizQuestion.create → appelle service.create(data)", async () => {
    const caller = quizQuestionRouter.createCaller({} as Ctx);
    const payload = { quizId: 1, questionId: 2, position: 1 };
    const res = await caller.create(payload);
    expect(res).toMatchObject({ id: 123 });
    expect(wasMethodCalled("create")).toBeTrue();
  });

  it("quizQuestion.update → appelle service.update(id, data)", async () => {
    const caller = quizQuestionRouter.createCaller({} as Ctx);
    const res = await caller.update({ id: 99, data: { position: 5 } });
    expect(res).toMatchObject({ id: 99, position: 5 });
    expect(findCall("update")?.args).toEqual({ id: 99, data: { position: 5 } });
  });

  it("quizQuestion.delete → appelle service.delete(id)", async () => {
    const caller = quizQuestionRouter.createCaller({} as Ctx);
    const res = await caller.delete({ id: 5 });
    expect(res.id).toBe(5);
    expect(wasMethodCalled("delete")).toBeTrue();
  });
});

describe("quizQuestion.router — Validations Zod", () => {
  it("getById avec id invalide → rejette", async () => {
    const caller = quizQuestionRouter.createCaller({} as Ctx);
    expect(caller.getById({ id: 0 })).rejects.toBeDefined();
  });

  it("delete avec id invalide → rejette", async () => {
    const caller = quizQuestionRouter.createCaller({} as Ctx);
    expect(caller.delete({ id: 0 })).rejects.toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Endpoints spécialisés
// ---------------------------------------------------------------------------

describe("quizQuestion.router — Endpoints spécialisés", () => {
  const extraMethods = [
    "findByQuiz",
    "findByQuestion",
    "findQuestionsWithAnswersByQuiz",
    "shuffleQuizOrder",
    "searchInQuiz",
    "validateQuizStructure",
    "getRandomQuestionsFromQuiz",
  ] as const;

  const callsByMethod: Record<string, unknown[][]> = {};
  const originals: Record<string, unknown> = {};

  beforeEach(() => {
    for (const k of Object.keys(callsByMethod)) delete callsByMethod[k];
    for (const m of extraMethods) {
      callsByMethod[m] = [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      originals[m] = (QuizQuestionService.prototype as any)[m];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (QuizQuestionService.prototype as any)[m] = async function (...args: unknown[]) {
        callsByMethod[m]!.push(args);
        return { method: m, args };
      };
    }
  });

  afterEach(() => {
    for (const m of extraMethods) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (QuizQuestionService.prototype as any)[m] = originals[m];
    }
  });

  it("getByQuiz → findByQuiz(quizId)", async () => {
    const caller = quizQuestionRouter.createCaller({} as Ctx);
    await caller.getByQuiz({ quizId: 1 });
    expect(callsByMethod.findByQuiz?.[0]?.[0]).toBe(1);
  });

  it("getByQuestion → findByQuestion(questionId)", async () => {
    const caller = quizQuestionRouter.createCaller({} as Ctx);
    await caller.getByQuestion({ questionId: 1 });
    expect(callsByMethod.findByQuestion?.[0]?.[0]).toBe(1);
  });

  it("getQuestionsWithAnswers → findQuestionsWithAnswersByQuiz(quizId)", async () => {
    const caller = quizQuestionRouter.createCaller({} as Ctx);
    await caller.getQuestionsWithAnswers({ quizId: 1 });
    expect(callsByMethod.findQuestionsWithAnswersByQuiz?.[0]?.[0]).toBe(1);
  });

  it("shuffleQuizOrder → shuffleQuizOrder(quizId)", async () => {
    const caller = quizQuestionRouter.createCaller({} as Ctx);
    await caller.shuffleQuizOrder({ quizId: 1 });
    expect(callsByMethod.shuffleQuizOrder?.[0]?.[0]).toBe(1);
  });

  it("searchInQuiz → searchInQuiz(quizId, keyword)", async () => {
    const caller = quizQuestionRouter.createCaller({} as Ctx);
    await caller.searchInQuiz({ quizId: 1, keyword: "bitcoin" });
    expect(callsByMethod.searchInQuiz?.[0]).toEqual([1, "bitcoin"]);
  });

  it("validateQuizStructure → validateQuizStructure(quizId)", async () => {
    const caller = quizQuestionRouter.createCaller({} as Ctx);
    await caller.validateQuizStructure({ quizId: 1 });
    expect(callsByMethod.validateQuizStructure?.[0]?.[0]).toBe(1);
  });

  it("getRandomQuestions → getRandomQuestionsFromQuiz(quizId, count)", async () => {
    const caller = quizQuestionRouter.createCaller({} as Ctx);
    await caller.getRandomQuestions({ quizId: 1, count: 5 });
    expect(callsByMethod.getRandomQuestionsFromQuiz?.[0]).toEqual([1, 5]);
  });
});
