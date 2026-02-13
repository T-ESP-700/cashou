// tests/service/wallet.service.unit.test.ts
// Tests unitaires — vérifie que WalletService.addAmount utilise $transaction
import { describe, test, expect, mock, beforeEach } from "bun:test";
import { WalletService } from "../../src/trpc/services/wallet.service";
import type { PrismaClient } from "@cashou/db-app";

function createMockPrisma() {
  const txClient = {
    wallet: {
      findUnique: mock(async () => ({ id: 1, amount: "100" })),
      update: mock(async () => ({ id: 1, amount: "150" })),
    },
  };

  return {
    wallet: {
      findMany: mock(),
      findUnique: mock(),
      create: mock(),
      update: mock(),
      delete: mock(),
    },
    $transaction: mock(async (cb: Function) => cb(txClient)),
    _txClient: txClient,
  };
}

describe("WalletService — Transactions atomiques", () => {
  let service: WalletService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    service = new WalletService(mockPrisma as unknown as PrismaClient);
  });

  test("addAmount utilise $transaction", async () => {
    await service.addAmount(1, 50);

    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
  });

  test("addAmount lit et écrit via le client transactionnel (tx)", async () => {
    await service.addAmount(1, 50);

    // Vérifie que findUnique est appelé dans la transaction (pas sur this.prisma)
    expect(mockPrisma._txClient.wallet.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
    });

    // Vérifie que update est appelé dans la transaction
    expect(mockPrisma._txClient.wallet.update).toHaveBeenCalledTimes(1);
  });

  test("addAmount additionne correctement le montant", async () => {
    // wallet.amount = "100", on ajoute 50
    await service.addAmount(1, 50);

    const updateCall = (mockPrisma._txClient.wallet.update as any).mock.calls[0];
    expect(updateCall[0].data.amount).toBe("150");
  });

  test("addAmount throw si wallet introuvable", async () => {
    (mockPrisma._txClient.wallet.findUnique as any).mockResolvedValue(null);

    expect(service.addAmount(999, 50)).rejects.toThrow("Portefeuille introuvable");
  });
});
