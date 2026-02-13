// tests/service/user.service.unit.test.ts
// Tests unitaires — vérifie que UserService.addPoints utilise $transaction
import { describe, test, expect, mock, beforeEach } from "bun:test";
import { UserService } from "../../src/trpc/services/user.service";
import type { PrismaClient } from "@prisma/client";

function createMockPrisma() {
  const txClient = {
    user: {
      findUnique: mock(async () => ({ id: 1, points: 100 })),
      update: mock(async () => ({ id: 1, points: 150 })),
    },
  };

  return {
    user: {
      findMany: mock(),
      findUnique: mock(),
      findFirst: mock(),
      create: mock(),
      update: mock(),
      delete: mock(),
    },
    $transaction: mock(async (cb: Function) => cb(txClient)),
    _txClient: txClient,
  };
}

describe("UserService — Transactions atomiques", () => {
  let service: UserService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    service = new UserService(mockPrisma as unknown as PrismaClient);
  });

  test("addPoints utilise $transaction", async () => {
    await service.addPoints(1, 50);

    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
  });

  test("addPoints lit et écrit via le client transactionnel (tx)", async () => {
    await service.addPoints(1, 50);

    expect(mockPrisma._txClient.user.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
    });
    expect(mockPrisma._txClient.user.update).toHaveBeenCalledTimes(1);
  });

  test("addPoints additionne correctement les points", async () => {
    // user.points = 100, on ajoute 50
    await service.addPoints(1, 50);

    const updateCall = (mockPrisma._txClient.user.update as any).mock.calls[0];
    expect(updateCall[0].data.points).toBe(150);
  });

  test("addPoints throw si utilisateur introuvable", async () => {
    (mockPrisma._txClient.user.findUnique as any).mockResolvedValue(null);

    expect(service.addPoints(999, 50)).rejects.toThrow("Utilisateur introuvable");
  });
});
