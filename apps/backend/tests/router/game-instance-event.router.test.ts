import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import type { GameInstanceEvent } from "@cashou/db-app";
import { gameInstanceEventRouter } from "../../src/trpc/routers/game-instance-event.router";
import { GameInstanceEventService } from "../../src/trpc/services/game-instance-event.service";

const now = new Date();
function makeGameInstanceEvent(id: number, over: Partial<GameInstanceEvent> = {}): GameInstanceEvent {
  return {
    id,
    gameInstanceId: over.gameInstanceId ?? 1,
    levelEventId: over.levelEventId ?? 1,
    scheduledAt: over.scheduledAt ?? now,
    processingStartedAt: over.processingStartedAt ?? null,
    triggeredAt: over.triggeredAt ?? null,
    createdAt: over.createdAt ?? now,
    updatedAt: over.updatedAt ?? now,
  };
}

const originalFindByGameInstance = GameInstanceEventService.prototype.findByGameInstance;
const originalFindDueEvents = GameInstanceEventService.prototype.findDueEvents;

beforeEach(() => {
  GameInstanceEventService.prototype.findByGameInstance = async function (gameInstanceId: number): Promise<any> {
    return [makeGameInstanceEvent(1, { gameInstanceId })];
  };
  GameInstanceEventService.prototype.findDueEvents = async function (): Promise<any> {
    return [makeGameInstanceEvent(1)];
  };
});

afterEach(() => {
  GameInstanceEventService.prototype.findByGameInstance = originalFindByGameInstance;
  GameInstanceEventService.prototype.findDueEvents = originalFindDueEvents;
});

type Ctx = Parameters<typeof gameInstanceEventRouter.createCaller>[0];

describe("gameInstanceEvent.router — Méthodes spéciales", () => {
  it("gameInstanceEvent.findByGameInstance → appelle service.findByGameInstance(gameInstanceId)", async () => {
    const caller = gameInstanceEventRouter.createCaller({} as Ctx);
    const res = await caller.findByGameInstance({ gameInstanceId: 123 });
    expect(res).toMatchObject([{ gameInstanceId: 123 }]);
  });

  it("gameInstanceEvent.findDue → appelle service.findDueEvents()", async () => {
    const caller = gameInstanceEventRouter.createCaller({} as Ctx);
    const res = await caller.findDue();
    expect(res).toMatchObject([{ id: 1 }]);
  });
});

describe("gameInstanceEvent.router — Validations Zod", () => {
  it("findByGameInstance avec gameInstanceId invalide → rejette", async () => {
    const caller = gameInstanceEventRouter.createCaller({} as Ctx);
    expect(caller.findByGameInstance({ gameInstanceId: 0 })).rejects.toBeDefined();
  });
});
