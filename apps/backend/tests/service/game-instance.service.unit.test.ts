// tests/service/game-instance.service.unit.test.ts
import { describe, it, expect, mock, beforeEach } from "bun:test";
import type { GameInstance, PrismaClient } from "@cashou/db-app";
import { createServiceTestSetup } from "../helpers/service-test-factory";

// Stub job-queue + websocket modules avant d'importer le service.
const cancelGameJobs = mock(async (_id: number) => {});
const scheduleGameEnd = mock(async (_id: number, _d: number) => {});
const scheduleGameEvent = mock(async (_id: number, _at: Date) => {});
const cancelGameEvent = mock(async (_id: number) => {});

mock.module("../../src/lib/job-queue.ts", () => ({
  JOB_NAMES: { GAME_END: "game-end", GAME_EVENT: "game-event" },
  getJobQueue: async () => null,
  stopJobQueue: async () => {},
  scheduleGameEnd,
  scheduleGameEvent,
  cancelGameEvent,
  cancelGameJobs,
  getJobQueueInstance: () => null,
}));

const broadcastToGame = mock((_gid: string, _payload: unknown) => {});
const broadcastGameState = mock(async (_gid: string, _prisma: unknown) => {});

mock.module("../../src/ws/game-socket.ts", () => ({
  broadcastToGame,
  broadcastGameState,
}));

const { GameInstanceService } = await import(
  "../../src/trpc/services/game-instance.service"
);

function makeGameInstance(id: number, over: Partial<GameInstance> = {}): GameInstance {
  const now = new Date();
  return {
    id,
    type: over.type ?? null,
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

describe("GameInstanceService — Tests unitaires (CRUD via factory)", () => {
  const { service, wasMethodCalled } = createServiceTestSetup(
    GameInstanceService,
    makeGameInstance,
    "gameInstance"
  );

  it("findAll retourne toutes les instances de jeu", async () => {
    const result = await service.findAll();
    expect(result).toHaveLength(1);
    expect(wasMethodCalled("findMany")).toBeTrue();
  });

  it("findOne retourne une instance par ID", async () => {
    const result = await service.findOne(7);
    expect(result).toMatchObject({ id: 7 });
    expect(wasMethodCalled("findUnique")).toBeTrue();
  });

  it("delete supprime une instance", async () => {
    const result = await service.delete(10);
    expect(result.id).toBe(10);
    expect(wasMethodCalled("delete")).toBeTrue();
  });
});

// ---------------------------------------------------------------------------
// Tests intensifs — create, update, pause, resume, start, abandon, etc.
// ---------------------------------------------------------------------------

function buildPrisma() {
  const tx = {
    gameInstance: {
      update: mock(async (a: { where: { id: number }; data: Record<string, unknown> }) => ({ id: a.where.id, ...a.data })),
      deleteMany: mock(async () => ({ count: 0 })),
    },
    holding: {
      deleteMany: mock(async () => ({ count: 0 })),
    },
    transaction: {
      deleteMany: mock(async () => ({ count: 0 })),
    },
    wallet: {
      deleteMany: mock(async () => ({ count: 0 })),
    },
    gameInstanceEvent: {
      deleteMany: mock(async () => ({ count: 0 })),
      findMany: mock(async (): Promise<unknown[]> => []),
      update: mock(async () => ({})),
    },
  };
  const prisma = {
    gameInstance: {
      findUnique: mock(async (_a?: unknown): Promise<unknown> => null),
      findFirst: mock(async (_a?: unknown): Promise<unknown> => null),
      findMany: mock(async (_a?: unknown): Promise<unknown[]> => []),
      create: mock(async (a: { data: Record<string, unknown> }) => ({ id: 1, ...a.data })),
      update: mock(async (a: { where: { id: number }; data: Record<string, unknown> }) => ({ id: a.where.id, ...a.data })),
      delete: mock(async (a: { where: { id: number } }) => ({ id: a.where.id })),
    },
    user: {
      findUnique: mock(async (_a?: unknown): Promise<unknown> => null),
    },
    level: {
      findUnique: mock(async (_a?: unknown): Promise<unknown> => null),
    },
    gameInstanceEvent: {
      count: mock(async (_a?: unknown): Promise<number> => 0),
      findFirst: mock(async (_a?: unknown): Promise<unknown> => null),
      findMany: mock(async (_a?: unknown): Promise<unknown[]> => []),
      createMany: mock(async () => ({ count: 0 })),
      deleteMany: mock(async () => ({ count: 0 })),
      update: mock(async () => ({})),
    },
    $transaction: mock(async (cb: (t: typeof tx) => Promise<unknown>) => {
      const res = await cb(tx);
      return Array.isArray(res) ? res : [res];
    }),
    _tx: tx,
  };
  return prisma;
}

describe("GameInstanceService — Méthodes complexes", () => {
  let prisma: ReturnType<typeof buildPrisma>;
  let service: InstanceType<typeof GameInstanceService>;

  beforeEach(() => {
    prisma = buildPrisma();
    service = new GameInstanceService(prisma as unknown as PrismaClient);
    cancelGameJobs.mockClear();
    scheduleGameEnd.mockClear();
    scheduleGameEvent.mockClear();
    broadcastToGame.mockClear();
    broadcastGameState.mockClear();
  });

  describe("create", () => {
    it("throw si userId fourni mais utilisateur inexistant", async () => {
      prisma.user.findUnique = mock(async () => null);
      expect(service.create({ userId: "u1", type: "SOLO" } as never)).rejects.toThrow("n'existe pas");
    });

    it("throw si levelId fourni mais niveau inexistant", async () => {
      prisma.user.findUnique = mock(async () => ({ id: "u1" }));
      prisma.level.findUnique = mock(async () => null);
      expect(service.create({ userId: "u1", levelId: 1, type: "SOLO" } as never)).rejects.toThrow("n'existe pas");
    });

    it("throw si déjà une partie active sur ce niveau", async () => {
      prisma.user.findUnique = mock(async () => ({ id: "u1" }));
      prisma.level.findUnique = mock(async () => ({ id: 1, startBalance: 10000 }));
      prisma.gameInstance.findFirst = mock(async () => makeGameInstance(99, { isEnded: false }));
      expect(service.create({ userId: "u1", levelId: 1, type: "SOLO" } as never)).rejects.toThrow("déjà une partie");
    });

    it("crée avec isPaused=true (mode préparation) → ne schedule pas les events", async () => {
      prisma.user.findUnique = mock(async () => ({ id: "u1" }));
      prisma.level.findUnique = mock(async () => ({ id: 1, startBalance: 5000 }));
      prisma.gameInstance.findFirst = mock(async () => null);
      prisma.gameInstance.create = mock(async (a: { data: Record<string, unknown> }) => ({ id: 42, ...a.data }));
      const res = await service.create({ userId: "u1", levelId: 1, type: "SOLO", isPaused: true } as never);
      expect(res.id).toBe(42);
    });

    it("crée et schedule les events si isPaused=false", async () => {
      prisma.user.findUnique = mock(async () => ({ id: "u1" }));
      prisma.level.findUnique = mock(async () => ({ id: 1, startBalance: 5000 }));
      prisma.gameInstance.findFirst = mock(async () => null);
      prisma.gameInstance.create = mock(async (a: { data: Record<string, unknown> }) => ({ ...(a.data as object), id: 50, levelId: 1 }));
      prisma.gameInstance.findUnique = mock(async () => ({ id: 50, levelId: 1, createdAt: new Date(), level: { id: 1, duration: 30, speed: 1, levelEvents: [] } }));
      await service.create({ userId: "u1", levelId: 1, type: "SOLO", isPaused: false } as never);
    });

    it("crée sans userId ni levelId (data brute)", async () => {
      prisma.gameInstance.create = mock(async (a: { data: Record<string, unknown> }) => ({ id: 10, ...a.data }));
      await service.create({ type: "SOLO" } as never);
      expect(prisma.gameInstance.create).toHaveBeenCalledTimes(1);
    });
  });

  describe("update", () => {
    it("throw si id manquant", async () => {
      expect(service.update({ id: 0 } as never)).rejects.toThrow("L'ID est requis");
    });

    it("ne met à jour que les champs définis", async () => {
      await service.update({ id: 1, isPaused: true } as never);
      const args = (prisma.gameInstance.update.mock.calls[0]?.[0] ?? {}) as { data: Record<string, unknown> };
      expect(args.data.isPaused).toBe(true);
      expect(args.data.type).toBeUndefined();
    });

    it("met à jour tous les champs disponibles", async () => {
      await service.update({
        id: 1,
        type: "SOLO",
        userId: "u1",
        levelId: 2,
        startBalance: 5000,
        isPaused: false,
        actionRequired: true,
        pausedAt: null,
        totalPausedDuration: 100,
        currentEventIndex: 3,
        isEnded: false,
        endedAt: null,
      } as never);
      const args = (prisma.gameInstance.update.mock.calls[0]?.[0] ?? {}) as { data: Record<string, unknown> };
      expect(args.data.type).toBe("SOLO");
      expect(args.data.totalPausedDuration).toBe(100);
    });
  });

  describe("findActiveByUser", () => {
    it("retourne la partie active de l'utilisateur", async () => {
      prisma.gameInstance.findFirst = mock(async () => makeGameInstance(1));
      const res = await service.findActiveByUser("u1");
      expect(res?.id).toBe(1);
    });
  });

  describe("abandon", () => {
    it("annule les jobs + marque isEnded=true", async () => {
      await service.abandon(1);
      expect(cancelGameJobs).toHaveBeenCalledWith(1);
      const args = (prisma.gameInstance.update.mock.calls[0]?.[0] ?? {}) as { data: Record<string, unknown> };
      expect(args.data.isEnded).toBe(true);
    });
  });

  describe("findByUser / findByLevel / findBestForLevel", () => {
    it("findByUser filtre par userId", async () => {
      await service.findByUser("u1");
      const args = (prisma.gameInstance.findMany.mock.calls[0]?.[0] ?? {}) as { where: { userId: string } };
      expect(args.where.userId).toBe("u1");
    });

    it("findByLevel filtre par levelId", async () => {
      await service.findByLevel(2);
      const args = (prisma.gameInstance.findMany.mock.calls[0]?.[0] ?? {}) as { where: { levelId: number } };
      expect(args.where.levelId).toBe(2);
    });

    it("findBestForLevel filtre par isEnded=true", async () => {
      prisma.gameInstance.findFirst = mock(async () => makeGameInstance(5, { isEnded: true }));
      const res = await service.findBestForLevel(1, "u1");
      expect(res?.id).toBe(5);
    });
  });

  describe("pause", () => {
    it("throw si gameInstance introuvable", async () => {
      prisma.gameInstance.findUnique = mock(async () => null);
      expect(service.pause(999)).rejects.toThrow("not found");
    });

    it("no-op si déjà en pause", async () => {
      prisma.gameInstance.findUnique = mock(async () => makeGameInstance(1, { isPaused: true }));
      const res = await service.pause(1);
      expect(res.isPaused).toBe(true);
      expect(cancelGameJobs).not.toHaveBeenCalled();
    });

    it("met en pause + annule jobs + broadcast", async () => {
      prisma.gameInstance.findUnique = mock(async () => makeGameInstance(1));
      await service.pause(1);
      expect(cancelGameJobs).toHaveBeenCalledWith(1);
      expect(broadcastToGame).toHaveBeenCalled();
    });
  });

  describe("resume", () => {
    it("throw si gameInstance introuvable", async () => {
      prisma.gameInstance.findUnique = mock(async () => null);
      expect(service.resume(999)).rejects.toThrow("not found");
    });

    it("no-op si pas en pause", async () => {
      prisma.gameInstance.findUnique = mock(async () => makeGameInstance(1, { isPaused: false }));
      const res = await service.resume(1);
      expect(res.isPaused).toBe(false);
    });

    it("force-unpause si isPaused=true mais pausedAt=null", async () => {
      prisma.gameInstance.findUnique = mock(async () => ({ ...makeGameInstance(1, { isPaused: true, pausedAt: null }), level: null }));
      const res = await service.resume(1);
      expect(res).toBeDefined();
      expect(broadcastToGame).toHaveBeenCalled();
    });

    it("retourne early si encore en préparation (0 events scheduled)", async () => {
      prisma.gameInstance.findUnique = mock(async () => ({ ...makeGameInstance(1, { isPaused: true, pausedAt: new Date() }), level: { id: 1, duration: 30, speed: 1 } }));
      prisma.gameInstanceEvent.count = mock(async () => 0);
      const res = await service.resume(1);
      expect(res.isPaused).toBe(true);
    });

    it("resume normal : transaction + shift events + reschedule", async () => {
      const pausedAt = new Date(Date.now() - 60_000);
      prisma.gameInstance.findUnique = mock(async () => ({ ...makeGameInstance(1, { isPaused: true, pausedAt, totalPausedDuration: 0 }), level: { id: 1, duration: 30, speed: 1, levelEvents: [] } }));
      prisma.gameInstanceEvent.count = mock(async () => 2);
      await service.resume(1);
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(broadcastToGame).toHaveBeenCalled();
    });
  });

  describe("start", () => {
    it("throw si gameInstance introuvable", async () => {
      prisma.gameInstance.findUnique = mock(async () => null);
      expect(service.start(999)).rejects.toThrow("not found");
    });

    it("retourne directement si la partie n'est PAS en pause", async () => {
      prisma.gameInstance.findUnique = mock(async () => ({ ...makeGameInstance(1, { isPaused: false }), level: null }));
      const res = await service.start(1);
      expect(res.isPaused).toBe(false);
    });

    it("throw si la partie est terminée", async () => {
      prisma.gameInstance.findUnique = mock(async () => ({ ...makeGameInstance(1, { isPaused: true, isEnded: true }), level: null }));
      expect(service.start(1)).rejects.toThrow("ended");
    });

    it("throw si des events ont déjà été déclenchés", async () => {
      prisma.gameInstance.findUnique = mock(async () => ({ ...makeGameInstance(1, { isPaused: true }), level: null }));
      prisma.gameInstanceEvent.count = mock(async () => 1);
      expect(service.start(1)).rejects.toThrow("already had events");
    });

    it("start avec levelId : reset createdAt + schedule events", async () => {
      prisma.gameInstance.findUnique = mock(async () => ({ ...makeGameInstance(1, { isPaused: true, levelId: 1 }), level: { id: 1, duration: 30, speed: 1, levelEvents: [] } }));
      prisma.gameInstanceEvent.count = mock(async () => 0);
      await service.start(1);
      expect(prisma.gameInstance.update).toHaveBeenCalled();
    });

    it("start sans levelId : juste reset createdAt", async () => {
      prisma.gameInstance.findUnique = mock(async () => ({ ...makeGameInstance(1, { isPaused: true, levelId: null }), level: null }));
      prisma.gameInstanceEvent.count = mock(async () => 0);
      await service.start(1);
      expect(prisma.gameInstance.update).toHaveBeenCalled();
    });
  });

  describe("setActionRequired", () => {
    it("update actionRequired", async () => {
      await service.setActionRequired(1, true);
      const args = (prisma.gameInstance.update.mock.calls[0]?.[0] ?? {}) as unknown as { data: { actionRequired: boolean } };
      expect(args.data.actionRequired).toBe(true);
    });
  });

  describe("getTimeInfo", () => {
    it("retourne null si gameInstance introuvable", async () => {
      prisma.gameInstance.findUnique = mock(async () => null);
      const res = await service.getTimeInfo(999);
      expect(res).toBeNull();
    });

    it("retourne timeInfo si trouvé", async () => {
      prisma.gameInstance.findUnique = mock(async () => ({ ...makeGameInstance(1), level: { id: 1, duration: 30, speed: 1 } }));
      const res = await service.getTimeInfo(1);
      expect(res).toBeDefined();
    });
  });

  describe("completeEvent", () => {
    it("throw si gameInstance introuvable après completeEvent", async () => {
      // findUnique used by GameEventTriggerService.completeEvent returns valid game first
      // then findUnique used by GameInstanceService returns null
      let call = 0;
      prisma.gameInstance.findUnique = mock(async () => {
        call++;
        if (call === 1) {
          return { ...makeGameInstance(1, { levelId: 1 }), level: { id: 1, duration: 30, speed: 1, levelEvents: [] } };
        }
        return null;
      });
      expect(service.completeEvent(1)).rejects.toThrow("not found after");
    });

    it("retourne la game instance mise à jour + broadcast", async () => {
      prisma.gameInstance.findUnique = mock(async () => ({ ...makeGameInstance(1, { levelId: 1 }), level: { id: 1, duration: 30, speed: 1, levelEvents: [] } }));
      const res = await service.completeEvent(1);
      expect(res.id).toBe(1);
      expect(broadcastToGame).toHaveBeenCalled();
    });
  });

  describe("resetLevelForUser", () => {
    it("retourne deletedCount=0 si aucune partie", async () => {
      prisma.gameInstance.findMany = mock(async () => []);
      const res = await service.resetLevelForUser("u1", 1);
      expect(res.deletedCount).toBe(0);
    });

    it("annule les jobs et supprime toutes les parties via transaction", async () => {
      prisma.gameInstance.findMany = mock(async () => [makeGameInstance(1), makeGameInstance(2)]);
      const res = await service.resetLevelForUser("u1", 1);
      expect(res.deletedCount).toBe(2);
      expect(cancelGameJobs).toHaveBeenCalledTimes(2);
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it("continue même si cancelGameJobs throw", async () => {
      prisma.gameInstance.findMany = mock(async () => [makeGameInstance(1)]);
      cancelGameJobs.mockImplementationOnce(async () => { throw new Error("boom"); });
      const res = await service.resetLevelForUser("u1", 1);
      expect(res.deletedCount).toBe(1);
    });
  });
});
