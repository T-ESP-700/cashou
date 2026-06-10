// tests/router/game-instance.router.test.ts
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import type { GameInstance } from "@cashou/db-app";
import { gameInstanceRouter } from "../../src/trpc/routers/game-instance.router";
import { GameInstanceService } from "../../src/trpc/services/game-instance.service";
import { EndGameService } from "../../src/trpc/services/end-game.service";
import { createRouterTestSetup } from "../helpers/router-test-factory";

function makeGameInstance(id: number, over: Partial<GameInstance> = {}): GameInstance {
  const now = new Date();
  return {
    id,
    type: over.type ?? "SOLO",
    userId: over.userId ?? "user1",
    levelId: over.levelId ?? 1,
    startBalance: over.startBalance ?? 10000,
    isPaused: over.isPaused ?? false,
    pausedAt: over.pausedAt ?? null,
    actionRequired: over.actionRequired ?? false,
    totalPausedDuration: over.totalPausedDuration ?? 0,
    currentEventIndex: over.currentEventIndex ?? 0,
    endingStartedAt: over.endingStartedAt ?? null,
    isEnded: over.isEnded ?? false,
    endedAt: over.endedAt ?? null,
    marketId: over.marketId ?? null,
    createdAt: over.createdAt ?? now,
    updatedAt: over.updatedAt ?? now,
  };
}

const { wasMethodCalled, findCall } = createRouterTestSetup(GameInstanceService, makeGameInstance);

// Méthodes spéciales de GameInstanceService
type ExtraCall =
  | { method: "update"; args: { data: unknown } }
  | { method: "findByUser"; args: { userId: string } }
  | { method: "findByLevel"; args: { levelId: number } }
  | { method: "pause"; args: { id: number } }
  | { method: "resume"; args: { id: number } }
  | { method: "start"; args: { id: number } }
  | { method: "setActionRequired"; args: { id: number; actionRequired: boolean } }
  | { method: "completeEvent"; args: { id: number } }
  | { method: "getTimeInfo"; args: { id: number } }
  | { method: "resetLevelForUser"; args: { userId: string; levelId: number } }
  | { method: "endGame"; args: { id: number } };

const extraCalls: ExtraCall[] = [];
const extraOriginal = {
  update: GameInstanceService.prototype.update,
  findByUser: GameInstanceService.prototype.findByUser,
  findByLevel: GameInstanceService.prototype.findByLevel,
  pause: GameInstanceService.prototype.pause,
  resume: GameInstanceService.prototype.resume,
  start: GameInstanceService.prototype.start,
  setActionRequired: GameInstanceService.prototype.setActionRequired,
  completeEvent: GameInstanceService.prototype.completeEvent,
  getTimeInfo: GameInstanceService.prototype.getTimeInfo,
  resetLevelForUser: GameInstanceService.prototype.resetLevelForUser,
};

const endGameOriginal = {
  endGame: EndGameService.prototype.endGame,
};

beforeEach(() => {
  extraCalls.length = 0;

  GameInstanceService.prototype.update = async function (data: any) {
    extraCalls.push({ method: "update", args: { data } });
    return makeGameInstance(data.id, data);
  };

  GameInstanceService.prototype.findByUser = async function (userId: string) {
    extraCalls.push({ method: "findByUser", args: { userId } });
    return [makeGameInstance(1, { userId })];
  };

  GameInstanceService.prototype.findByLevel = async function (levelId: number) {
    extraCalls.push({ method: "findByLevel", args: { levelId } });
    return [makeGameInstance(1, { levelId })];
  };

  GameInstanceService.prototype.pause = async function (id: number) {
    extraCalls.push({ method: "pause", args: { id } });
    return makeGameInstance(id, { isPaused: true });
  };

  GameInstanceService.prototype.resume = async function (id: number) {
    extraCalls.push({ method: "resume", args: { id } });
    return makeGameInstance(id, { isPaused: false });
  };

  GameInstanceService.prototype.start = async function (id: number) {
    extraCalls.push({ method: "start", args: { id } });
    return makeGameInstance(id);
  };

  GameInstanceService.prototype.setActionRequired = async function (id: number, actionRequired: boolean) {
    extraCalls.push({ method: "setActionRequired", args: { id, actionRequired } });
    return makeGameInstance(id, { actionRequired });
  };

  GameInstanceService.prototype.completeEvent = async function (id: number) {
    extraCalls.push({ method: "completeEvent", args: { id } });
    return makeGameInstance(id, { currentEventIndex: 1 });
  };

  GameInstanceService.prototype.getTimeInfo = async function (id: number): Promise<any> {
    extraCalls.push({ method: "getTimeInfo", args: { id } });
    return { elapsed: 1000, remaining: 2000, totalDuration: 3000, totalDurationSeconds: 180, elapsedSeconds: 60, remainingSeconds: 120, hasEnded: false, progressPercent: 33.3 };
  };

  GameInstanceService.prototype.resetLevelForUser = async function (userId: string, levelId: number): Promise<{ deletedCount: number }> {
    extraCalls.push({ method: "resetLevelForUser", args: { userId, levelId } });
    return { deletedCount: 1 };
  };

  EndGameService.prototype.endGame = async function (id: number): Promise<any> {
    extraCalls.push({ method: "endGame", args: { id } });
    return { success: true, gameInstanceId: id, startBalance: 10000, walletBalance: 10000, assetsValue: 0, totalValue: 10000, goals: [], message: "Game terminé" };
  };
});

afterEach(() => {
  Object.assign(GameInstanceService.prototype, extraOriginal);
  Object.assign(EndGameService.prototype, endGameOriginal);
});

type Ctx = Parameters<typeof gameInstanceRouter.createCaller>[0];

describe("gameInstance.router — CRUD standard", () => {
  it("gameInstance.getAll → appelle service.findAll", async () => {
    const caller = gameInstanceRouter.createCaller({} as Ctx);
    const res = await caller.getAll();
    expect(res).toHaveLength(1);
    expect(wasMethodCalled("findAll")).toBe(true);
  });

  it("gameInstance.getById → appelle service.findOne(id)", async () => {
    const caller = gameInstanceRouter.createCaller({} as Ctx);
    const res = await caller.getById({ id: 7 });
    expect(res).toMatchObject({ id: 7 });
    const hit = findCall("findOne");
    expect(hit?.args).toEqual({ id: 7 });
  });

  it("gameInstance.create → appelle service.create(input)", async () => {
    const caller = gameInstanceRouter.createCaller({} as Ctx);
    const data = { userId: "user123", levelId: 2, startBalance: 5000 };
    const res = await caller.create(data);
    expect(res.id).toBe(123);
    expect(wasMethodCalled("create")).toBe(true);
  });

  it("gameInstance.update → appelle service.update(input)", async () => {
    const caller = gameInstanceRouter.createCaller({} as Ctx);
    const res = await caller.update({ id: 99, startBalance: 20000 });
    expect(res).toMatchObject({ id: 99 });
    const hit = extraCalls.find((c) => c.method === "update");
    expect(hit).toBeDefined();
  });

  it("gameInstance.delete → appelle service.delete(id)", async () => {
    const caller = gameInstanceRouter.createCaller({} as Ctx);
    const res = await caller.delete({ id: 5 });
    expect(res.id).toBe(5);
    const hit = findCall("delete");
    expect(hit?.args).toEqual({ id: 5 });
  });
});

describe("gameInstance.router — Méthodes spéciales", () => {
  it("gameInstance.getByUser → appelle service.findByUser(userId)", async () => {
    const caller = gameInstanceRouter.createCaller({} as Ctx);
    const res = await caller.getByUser({ userId: "user123" });
    expect(res).toMatchObject([{ userId: "user123" }]);
    const hit = extraCalls.find((c) => c.method === "findByUser");
    expect(hit?.args).toEqual({ userId: "user123" });
  });

  it("gameInstance.getByLevel → appelle service.findByLevel(levelId)", async () => {
    const caller = gameInstanceRouter.createCaller({} as Ctx);
    const res = await caller.getByLevel({ levelId: 2 });
    expect(res).toMatchObject([{ levelId: 2 }]);
    const hit = extraCalls.find((c) => c.method === "findByLevel");
    expect(hit?.args).toEqual({ levelId: 2 });
  });

  it("gameInstance.pause → appelle service.pause(id)", async () => {
    const caller = gameInstanceRouter.createCaller({} as Ctx);
    const res = await caller.pause({ id: 10 });
    expect(res).toMatchObject({ id: 10, isPaused: true });
    const hit = extraCalls.find((c) => c.method === "pause");
    expect(hit?.args).toEqual({ id: 10 });
  });

  it("gameInstance.resume → appelle service.resume(id)", async () => {
    const caller = gameInstanceRouter.createCaller({} as Ctx);
    const res = await caller.resume({ id: 10 });
    expect(res).toMatchObject({ id: 10, isPaused: false });
    const hit = extraCalls.find((c) => c.method === "resume");
    expect(hit?.args).toEqual({ id: 10 });
  });

  it("gameInstance.start → appelle service.start(id)", async () => {
    const caller = gameInstanceRouter.createCaller({} as Ctx);
    const res = await caller.start({ id: 10 });
    expect(res).toMatchObject({ id: 10 });
    const hit = extraCalls.find((c) => c.method === "start");
    expect(hit?.args).toEqual({ id: 10 });
  });

  it("gameInstance.setActionRequired → appelle service.setActionRequired(id, actionRequired)", async () => {
    const caller = gameInstanceRouter.createCaller({} as Ctx);
    const res = await caller.setActionRequired({ id: 10, actionRequired: true });
    expect(res).toMatchObject({ id: 10, actionRequired: true });
    const hit = extraCalls.find((c) => c.method === "setActionRequired");
    expect(hit?.args).toEqual({ id: 10, actionRequired: true });
  });

  it("gameInstance.completeEvent → appelle service.completeEvent(id)", async () => {
    const caller = gameInstanceRouter.createCaller({} as Ctx);
    const res = await caller.completeEvent({ id: 10 });
    expect(res).toMatchObject({ id: 10 });
    const hit = extraCalls.find((c) => c.method === "completeEvent");
    expect(hit?.args).toEqual({ id: 10 });
  });

  it("gameInstance.getTimeInfo → appelle service.getTimeInfo(id)", async () => {
    const caller = gameInstanceRouter.createCaller({} as Ctx);
    const res = await caller.getTimeInfo({ id: 10 });
    expect(res).toBeDefined();
    const hit = extraCalls.find((c) => c.method === "getTimeInfo");
    expect(hit?.args).toEqual({ id: 10 });
  });

  it("gameInstance.resetLevel → appelle service.resetLevelForUser(userId, levelId)", async () => {
    const caller = gameInstanceRouter.createCaller({} as Ctx);
    const res = await caller.resetLevel({ userId: "user123", levelId: 2 });
    expect(res).toMatchObject({ deletedCount: 1 });
    const hit = extraCalls.find((c) => c.method === "resetLevelForUser");
    expect(hit?.args).toEqual({ userId: "user123", levelId: 2 });
  });

  it("gameInstance.endGame → appelle endGameService.endGame(id)", async () => {
    const caller = gameInstanceRouter.createCaller({} as Ctx);
    const res = await caller.endGame({ id: 10 });
    expect(res.success).toBe(true);
    expect(res.gameInstanceId).toBe(10);
    expect(res.walletBalance).toBe(10000);
    const hit = extraCalls.find((c) => c.method === "endGame");
    expect(hit?.args).toEqual({ id: 10 });
  });
});

describe("gameInstance.router — Validations Zod", () => {
  it("getById avec id invalide → rejette", async () => {
    const caller = gameInstanceRouter.createCaller({} as Ctx);
    expect(caller.getById({ id: 0 })).rejects.toBeDefined();
  });

  it("pause avec id invalide → rejette", async () => {
    const caller = gameInstanceRouter.createCaller({} as Ctx);
    expect(caller.pause({ id: 0 })).rejects.toBeDefined();
  });

  it("resume avec id invalide → rejette", async () => {
    const caller = gameInstanceRouter.createCaller({} as Ctx);
    expect(caller.resume({ id: -1 })).rejects.toBeDefined();
  });
});
