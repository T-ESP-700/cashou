// tests/service/holding.service.unit.test.ts
import { describe, it, expect } from "bun:test";
import type { Prisma, Holding, PrismaClient } from "@cashou/db-app";
import { Prisma as PrismaDecimal } from "@cashou/db-app";
import { HoldingService } from "../../src/trpc/services/holding.service";

type Call =
  | { method: "findMany"; args: Prisma.HoldingFindManyArgs }
  | { method: "findUnique"; args: Prisma.HoldingFindUniqueArgs }
  | { method: "create"; args: Prisma.HoldingCreateArgs }
  | { method: "update"; args: Prisma.HoldingUpdateArgs }
  | { method: "delete"; args: Prisma.HoldingDeleteArgs };

function makePrismaMock() {
  const calls: Call[] = [];

  const prisma = {
    holding: {
      findMany: async (args: Prisma.HoldingFindManyArgs): Promise<Holding[]> => {
        calls.push({ method: "findMany", args });
        return [];
      },
      findUnique: async (args: Prisma.HoldingFindUniqueArgs): Promise<Holding | null> => {
        calls.push({ method: "findUnique", args });
        return null;
      },
      findFirst: async (args: Prisma.HoldingFindFirstArgs): Promise<Holding | null> => {
        // Pour findByWalletAndAsset qui utilise findFirst
        calls.push({ method: "findMany", args: args as unknown as Prisma.HoldingFindManyArgs });
        return null;
      },
      create: async (args: Prisma.HoldingCreateArgs): Promise<Holding> => {
        calls.push({ method: "create", args });
        const now = new Date();
        const data = (args.data ?? {}) as Partial<Holding>;
        return {
          id: 123,
          walletId: (data as Holding).walletId ?? 1,
          assetId: (data as Holding).assetId ?? 1,
          gameInstanceId: (data as Holding).gameInstanceId ?? 1,
          quantity: (data as Holding).quantity ?? new PrismaDecimal.Decimal(0),
          acquiredAt: (data as Holding).acquiredAt ?? now,
          lastInterestAt: (data as Holding).lastInterestAt ?? null,
          createdAt: now,
          updatedAt: now,
        };
      },
      update: async (args: Prisma.HoldingUpdateArgs): Promise<Holding> => {
        calls.push({ method: "update", args });
        const now = new Date();
        const data = (args.data ?? {}) as Partial<Holding>;
        const id = Number((args.where as { id: number }).id);
        return {
          id,
          walletId: (data as Holding).walletId ?? 1,
          assetId: (data as Holding).assetId ?? 1,
          gameInstanceId: (data as Holding).gameInstanceId ?? 1,
          quantity: (data as Holding).quantity ?? new PrismaDecimal.Decimal(0),
          acquiredAt: (data as Holding).acquiredAt ?? now,
          lastInterestAt: (data as Holding).lastInterestAt ?? null,
          createdAt: now,
          updatedAt: now,
        };
      },
      delete: async (args: Prisma.HoldingDeleteArgs): Promise<Holding> => {
        calls.push({ method: "delete", args });
        const now = new Date();
        const id = Number((args.where as { id: number }).id);
        return {
          id,
          walletId: 1,
          assetId: 1,
          gameInstanceId: 1,
          quantity: new PrismaDecimal.Decimal(0),
          acquiredAt: now,
          lastInterestAt: null,
          createdAt: now,
          updatedAt: now,
        };
      },
    },
  };

  void prisma.holding.findMany;
  void prisma.holding.findUnique;
  void prisma.holding.findFirst;
  void prisma.holding.create;
  void prisma.holding.update;
  void prisma.holding.delete;

  return { prisma, calls };
}

describe("HoldingService — Tests unitaires", () => {
  it("findAll utilise orderBy createdAt desc et include correct", async () => {
    const { prisma, calls } = makePrismaMock();
    const service = new HoldingService(prisma as unknown as PrismaClient);
    await service.findAll();
    const entry = calls.find((c) => c.method === "findMany");
    expect(entry).toBeDefined();
    expect(entry?.args).toMatchObject({
      orderBy: { createdAt: "desc" },
    });
  });

  it("findOne utilise where.id et include correct", async () => {
    const { prisma, calls } = makePrismaMock();
    const service = new HoldingService(prisma as unknown as PrismaClient);
    await service.findOne(42);
    const entry = calls.find((c) => c.method === "findUnique");
    expect(entry).toBeDefined();
    if (entry && entry.method === "findUnique") {
      expect(entry.args.where).toEqual({ id: 42 });
    }
  });

  it("create transmet les données et normalise quantity", async () => {
    const { prisma, calls } = makePrismaMock();
    const service = new HoldingService(prisma as unknown as PrismaClient);
    const data = {
      walletId: 1,
      assetId: 2,
      gameInstanceId: 1,
      quantity: 100,
    };
    const created = await service.create(data as any);
    expect(created).toMatchObject({ id: 123 });
    const createCall = calls.find((c) => c.method === "create");
    expect(createCall).toBeDefined();
  });

  it("update transmet where.id + data normalisé", async () => {
    const { prisma, calls } = makePrismaMock();
    const service = new HoldingService(prisma as unknown as PrismaClient);
    const updated = await service.update(7, { quantity: 200 } as any);
    expect(updated).toMatchObject({ id: 7 });
    const updateCall = calls.find((c) => c.method === "update");
    expect(updateCall?.args.where).toEqual({ id: 7 });
    expect(updateCall?.args.data).toBeDefined();
  });

  it("delete transmet where.id", async () => {
    const { prisma, calls } = makePrismaMock();
    const service = new HoldingService(prisma as unknown as PrismaClient);
    const deleted = await service.delete(9);
    expect(deleted.id).toBe(9);
    const deleteCall = calls.find((c) => c.method === "delete");
    expect(deleteCall?.args).toEqual({ where: { id: 9 } });
  });
});
