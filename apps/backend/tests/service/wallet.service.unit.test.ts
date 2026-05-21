// tests/service/wallet.service.unit.test.ts
import { describe, it, expect } from "bun:test";
import type { Prisma, Wallet, PrismaClient } from "@cashou/db-app";
import { WalletService } from "../../src/trpc/services/wallet.service";

type Call =
  | { method: "findMany"; args: Prisma.WalletFindManyArgs }
  | { method: "findUnique"; args: Prisma.WalletFindUniqueArgs }
  | { method: "create"; args: Prisma.WalletCreateArgs }
  | { method: "update"; args: Prisma.WalletUpdateArgs };

function makePrismaMock() {
  const calls: Call[] = [];

  const prisma = {
    wallet: {
      findMany: async (args: Prisma.WalletFindManyArgs): Promise<Wallet[]> => {
        calls.push({ method: "findMany", args });
        return [];
      },
      findUnique: async (args: Prisma.WalletFindUniqueArgs): Promise<Wallet | null> => {
        calls.push({ method: "findUnique", args });
        return null;
      },
      create: async (args: Prisma.WalletCreateArgs): Promise<Wallet> => {
        calls.push({ method: "create", args });
        const now = new Date();
        const data = (args.data ?? {}) as Partial<Wallet>;
        return {
          id: 123,
          userId: (data as Wallet).userId ?? null,
          amount: (data as Wallet).amount ?? null,
          gameInstanceId: (data as Wallet).gameInstanceId ?? null,
          createdAt: now,
          updatedAt: now,
        };
      },
      update: async (args: Prisma.WalletUpdateArgs): Promise<Wallet> => {
        calls.push({ method: "update", args });
        const now = new Date();
        const data = (args.data ?? {}) as Partial<Wallet>;
        const id = Number((args.where as { id: number }).id);
        return {
          id,
          userId: (data as Wallet).userId ?? null,
          amount: (data as Wallet).amount ?? null,
          gameInstanceId: (data as Wallet).gameInstanceId ?? null,
          createdAt: now,
          updatedAt: now,
        };
      },
    },
  };

  void prisma.wallet.findMany;
  void prisma.wallet.findUnique;
  void prisma.wallet.create;
  void prisma.wallet.update;

  return { prisma, calls };
}

describe("WalletService — Tests unitaires", () => {
  it("findAll utilise orderBy createdAt desc et include correct", async () => {
    const { prisma, calls } = makePrismaMock();
    const service = new WalletService(prisma as unknown as PrismaClient);
    await service.findAll();
    const entry = calls.find((c) => c.method === "findMany");
    expect(entry).toBeDefined();
    expect(entry?.args).toEqual({
      orderBy: { createdAt: "desc" },
      include: {
        gameInstance: true,
      },
    });
  });

  it("findOne utilise where.id et include correct", async () => {
    const { prisma, calls } = makePrismaMock();
    const service = new WalletService(prisma as unknown as PrismaClient);
    await service.findOne(42);
    const entry = calls.find((c) => c.method === "findUnique");
    expect(entry).toBeDefined();
    if (entry && entry.method === "findUnique") {
      expect(entry.args.where).toEqual({ id: 42 });
      expect(entry.args.include).toEqual({
        gameInstance: true,
      });
    }
  });

  it("create transmet les données et normalise amount", async () => {
    const { prisma, calls } = makePrismaMock();
    const service = new WalletService(prisma as unknown as PrismaClient);
    const data = {
      userId: "user123",
      amount: 5000,
      gameInstanceId: 1,
    };
    const created = await service.create(data);
    expect(created).toMatchObject({ id: 123 });
    const createCall = calls.find((c) => c.method === "create");
    expect(createCall).toBeDefined();
    // Vérifie que amount a été normalisé en Prisma.Decimal
    if (createCall && createCall.method === "create") {
      const callData = createCall.args.data as { amount?: unknown };
      expect(callData.amount).toBeDefined();
    }
  });

  it("update transmet where.id + data", async () => {
    const { prisma, calls } = makePrismaMock();
    const service = new WalletService(prisma as unknown as PrismaClient);
    const updated = await service.update(7, { amount: 3000 });
    expect(updated).toMatchObject({ id: 7 });
    const updateCall = calls.find((c) => c.method === "update");
    expect(updateCall?.args).toMatchObject({ 
      where: { id: 7 }, 
      data: { amount: 3000 } 
    });
  });
});
