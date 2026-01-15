import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import type { Answer } from "@cashou/db-app";
import { answerRouter } from "../../src/trpc/routers/answer.router";
import { AnswerService } from "../../src/trpc/services/answer.service";
import { createRouterTestSetup } from "../helpers/router-test-factory";

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

const { wasMethodCalled, findCall } = createRouterTestSetup(AnswerService, makeAnswer);

const originalFindByQuestion = AnswerService.prototype.findByQuestion;

beforeEach(() => {
  AnswerService.prototype.findByQuestion = async function (questionId: number): Promise<Answer[]> {
    return [makeAnswer(1, { questionId })];
  };
});

afterEach(() => {
  AnswerService.prototype.findByQuestion = originalFindByQuestion;
});

type Ctx = Parameters<typeof answerRouter.createCaller>[0];

describe("answer.router — CRUD standard", () => {
  it("answer.getAll → appelle service.findAll", async () => {
    const caller = answerRouter.createCaller({} as Ctx);
    const res = await caller.getAll();
    expect(res).toMatchObject([{ id: 1 }]);
    expect(wasMethodCalled("findAll")).toBeTrue();
  });

  it("answer.getById → appelle service.findOne(id)", async () => {
    const caller = answerRouter.createCaller({} as Ctx);
    const res = await caller.getById({ id: 7 });
    expect(res).toMatchObject({ id: 7 });
    expect(findCall("findOne")?.args).toEqual({ id: 7 });
  });

  it("answer.create → appelle service.create(data)", async () => {
    const caller = answerRouter.createCaller({} as Ctx);
    const payload = { text: "Test Answer", questionId: 1, isCorrect: true };
    const res = await caller.create(payload);
    expect(res).toMatchObject({ id: 123 });
    expect(wasMethodCalled("create")).toBeTrue();
  });

  it("answer.update → appelle service.update(id, data)", async () => {
    const caller = answerRouter.createCaller({} as Ctx);
    const res = await caller.update({ id: 99, data: { text: "Updated Answer" } });
    expect(res).toMatchObject({ id: 99, text: "Updated Answer" });
    expect(findCall("update")?.args).toEqual({ id: 99, data: { text: "Updated Answer" } });
  });

  it("answer.delete → appelle service.delete(id)", async () => {
    const caller = answerRouter.createCaller({} as Ctx);
    const res = await caller.delete({ id: 5 });
    expect(res.id).toBe(5);
    expect(wasMethodCalled("delete")).toBeTrue();
  });
});

describe("answer.router — Méthodes spéciales", () => {
  it("answer.getByQuestion → appelle service.findByQuestion(questionId)", async () => {
    const caller = answerRouter.createCaller({} as Ctx);
    const res = await caller.getByQuestion({ questionId: 123 });
    expect(res).toMatchObject([{ questionId: 123 }]);
  });
});

describe("answer.router — Validations Zod", () => {
  it("getById avec id invalide → rejette", async () => {
    const caller = answerRouter.createCaller({} as Ctx);
    expect(caller.getById({ id: 0 })).rejects.toBeDefined();
  });

  it("delete avec id invalide → rejette", async () => {
    const caller = answerRouter.createCaller({} as Ctx);
    expect(caller.delete({ id: 0 })).rejects.toBeDefined();
  });
});
