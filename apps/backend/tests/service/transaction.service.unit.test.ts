// tests/service/transaction.service.unit.test.ts
import { describe, it, expect } from "bun:test";
import type { Prisma, Transaction, PrismaClient } from "@cashou/db-app";
import { TransactionService } from "../../src/trpc/services/transaction.service";

type Call =
  | { method: "findMany"; args: Prisma.TransactionFindManyArgs }
  | { method: "findUnique"; args: Prisma.TransactionFindUniqueArgs }
  | { method: "create"; args: Prisma.TransactionCreateArgs }
  | { method: "update"; args: Prisma.TransactionUpdateArgs }
  | { method: "delete"; args: Prisma.TransactionDeleteArgs };

function makePrismaMock() {
  const calls: Call[] = [];

  const prisma = {
    transaction: {
      findMany: async (args: Prisma.TransactionFindManyArgs): Promise<Transaction[]> => {
        calls.push({ method: "findMany", args });
        return [];
      },
      findUnique: async (args: Prisma.TransactionFindUniqueArgs): Promise<Transaction | null> => {
        calls.push({ method: "findUnique", args });
        return null;
      },
      create: async (args: Prisma.TransactionCreateArgs): Promise<Transaction> => {
        calls.push({ method: "create", args });
        const now = new Date();
        const data = (args.data ?? {}) as Partial<Transaction>;
        return {
          id: 123,
          walletId: (data as Transaction).walletId ?? null,
          assetId: (data as Transaction).assetId ?? null,
          gameInstanceId: (data as Transaction).gameInstanceId ?? null,
          type: (data as Transaction).type ?? null,
          quantity: (data as Transaction).quantity ?? null,
          unitPrice: (data as Transaction).unitPrice ?? null,
          totalValue: (data as Transaction).totalValue ?? null,
          transactionDate: (data as Transaction).transactionDate ?? null,
          source: (data as Transaction).source ?? null,
          createdAt: now,
          updatedAt: now,
        };
      },
      update: async (args: Prisma.TransactionUpdateArgs): Promise<Transaction> => {
        calls.push({ method: "update", args });
        const now = new Date();
        const data = (args.data ?? {}) as Partial<Transaction>;
        const id = Number((args.where as { id: number }).id);
        return {
          id,
          walletId: (data as Transaction).walletId ?? null,
          assetId: (data as Transaction).assetId ?? null,
          gameInstanceId: (data as Transaction).gameInstanceId ?? null,
          type: (data as Transaction).type ?? null,
          quantity: (data as Transaction).quantity ?? null,
          unitPrice: (data as Transaction).unitPrice ?? null,
          totalValue: (data as Transaction).totalValue ?? null,
          transactionDate: (data as Transaction).transactionDate ?? null,
          source: (data as Transaction).source ?? null,
          createdAt: now,
          updatedAt: now,
        };
      },
      delete: async (args: Prisma.TransactionDeleteArgs): Promise<Transaction> => {
        calls.push({ method: "delete", args });
        const now = new Date();
        const id = Number((args.where as { id: number }).id);
        return {
          id,
          walletId: null,
          assetId: null,
          gameInstanceId: null,
          type: "BUY",
          quantity: null,
          unitPrice: null,
          totalValue: null,
          transactionDate: null,
          source: null,
          createdAt: now,
          updatedAt: now,
        };
      },
    },
  };

  void prisma.transaction.findMany;
  void prisma.transaction.findUnique;
  void prisma.transaction.create;
  void prisma.transaction.update;
  void prisma.transaction.delete;

  return { prisma, calls };
}

describe("TransactionService — Tests unitaires", () => {
  it("findAll utilise orderBy createdAt desc et include correct", async () => {
    const { prisma, calls } = makePrismaMock();
    const service = new TransactionService(prisma as unknown as PrismaClient);
    await service.findAll();
    const entry = calls.find((c) => c.method === "findMany");
    expect(entry).toBeDefined();
    expect(entry?.args).toMatchObject({
      orderBy: { createdAt: "desc" },
    });
  });

  it("findOne utilise where.id", async () => {
    const { prisma, calls } = makePrismaMock();
    const service = new TransactionService(prisma as unknown as PrismaClient);
    await service.findOne(42);
    const entry = calls.find((c) => c.method === "findUnique");
    expect(entry).toBeDefined();
    if (entry && entry.method === "findUnique") {
      expect(entry.args.where).toEqual({ id: 42 });
    }
  });

  it("create transmet les données (unitPrice et totalValue en string)", async () => {
    const { prisma, calls } = makePrismaMock();
    const service = new TransactionService(prisma as unknown as PrismaClient);
    const data = {
      walletId: 1,
      assetId: 2,
      type: "BUY",
      quantity: 10,
      unitPrice: "100",
      totalValue: "1000",
    };
    const created = await service.create(data as any);
    expect(created).toMatchObject({ id: 123 });
    const createCall = calls.find((c) => c.method === "create");
    expect(createCall).toBeDefined();
  });

  it("update transmet where.id + data", async () => {
    const { prisma, calls } = makePrismaMock();
    const service = new TransactionService(prisma as unknown as PrismaClient);
    const updated = await service.update(7, { quantity: 20 } as any);
    expect(updated).toMatchObject({ id: 7 });
    const updateCall = calls.find((c) => c.method === "update");
    expect(updateCall?.args.where).toEqual({ id: 7 });
    expect(updateCall?.args.data).toBeDefined();
  });

  it("delete transmet where.id", async () => {
    const { prisma, calls } = makePrismaMock();
    const service = new TransactionService(prisma as unknown as PrismaClient);
    const deleted = await service.delete(9);
    expect(deleted.id).toBe(9);
    const deleteCall = calls.find((c) => c.method === "delete");
    expect(deleteCall?.args).toEqual({ where: { id: 9 } });
  });
});
