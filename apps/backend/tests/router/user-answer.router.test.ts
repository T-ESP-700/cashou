import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import type { UserAnswer } from "@cashou/db-app";
import { userAnswerRouter } from "../../src/trpc/routers/user-answer.router";
import { UserAnswerService } from "../../src/trpc/services/user-answer.service";
import { createRouterTestSetup } from "../helpers/router-test-factory";

function makeUserAnswer(id: number, over: Partial<UserAnswer> = {}): UserAnswer {
  const now = new Date();
  return {
    id,
    userId: over.userId ?? "user1",
    questionId: over.questionId ?? 1,
    answerId: over.answerId ?? 1,
    accurate: over.accurate ?? true,
    createdAt: over.createdAt ?? now,
    updatedAt: over.updatedAt ?? now,
  };
}

const { wasMethodCalled, findCall } = createRouterTestSetup(UserAnswerService, makeUserAnswer);

type Ctx = Parameters<typeof userAnswerRouter.createCaller>[0];

describe("userAnswer.router — CRUD standard", () => {
  it("userAnswer.getAll → appelle service.findAll", async () => {
    const caller = userAnswerRouter.createCaller({} as Ctx);
    const res = await caller.getAll();
    expect(res).toMatchObject([{ id: 1 }]);
    expect(wasMethodCalled("findAll")).toBeTrue();
  });

  it("userAnswer.getById → appelle service.findOne(id)", async () => {
    const caller = userAnswerRouter.createCaller({} as Ctx);
    const res = await caller.getById({ id: 7 });
    expect(res).toMatchObject({ id: 7 });
    expect(findCall("findOne")?.args).toEqual({ id: 7 });
  });

  it("userAnswer.create → appelle service.create(data)", async () => {
    const caller = userAnswerRouter.createCaller({} as Ctx);
    const payload = { userId: "user1", questionId: 1, answerId: 1, accurate: true };
    const res = await caller.create(payload);
    expect(res).toMatchObject({ id: 123 });
    expect(wasMethodCalled("create")).toBeTrue();
  });

  it("userAnswer.update → appelle service.update(id, data)", async () => {
    const caller = userAnswerRouter.createCaller({} as Ctx);
    const res = await caller.update({ id: 99, data: { accurate: false } });
    expect(res).toMatchObject({ id: 99, accurate: false });
    expect(findCall("update")?.args).toEqual({ id: 99, data: { accurate: false } });
  });

  it("userAnswer.delete → appelle service.delete(id)", async () => {
    const caller = userAnswerRouter.createCaller({} as Ctx);
    const res = await caller.delete({ id: 5 });
    expect(res.id).toBe(5);
    expect(wasMethodCalled("delete")).toBeTrue();
  });
});

describe("userAnswer.router — Validations Zod", () => {
  it("getById avec id invalide → rejette", async () => {
    const caller = userAnswerRouter.createCaller({} as Ctx);
    expect(caller.getById({ id: 0 })).rejects.toBeDefined();
  });

  it("delete avec id invalide → rejette", async () => {
    const caller = userAnswerRouter.createCaller({} as Ctx);
    expect(caller.delete({ id: 0 })).rejects.toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Endpoints spécialisés — mock direct sur le prototype du service
// ---------------------------------------------------------------------------

describe("userAnswer.router — Endpoints spécialisés", () => {
  const extraMethods = [
    "findByUser",
    "findByQuestion",
    "findByAnswer",
    "findByAccuracy",
    "submitAnswer",
    "findByUserAndQuestion",
    "hasUserAnswered",
    "getUserStats",
    "getQuestionStats",
    "getAnswerStats",
  ] as const;

  const callsByMethod: Record<string, unknown[][]> = {};
  const originals: Record<string, unknown> = {};

  beforeEach(() => {
    for (const k of Object.keys(callsByMethod)) delete callsByMethod[k];
    for (const m of extraMethods) {
      callsByMethod[m] = [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      originals[m] = (UserAnswerService.prototype as any)[m];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (UserAnswerService.prototype as any)[m] = async function (...args: unknown[]) {
        callsByMethod[m]!.push(args);
        return { method: m, args };
      };
    }
  });

  afterEach(() => {
    for (const m of extraMethods) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (UserAnswerService.prototype as any)[m] = originals[m];
    }
  });

  it("getByUser → findByUser(userId)", async () => {
    const caller = userAnswerRouter.createCaller({} as Ctx);
    await caller.getByUser({ userId: "u1" });
    expect(callsByMethod.findByUser?.[0]?.[0]).toBe("u1");
  });

  it("getByQuestion → findByQuestion(questionId)", async () => {
    const caller = userAnswerRouter.createCaller({} as Ctx);
    await caller.getByQuestion({ questionId: 1 });
    expect(callsByMethod.findByQuestion?.[0]?.[0]).toBe(1);
  });

  it("getByAnswer → findByAnswer(answerId)", async () => {
    const caller = userAnswerRouter.createCaller({} as Ctx);
    await caller.getByAnswer({ answerId: 5 });
    expect(callsByMethod.findByAnswer?.[0]?.[0]).toBe(5);
  });

  it("getByAccuracy → findByAccuracy(accurate)", async () => {
    const caller = userAnswerRouter.createCaller({} as Ctx);
    await caller.getByAccuracy({ accurate: true });
    expect(callsByMethod.findByAccuracy?.[0]?.[0]).toBe(true);
  });

  it("submitAnswer → submitAnswer(userId, questionId, answerId)", async () => {
    const caller = userAnswerRouter.createCaller({} as Ctx);
    await caller.submitAnswer({ userId: "u1", questionId: 1, answerId: 2 });
    expect(callsByMethod.submitAnswer?.[0]).toEqual(["u1", 1, 2]);
  });

  it("getByUserAndQuestion → findByUserAndQuestion(userId, questionId)", async () => {
    const caller = userAnswerRouter.createCaller({} as Ctx);
    await caller.getByUserAndQuestion({ userId: "u1", questionId: 1 });
    expect(callsByMethod.findByUserAndQuestion?.[0]).toEqual(["u1", 1]);
  });

  it("hasAnswered → hasUserAnswered(userId, questionId)", async () => {
    const caller = userAnswerRouter.createCaller({} as Ctx);
    await caller.hasAnswered({ userId: "u1", questionId: 1 });
    expect(callsByMethod.hasUserAnswered?.[0]).toEqual(["u1", 1]);
  });

  it("getUserStats → getUserStats(userId)", async () => {
    const caller = userAnswerRouter.createCaller({} as Ctx);
    await caller.getUserStats({ userId: "u1" });
    expect(callsByMethod.getUserStats?.[0]?.[0]).toBe("u1");
  });

  it("getQuestionStats → getQuestionStats(questionId)", async () => {
    const caller = userAnswerRouter.createCaller({} as Ctx);
    await caller.getQuestionStats({ questionId: 1 });
    expect(callsByMethod.getQuestionStats?.[0]?.[0]).toBe(1);
  });

  it("getAnswerStats → getAnswerStats(answerId)", async () => {
    const caller = userAnswerRouter.createCaller({} as Ctx);
    await caller.getAnswerStats({ answerId: 7 });
    expect(callsByMethod.getAnswerStats?.[0]?.[0]).toBe(7);
  });
});
