import { describe, it, expect } from "bun:test";
import type { UserQuiz } from "@cashou/db-app";
import { userQuizRouter } from "../../src/trpc/routers/user-quiz.router";
import { UserQuizService } from "../../src/trpc/services/user-quiz.service";
import { createRouterTestSetup } from "../helpers/router-test-factory";

function makeUserQuiz(id: number, over: Partial<UserQuiz> = {}): UserQuiz {
  const now = new Date();
  return {
    id,
    quizId: over.quizId ?? 1,
    userId: over.userId ?? "user1",
    completedAt: over.completedAt ?? now,
    isCorrect: over.isCorrect ?? true,
    createdAt: over.createdAt ?? now,
    updatedAt: over.updatedAt ?? now,
  };
}

const { wasMethodCalled, findCall } = createRouterTestSetup(UserQuizService, makeUserQuiz);

type Ctx = Parameters<typeof userQuizRouter.createCaller>[0];

describe("userQuiz.router — CRUD standard", () => {
  it("userQuiz.getAll → appelle service.findAll", async () => {
    const caller = userQuizRouter.createCaller({} as Ctx);
    const res = await caller.getAll();
    expect(res).toMatchObject([{ id: 1 }]);
    expect(wasMethodCalled("findAll")).toBeTrue();
  });

  it("userQuiz.getById → appelle service.findOne(id)", async () => {
    const caller = userQuizRouter.createCaller({} as Ctx);
    const res = await caller.getById({ id: 7 });
    expect(res).toMatchObject({ id: 7 });
    expect(findCall("findOne")?.args).toEqual({ id: 7 });
  });

  it("userQuiz.create → appelle service.create(data)", async () => {
    const caller = userQuizRouter.createCaller({} as Ctx);
    const payload = { userId: "user1", quizId: 1 };
    const res = await caller.create(payload);
    expect(res).toMatchObject({ id: 123 });
    expect(wasMethodCalled("create")).toBeTrue();
  });

  it("userQuiz.update → appelle service.update(id, data)", async () => {
    const caller = userQuizRouter.createCaller({} as Ctx);
    const res = await caller.update({ id: 99, data: { isCorrect: false } });
    expect(res).toMatchObject({ id: 99, isCorrect: false });
    expect(findCall("update")?.args).toEqual({ id: 99, data: { isCorrect: false } });
  });

  it("userQuiz.delete → appelle service.delete(id)", async () => {
    const caller = userQuizRouter.createCaller({} as Ctx);
    const res = await caller.delete({ id: 5 });
    expect(res.id).toBe(5);
    expect(wasMethodCalled("delete")).toBeTrue();
  });
});

describe("userQuiz.router — Validations Zod", () => {
  it("getById avec id invalide → rejette", async () => {
    const caller = userQuizRouter.createCaller({} as Ctx);
    expect(caller.getById({ id: 0 })).rejects.toBeDefined();
  });

  it("delete avec id invalide → rejette", async () => {
    const caller = userQuizRouter.createCaller({} as Ctx);
    expect(caller.delete({ id: 0 })).rejects.toBeDefined();
  });
});
