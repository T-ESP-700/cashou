// tests/router/game_user.router.test.ts
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import type { GameUser } from "@cashou/db-app";
import { gameUserRouter } from "../../src/trpc/routers/game_user.router";
import { GameUserService } from "../../src/trpc/services/game_user.service";
import { createRouterTestSetup } from "../helpers/router-test-factory";

function makeGameUser(id: number, over: Partial<GameUser> = {}): GameUser {
  const now = new Date();
  return {
    id,
    userId: over.userId ?? "user1",
    gameInstanceId: over.gameInstanceId ?? 1,
    isCreator: over.isCreator ?? false,
    joinAt: over.joinAt ?? now,
    status: over.status ?? "active",
    createdAt: over.createdAt ?? now,
    updatedAt: over.updatedAt ?? now,
  };
}

const { wasMethodCalled } = createRouterTestSetup(GameUserService, makeGameUser);

// Méthodes spéciales de GameUserService
type ExtraCall =
  | { method: "findById"; args: { id: number } }
  | { method: "findByUser"; args: { input: unknown } }
  | { method: "findByGameInstance"; args: { input: unknown } }
  | { method: "findByStatus"; args: { input: unknown } }
  | { method: "findByCreator"; args: { input: unknown } }
  | { method: "updateStatus"; args: { id: number; input: unknown } }
  | { method: "delete"; args: { id: number } };

const extraCalls: ExtraCall[] = [];
const extraOriginal = {
  findById: GameUserService.prototype.findById,
  findByUser: GameUserService.prototype.findByUser,
  findByGameInstance: GameUserService.prototype.findByGameInstance,
  findByStatus: GameUserService.prototype.findByStatus,
  findByCreator: GameUserService.prototype.findByCreator,
  updateStatus: GameUserService.prototype.updateStatus,
  delete: GameUserService.prototype.delete,
};

beforeEach(() => {
  extraCalls.length = 0;

  GameUserService.prototype.findById = async function (id: number): Promise<{ message: string; result: GameUser | null }> {
    extraCalls.push({ method: "findById", args: { id } });
    return { message: "Recherche par id", result: makeGameUser(id) };
  };

  GameUserService.prototype.findByUser = async function (input: unknown): Promise<{ message: string; result: GameUser[] }> {
    extraCalls.push({ method: "findByUser", args: { input } });
    return { message: "Recherche par utilisateur", result: [makeGameUser(1, { userId: (input as { userId: string }).userId })] };
  };

  GameUserService.prototype.findByGameInstance = async function (input: unknown): Promise<{ message: string; result: GameUser[] }> {
    extraCalls.push({ method: "findByGameInstance", args: { input } });
    return { message: "Recherche par game instance", result: [makeGameUser(1, { gameInstanceId: (input as { gameInstanceId: number }).gameInstanceId })] };
  };

  GameUserService.prototype.findByStatus = async function (input: unknown): Promise<{ message: string; result: GameUser[] }> {
    extraCalls.push({ method: "findByStatus", args: { input } });
    return { message: "Recherche par status", result: [makeGameUser(1, { status: (input as { status: string }).status })] };
  };

  GameUserService.prototype.findByCreator = async function (input: unknown): Promise<{ message: string; result: GameUser[] }> {
    extraCalls.push({ method: "findByCreator", args: { input } });
    return { message: "Recherche par créateur", result: [makeGameUser(1, { isCreator: true })] };
  };

  GameUserService.prototype.updateStatus = async function (id: number, input: unknown): Promise<{ message: string }> {
    extraCalls.push({ method: "updateStatus", args: { id, input } });
    return { message: "Status mis à jour" };
  };

  GameUserService.prototype.delete = async function (id: number): Promise<{ message: string }> {
    extraCalls.push({ method: "delete", args: { id } });
    return { message: "GameUser supprimé" };
  };
});

afterEach(() => {
  Object.assign(GameUserService.prototype, extraOriginal);
});

type Ctx = Parameters<typeof gameUserRouter.createCaller>[0];

describe("gameUser.router — CRUD standard", () => {
  it("gameUser.findAll → appelle service.findAll", async () => {
    const caller = gameUserRouter.createCaller({} as Ctx);
    const res = await caller.findAll();
    expect(res).toHaveLength(1);
    expect(wasMethodCalled("findAll")).toBe(true);
  });

  it("gameUser.findById → appelle service.findById(id)", async () => {
    const caller = gameUserRouter.createCaller({} as Ctx);
    const res = await caller.findById({ id: 7 });
    expect(res.result).toMatchObject({ id: 7 });
    const hit = extraCalls.find((c) => c.method === "findById");
    expect(hit?.args).toEqual({ id: 7 });
  });

  it("gameUser.create → appelle service.create(data)", async () => {
    const caller = gameUserRouter.createCaller({} as Ctx);
    const data = { userId: "user123", gameInstanceId: 2, isCreator: true };
    const res = await caller.create(data);
    expect(res.id).toBe(123);
    expect(wasMethodCalled("create")).toBe(true);
  });

  it("gameUser.update → appelle service.update(id, data)", async () => {
    const caller = gameUserRouter.createCaller({} as Ctx);
    const res = await caller.update({ id: 99, status: "inactive" });
    expect(res).toMatchObject({ id: 99 });
    expect(wasMethodCalled("update")).toBe(true);
  });

  it("gameUser.delete → appelle service.delete(id)", async () => {
    const caller = gameUserRouter.createCaller({} as Ctx);
    const res = await caller.delete({ id: 5 });
    expect(res.message).toBeDefined();
    const hit = extraCalls.find((c) => c.method === "delete");
    expect(hit?.args).toEqual({ id: 5 });
  });
});

describe("gameUser.router — Méthodes spéciales", () => {
  it("gameUser.findByUser → appelle service.findByUser(input)", async () => {
    const caller = gameUserRouter.createCaller({} as Ctx);
    const res = await caller.findByUser({ userId: "user123" });
    expect(res.result).toMatchObject([{ userId: "user123" }]);
    const hit = extraCalls.find((c) => c.method === "findByUser");
    expect(hit).toBeDefined();
  });

  it("gameUser.findByGameInstance → appelle service.findByGameInstance(input)", async () => {
    const caller = gameUserRouter.createCaller({} as Ctx);
    const res = await caller.findByGameInstance({ gameInstanceId: 42 });
    expect(res.result).toMatchObject([{ gameInstanceId: 42 }]);
    const hit = extraCalls.find((c) => c.method === "findByGameInstance");
    expect(hit).toBeDefined();
  });

  it("gameUser.findByStatus → appelle service.findByStatus(input)", async () => {
    const caller = gameUserRouter.createCaller({} as Ctx);
    const res = await caller.findByStatus({ status: "active" });
    expect(res.result).toMatchObject([{ status: "active" }]);
    const hit = extraCalls.find((c) => c.method === "findByStatus");
    expect(hit).toBeDefined();
  });

  it("gameUser.findByCreator → appelle service.findByCreator(input)", async () => {
    const caller = gameUserRouter.createCaller({} as Ctx);
    const res = await caller.findByCreator({ isCreator: true });
    expect(res.result).toMatchObject([{ isCreator: true }]);
    const hit = extraCalls.find((c) => c.method === "findByCreator");
    expect(hit).toBeDefined();
  });

  it("gameUser.updateStatus → appelle service.updateStatus(id, input)", async () => {
    const caller = gameUserRouter.createCaller({} as Ctx);
    const res = await caller.updateStatus({ id: 10, status: "inactive" });
    expect(res.message).toBeDefined();
    const hit = extraCalls.find((c) => c.method === "updateStatus");
    expect(hit?.args).toMatchObject({ id: 10 });
  });
});

describe("gameUser.router — Validations Zod", () => {
  it("findById avec id invalide → rejette", async () => {
    const caller = gameUserRouter.createCaller({} as Ctx);
    expect(caller.findById({ id: 0 })).rejects.toBeDefined();
  });

  it("updateStatus avec id invalide → rejette", async () => {
    const caller = gameUserRouter.createCaller({} as Ctx);
    expect(caller.updateStatus({ id: 0, status: "active" })).rejects.toBeDefined();
  });

  it("delete avec id invalide → rejette", async () => {
    const caller = gameUserRouter.createCaller({} as Ctx);
    expect(caller.delete({ id: 0 })).rejects.toBeDefined();
  });
});
