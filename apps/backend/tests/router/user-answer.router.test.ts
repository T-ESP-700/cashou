import { describe, it, expect } from "bun:test";
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
