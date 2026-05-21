import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import type { Quiz } from "@cashou/db-app";
import { quizRouter } from "../../src/trpc/routers/quiz.router";
import { QuizService } from "../../src/trpc/services/quiz.service";
import { createRouterTestSetup } from "../helpers/router-test-factory";

function makeQuiz(id: number, over: Partial<Quiz> = {}): Quiz {
  const now = new Date();
  return {
    id,
    levelId: over.levelId ?? 1,
    title: over.title ?? `Quiz ${id}`,
    description: over.description ?? `Description ${id}`,
    type: over.type ?? "DAILY",
    date: over.date ?? now,
    createdAt: over.createdAt ?? now,
    updatedAt: over.updatedAt ?? now,
  };
}

const { wasMethodCalled, findCall } = createRouterTestSetup(
  QuizService,
  makeQuiz
);

// Manually mock special methods not covered by the factory
const originalFindByLevel = QuizService.prototype.findByLevel;
const originalFindByType = QuizService.prototype.findByType;
const originalGetTodaysDailyQuiz = QuizService.prototype.getTodaysDailyQuiz;
const originalDailyQuizExists = QuizService.prototype.dailyQuizExists;
const originalGetDailyHistory = QuizService.prototype.getDailyHistory;

beforeEach(() => {
  QuizService.prototype.findByLevel = async function (levelId: number): Promise<Quiz[]> {
    return [makeQuiz(1, { levelId })];
  };
  QuizService.prototype.findByType = async function (type: string): Promise<Quiz[]> {
    return [makeQuiz(1, { type: type as any })];
  };
  QuizService.prototype.getTodaysDailyQuiz = async function (): Promise<Quiz | null> {
    return makeQuiz(1, { type: "DAILY" });
  };
  QuizService.prototype.dailyQuizExists = async function (): Promise<boolean> {
    return true;
  };
  QuizService.prototype.getDailyHistory = async function (limit: number): Promise<Quiz[]> {
    return [makeQuiz(1), makeQuiz(2)].slice(0, limit);
  };
});

afterEach(() => {
  QuizService.prototype.findByLevel = originalFindByLevel;
  QuizService.prototype.findByType = originalFindByType;
  QuizService.prototype.getTodaysDailyQuiz = originalGetTodaysDailyQuiz;
  QuizService.prototype.dailyQuizExists = originalDailyQuizExists;
  QuizService.prototype.getDailyHistory = originalGetDailyHistory;
});

type Ctx = Parameters<typeof quizRouter.createCaller>[0];

describe("quiz.router — CRUD standard", () => {
  it("quiz.getAll → appelle service.findAll", async () => {
    const caller = quizRouter.createCaller({} as Ctx);
    const res = await caller.getAll();
    expect(res).toMatchObject([{ id: 1 }]);
    expect(wasMethodCalled("findAll")).toBeTrue();
  });

  it("quiz.getById → appelle service.findOne(id)", async () => {
    const caller = quizRouter.createCaller({} as Ctx);
    const res = await caller.getById({ id: 7 });
    expect(res).toMatchObject({ id: 7 });
    expect(findCall("findOne")?.args).toEqual({ id: 7 });
  });

  it("quiz.create → appelle service.create(data)", async () => {
    const caller = quizRouter.createCaller({} as Ctx);
    const payload = {
      title: "Test Quiz",
      description: "Test Description",
      levelId: 1,
      type: "DAILY" as const,
    };
    const res = await caller.create(payload);
    expect(res).toMatchObject({ id: 123 });
    expect(wasMethodCalled("create")).toBeTrue();
  });

  it("quiz.update → appelle service.update(id, data)", async () => {
    const caller = quizRouter.createCaller({} as Ctx);
    const res = await caller.update({ id: 99, data: { title: "Updated Quiz" } });
    expect(res).toMatchObject({ id: 99, title: "Updated Quiz" });
    expect(findCall("update")?.args).toEqual({ id: 99, data: { title: "Updated Quiz" } });
  });

  it("quiz.delete → appelle service.delete(id)", async () => {
    const caller = quizRouter.createCaller({} as Ctx);
    const res = await caller.delete({ id: 5 });
    expect(res.id).toBe(5);
    expect(wasMethodCalled("delete")).toBeTrue();
  });
});

describe("quiz.router — Méthodes spéciales", () => {
  it("quiz.getByLevel → appelle service.findByLevel(levelId)", async () => {
    const caller = quizRouter.createCaller({} as Ctx);
    const res = await caller.getByLevel({ levelId: 3 });
    expect(res).toMatchObject([{ levelId: 3 }]);
  });

  it("quiz.getByType → appelle service.findByType(type)", async () => {
    const caller = quizRouter.createCaller({} as Ctx);
    const res = await caller.getByType({ type: "MCQ" as any });
    expect(res).toMatchObject([{ type: "MCQ" }]);
  });

  it("quiz.getTodaysDailyQuiz → appelle service.getTodaysDailyQuiz()", async () => {
    const caller = quizRouter.createCaller({} as Ctx);
    const res = await caller.getTodaysDailyQuiz();
    expect(res).toMatchObject({ type: "DAILY" });
  });

  it("quiz.dailyQuizExists → appelle service.dailyQuizExists(date)", async () => {
    const caller = quizRouter.createCaller({} as Ctx);
    const res = await caller.dailyQuizExists({ date: "2024-01-15" });
    expect(res).toBe(true);
  });

  it("quiz.getDailyHistory → appelle service.getDailyHistory(limit)", async () => {
    const caller = quizRouter.createCaller({} as Ctx);
    const res = await caller.getDailyHistory({ limit: 2 });
    expect(res).toMatchObject([{ id: 1 }, { id: 2 }]);
  });
});

describe("quiz.router — Validations Zod", () => {
  it("getById avec id invalide → rejette", async () => {
    const caller = quizRouter.createCaller({} as Ctx);
    expect(caller.getById({ id: 0 })).rejects.toBeDefined();
  });

  it("update avec id invalide → rejette", async () => {
    const caller = quizRouter.createCaller({} as Ctx);
    expect(caller.update({ id: 0, data: { title: "Test" } })).rejects.toBeDefined();
  });

  it("delete avec id invalide → rejette", async () => {
    const caller = quizRouter.createCaller({} as Ctx);
    expect(caller.delete({ id: 0 })).rejects.toBeDefined();
  });

  it("getByLevel avec levelId invalide → rejette", async () => {
    const caller = quizRouter.createCaller({} as Ctx);
    expect(caller.getByLevel({ levelId: 0 })).rejects.toBeDefined();
  });

  it("getDailyHistory avec limit invalide → rejette", async () => {
    const caller = quizRouter.createCaller({} as Ctx);
    expect(caller.getDailyHistory({ limit: 200 })).rejects.toBeDefined();
  });
});
