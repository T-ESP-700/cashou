import { describe, it, expect, beforeEach, afterEach } from "bun:test";
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
    gameInstanceId: over.gameInstanceId ?? null,
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

// ---------------------------------------------------------------------------
// Tests pour les endpoints spécialisés — mock direct sur le prototype du service
// ---------------------------------------------------------------------------

type ExtraMethodName =
  | "findByUser"
  | "findByQuiz"
  | "findByResult"
  | "startQuiz"
  | "completeQuiz"
  | "hasUserParticipated"
  | "getUserStats"
  | "getQuizStats"
  | "getStatus"
  | "getInProgressByUser"
  | "abandonQuiz"
  | "resumeQuiz"
  | "getHistoryByUser"
  | "getElapsedTime"
  | "getUserDetailedStats"
  | "getLeaderboard"
  | "getStatsByType"
  | "getStreaks"
  | "hasDoneDailyToday"
  | "getDailyHistory"
  | "getDailyStreak"
  | "createOrUpdateParticipation"
  | "getQuizStatusForGame"
  | "startLevelQuiz"
  | "submitLevelQuizAnswer";

describe("userQuiz.router — Endpoints spécialisés", () => {
  const extraMethods: ExtraMethodName[] = [
    "findByUser",
    "findByQuiz",
    "findByResult",
    "startQuiz",
    "completeQuiz",
    "hasUserParticipated",
    "getUserStats",
    "getQuizStats",
    "getStatus",
    "getInProgressByUser",
    "abandonQuiz",
    "resumeQuiz",
    "getHistoryByUser",
    "getElapsedTime",
    "getUserDetailedStats",
    "getLeaderboard",
    "getStatsByType",
    "getStreaks",
    "hasDoneDailyToday",
    "getDailyHistory",
    "getDailyStreak",
    "createOrUpdateParticipation",
    "getQuizStatusForGame",
    "startLevelQuiz",
    "submitLevelQuizAnswer",
  ];

  const callsByMethod: Record<string, unknown[][]> = {};
  const originals: Record<string, unknown> = {};

  beforeEach(() => {
    for (const k of Object.keys(callsByMethod)) {
      delete callsByMethod[k];
    }
    for (const m of extraMethods) {
      callsByMethod[m] = [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      originals[m] = (UserQuizService.prototype as any)[m];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (UserQuizService.prototype as any)[m] = async function (...args: unknown[]) {
        callsByMethod[m]!.push(args);
        return { method: m, args };
      };
    }
  });

  afterEach(() => {
    for (const m of extraMethods) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (UserQuizService.prototype as any)[m] = originals[m];
    }
  });

  const ctxAuth = {
    session: { user: { id: "u1" } },
    userId: "u1",
  } as unknown as Ctx;

  it("getByUser → appelle service.findByUser(userId)", async () => {
    const caller = userQuizRouter.createCaller({} as Ctx);
    await caller.getByUser({ userId: "u1" });
    expect(callsByMethod.findByUser?.[0]?.[0]).toBe("u1");
  });

  it("getByQuiz → appelle service.findByQuiz(quizId)", async () => {
    const caller = userQuizRouter.createCaller({} as Ctx);
    await caller.getByQuiz({ quizId: 1 });
    expect(callsByMethod.findByQuiz?.[0]?.[0]).toBe(1);
  });

  it("getByResult → appelle service.findByResult(isCorrect)", async () => {
    const caller = userQuizRouter.createCaller({} as Ctx);
    await caller.getByResult({ isCorrect: true });
    expect(callsByMethod.findByResult?.[0]?.[0]).toBe(true);
  });

  it("startQuiz → appelle service.startQuiz(quizId, userId)", async () => {
    const caller = userQuizRouter.createCaller({} as Ctx);
    await caller.startQuiz({ quizId: 5, userId: "u1" });
    expect(callsByMethod.startQuiz?.[0]).toEqual([5, "u1"]);
  });

  it("completeQuiz → appelle service.completeQuiz(id, isCorrect)", async () => {
    const caller = userQuizRouter.createCaller({} as Ctx);
    await caller.completeQuiz({ id: 10, isCorrect: false });
    expect(callsByMethod.completeQuiz?.[0]).toEqual([10, false]);
  });

  it("hasParticipated → appelle service.hasUserParticipated(quizId, userId)", async () => {
    const caller = userQuizRouter.createCaller({} as Ctx);
    await caller.hasParticipated({ quizId: 1, userId: "u1" });
    expect(callsByMethod.hasUserParticipated?.[0]).toEqual([1, "u1"]);
  });

  it("getUserStats → appelle service.getUserStats(userId)", async () => {
    const caller = userQuizRouter.createCaller({} as Ctx);
    await caller.getUserStats({ userId: "u1" });
    expect(callsByMethod.getUserStats?.[0]?.[0]).toBe("u1");
  });

  it("getQuizStats → appelle service.getQuizStats(quizId)", async () => {
    const caller = userQuizRouter.createCaller({} as Ctx);
    await caller.getQuizStats({ quizId: 1 });
    expect(callsByMethod.getQuizStats?.[0]?.[0]).toBe(1);
  });

  it("getStatus → appelle service.getStatus(userId, quizId)", async () => {
    const caller = userQuizRouter.createCaller({} as Ctx);
    await caller.getStatus({ userId: "u1", quizId: 1 });
    expect(callsByMethod.getStatus?.[0]).toEqual(["u1", 1]);
  });

  it("getInProgressByUser → appelle service.getInProgressByUser(userId)", async () => {
    const caller = userQuizRouter.createCaller({} as Ctx);
    await caller.getInProgressByUser({ userId: "u1" });
    expect(callsByMethod.getInProgressByUser?.[0]?.[0]).toBe("u1");
  });

  it("abandonQuiz → appelle service.abandonQuiz(id)", async () => {
    const caller = userQuizRouter.createCaller({} as Ctx);
    await caller.abandonQuiz({ id: 7 });
    expect(callsByMethod.abandonQuiz?.[0]?.[0]).toBe(7);
  });

  it("resumeQuiz → appelle service.resumeQuiz(userId, quizId)", async () => {
    const caller = userQuizRouter.createCaller({} as Ctx);
    await caller.resumeQuiz({ userId: "u1", quizId: 1 });
    expect(callsByMethod.resumeQuiz?.[0]).toEqual(["u1", 1]);
  });

  it("getHistoryByUser → appelle service.getHistoryByUser(userId, limit, offset)", async () => {
    const caller = userQuizRouter.createCaller({} as Ctx);
    await caller.getHistoryByUser({ userId: "u1", limit: 10, offset: 0 });
    expect(callsByMethod.getHistoryByUser?.[0]).toEqual(["u1", 10, 0]);
  });

  it("getElapsedTime → appelle service.getElapsedTime(id)", async () => {
    const caller = userQuizRouter.createCaller({} as Ctx);
    await caller.getElapsedTime({ id: 3 });
    expect(callsByMethod.getElapsedTime?.[0]?.[0]).toBe(3);
  });

  it("getUserDetailedStats → appelle service.getUserDetailedStats(userId, period)", async () => {
    const caller = userQuizRouter.createCaller({} as Ctx);
    await caller.getUserDetailedStats({ userId: "u1", period: "month" });
    expect(callsByMethod.getUserDetailedStats?.[0]).toEqual(["u1", "month"]);
  });

  it("getLeaderboard → appelle service.getLeaderboard(limit, period)", async () => {
    const caller = userQuizRouter.createCaller({} as Ctx);
    await caller.getLeaderboard({ limit: 5, period: "weekly" });
    expect(callsByMethod.getLeaderboard?.[0]).toEqual([5, "weekly"]);
  });

  it("getStatsByType → appelle service.getStatsByType(userId)", async () => {
    const caller = userQuizRouter.createCaller({} as Ctx);
    await caller.getStatsByType({ userId: "u1" });
    expect(callsByMethod.getStatsByType?.[0]?.[0]).toBe("u1");
  });

  it("getStreaks → appelle service.getStreaks(userId)", async () => {
    const caller = userQuizRouter.createCaller({} as Ctx);
    await caller.getStreaks({ userId: "u1" });
    expect(callsByMethod.getStreaks?.[0]?.[0]).toBe("u1");
  });

  it("hasDoneDailyToday → appelle service.hasDoneDailyToday(userId)", async () => {
    const caller = userQuizRouter.createCaller({} as Ctx);
    await caller.hasDoneDailyToday({ userId: "u1" });
    expect(callsByMethod.hasDoneDailyToday?.[0]?.[0]).toBe("u1");
  });

  it("getDailyHistory → appelle service.getDailyHistory(userId, days)", async () => {
    const caller = userQuizRouter.createCaller({} as Ctx);
    await caller.getDailyHistory({ userId: "u1", days: 7 });
    expect(callsByMethod.getDailyHistory?.[0]).toEqual(["u1", 7]);
  });

  it("getDailyStreak → appelle service.getDailyStreak(userId)", async () => {
    const caller = userQuizRouter.createCaller({} as Ctx);
    await caller.getDailyStreak({ userId: "u1" });
    expect(callsByMethod.getDailyStreak?.[0]?.[0]).toBe("u1");
  });

  it("hasDoneDailyTodayForCurrentUser → utilise ctx.userId", async () => {
    const caller = userQuizRouter.createCaller(ctxAuth);
    await caller.hasDoneDailyTodayForCurrentUser();
    expect(callsByMethod.hasDoneDailyToday?.[0]?.[0]).toBe("u1");
  });

  it("createOrUpdateParticipation → utilise ctx.userId", async () => {
    const caller = userQuizRouter.createCaller(ctxAuth);
    await caller.createOrUpdateParticipation({ quizId: 1, isCorrect: true });
    expect(callsByMethod.createOrUpdateParticipation?.[0]).toEqual([1, "u1", true]);
  });

  it("getQuizStatusForGame → utilise ctx.userId", async () => {
    const caller = userQuizRouter.createCaller(ctxAuth);
    await caller.getQuizStatusForGame({ gameInstanceId: 10 });
    expect(callsByMethod.getQuizStatusForGame?.[0]).toEqual([10, "u1"]);
  });

  it("startLevelQuiz → utilise ctx.userId", async () => {
    const caller = userQuizRouter.createCaller(ctxAuth);
    await caller.startLevelQuiz({ quizId: 1, gameInstanceId: 10 });
    expect(callsByMethod.startLevelQuiz?.[0]).toEqual([1, "u1", 10]);
  });

  it("submitLevelQuizAnswer → utilise ctx.userId", async () => {
    const caller = userQuizRouter.createCaller(ctxAuth);
    await caller.submitLevelQuizAnswer({ userQuizId: 1, questionId: 2, answerId: 3 });
    expect(callsByMethod.submitLevelQuizAnswer?.[0]).toEqual([1, 2, 3, "u1"]);
  });
});
