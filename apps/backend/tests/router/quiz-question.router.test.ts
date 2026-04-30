import { describe, it, expect } from "bun:test";
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
