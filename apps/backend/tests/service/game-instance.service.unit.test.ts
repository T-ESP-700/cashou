// tests/service/game-instance.service.unit.test.ts
// Tests unitaires — vérifie que resetLevelForUser utilise $transaction
import { describe, test, expect, mock, beforeEach } from "bun:test";
import { GameInstanceService } from "../../src/trpc/services/game-instance.service";
import type { PrismaClient } from "@cashou/db-app";

function createMockPrisma() {
  const txClient = {
    holding: { deleteMany: mock(async () => ({ count: 2 })) },
    transaction: { deleteMany: mock(async () => ({ count: 3 })) },
    wallet: { deleteMany: mock(async () => ({ count: 1 })) },
    gameInstance: { deleteMany: mock(async () => ({ count: 1 })) },
  };

  return {
    gameInstance: {
      findMany: mock(async () => [{ id: 10 }, { id: 11 }]),
      findUnique: mock(),
      create: mock(),
      update: mock(),
      delete: mock(),
      deleteMany: mock(),
    },
    holding: { deleteMany: mock() },
    transaction: { deleteMany: mock() },
    wallet: { deleteMany: mock() },
    user: { findUnique: mock() },
    level: { findUnique: mock() },
    $transaction: mock(async (cb: Function) => cb(txClient)),
    _txClient: txClient,
  };
}

// Mock du module job-queue pour éviter les dépendances externes
mock.module("../../src/lib/job-queue.ts", () => ({
  cancelGameJobs: mock(async () => {}),
}));

describe("GameInstanceService — Transactions atomiques", () => {
  let service: GameInstanceService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    service = new GameInstanceService(mockPrisma as unknown as PrismaClient);
  });

  test("resetLevelForUser utilise $transaction pour les suppressions", async () => {
    const result = await service.resetLevelForUser("user-123", 1);

    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    expect(result.deletedCount).toBe(2);
  });

  test("resetLevelForUser supprime dans l'ordre via tx", async () => {
    await service.resetLevelForUser("user-123", 1);

    const tx = mockPrisma._txClient;
    expect(tx.holding.deleteMany).toHaveBeenCalledTimes(1);
    expect(tx.transaction.deleteMany).toHaveBeenCalledTimes(1);
    expect(tx.wallet.deleteMany).toHaveBeenCalledTimes(1);
    expect(tx.gameInstance.deleteMany).toHaveBeenCalledTimes(1);
  });

  test("resetLevelForUser n'utilise PAS this.prisma pour les deletes", async () => {
    await service.resetLevelForUser("user-123", 1);

    // Les deletes ne doivent PAS passer par this.prisma directement
    expect(mockPrisma.holding.deleteMany).not.toHaveBeenCalled();
    expect(mockPrisma.transaction.deleteMany).not.toHaveBeenCalled();
    expect(mockPrisma.wallet.deleteMany).not.toHaveBeenCalled();
    expect(mockPrisma.gameInstance.deleteMany).not.toHaveBeenCalled();
  });

  test("resetLevelForUser retourne 0 si aucune instance", async () => {
    (mockPrisma.gameInstance.findMany as any).mockResolvedValue([]);

    const result = await service.resetLevelForUser("user-123", 1);

    expect(result.deletedCount).toBe(0);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });
});
