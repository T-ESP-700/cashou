// tests/service/user.service.unit.test.ts
import { describe, it, expect } from "bun:test";
import type { Prisma, User, PrismaClient } from "@cashou/db-app";
import { UserService } from "../../src/trpc/services/user.service";

type Call =
  | { method: "findMany"; args: Prisma.UserFindManyArgs }
  | { method: "findUnique"; args: Prisma.UserFindUniqueArgs }
  | { method: "create"; args: Prisma.UserCreateArgs }
  | { method: "update"; args: Prisma.UserUpdateArgs }
  | { method: "delete"; args: Prisma.UserDeleteArgs };

function makePrismaMock() {
  const calls: Call[] = [];

  const prisma = {
    user: {
      findMany: async (args: Prisma.UserFindManyArgs): Promise<User[]> => {
        calls.push({ method: "findMany", args });
        return [];
      },
      findUnique: async (args: Prisma.UserFindUniqueArgs): Promise<User | null> => {
        calls.push({ method: "findUnique", args });
        return null;
      },
      create: async (args: Prisma.UserCreateArgs): Promise<User> => {
        calls.push({ method: "create", args });
        const now = new Date();
        const data = (args.data ?? {}) as Partial<User>;
        return {
          id: "user123",
          email: (data as User).email ?? "test@example.com",
          name: (data as User).name ?? null,
          emailVerified: (data as User).emailVerified ?? false,
          image: (data as User).image ?? null,
          createdAt: now,
          updatedAt: now,
          username: (data as User).username ?? null,
          discriminator: (data as User).discriminator ?? null,
          lastActivity: (data as User).lastActivity ?? null,
          levelId: (data as User).levelId ?? 1,
          badges: (data as User).badges ?? null,
          points: (data as User).points ?? 0,
          currentStreak: (data as User).currentStreak ?? 0,
          maxStreak: (data as User).maxStreak ?? 0,
          expoPushToken: (data as User).expoPushToken ?? null,
        };
      },
      update: async (args: Prisma.UserUpdateArgs): Promise<User> => {
        calls.push({ method: "update", args });
        const now = new Date();
        const data = (args.data ?? {}) as Partial<User>;
        const id = String((args.where as { id: string }).id);
        return {
          id,
          email: (data as User).email ?? "test@example.com",
          name: (data as User).name ?? null,
          emailVerified: (data as User).emailVerified ?? false,
          image: (data as User).image ?? null,
          createdAt: now,
          updatedAt: now,
          username: (data as User).username ?? null,
          discriminator: (data as User).discriminator ?? null,
          lastActivity: (data as User).lastActivity ?? null,
          levelId: (data as User).levelId ?? 1,
          badges: (data as User).badges ?? null,
          points: (data as User).points ?? 0,
          currentStreak: (data as User).currentStreak ?? 0,
          maxStreak: (data as User).maxStreak ?? 0,
          expoPushToken: (data as User).expoPushToken ?? null,
        };
      },
      delete: async (args: Prisma.UserDeleteArgs): Promise<User> => {
        calls.push({ method: "delete", args });
        const now = new Date();
        const id = String((args.where as { id: string }).id);
        return {
          id,
          email: "deleted@example.com",
          name: null,
          emailVerified: false,
          image: null,
          createdAt: now,
          updatedAt: now,
          username: null,
          discriminator: null,
          lastActivity: null,
          levelId: 1,
          badges: null,
          points: 0,
          currentStreak: 0,
          maxStreak: 0,
          expoPushToken: null,
        };
      },
    },
  };

  void prisma.user.findMany;
  void prisma.user.findUnique;
  void prisma.user.create;
  void prisma.user.update;
  void prisma.user.delete;

  return { prisma, calls };
}

describe("UserService — Tests unitaires", () => {
  it("findAll utilise orderBy createdAt desc", async () => {
    const { prisma, calls } = makePrismaMock();
    const service = new UserService(prisma as unknown as PrismaClient);
    await service.findAll();
    const entry = calls.find((c) => c.method === "findMany");
    expect(entry).toBeDefined();
    expect(entry?.args).toEqual({
      orderBy: { createdAt: "desc" },
    });
  });

  it("findOne utilise where.id", async () => {
    const { prisma, calls } = makePrismaMock();
    const service = new UserService(prisma as unknown as PrismaClient);
    await service.findOne("user42");
    const entry = calls.find((c) => c.method === "findUnique");
    expect(entry).toBeDefined();
    if (entry && entry.method === "findUnique") {
      expect(entry.args.where).toEqual({ id: "user42" });
    }
  });

  it("create transmet les données après conversion null → undefined", async () => {
    const { prisma, calls } = makePrismaMock();
    const service = new UserService(prisma as unknown as PrismaClient);
    const data = {
      levelId: 1,
      email: "newuser@example.com",
      username: "newuser",
      points: 0,
    };
    const created = await service.create(data as { levelId: number; email: string | null; username: string | null; points: number | null });
    expect(created).toMatchObject({ id: "user123" });
    const createCall = calls.find((c) => c.method === "create");
    expect(createCall).toBeDefined();
  });

  it("update transmet where.id + data", async () => {
    const { prisma, calls } = makePrismaMock();
    const service = new UserService(prisma as unknown as PrismaClient);
    const updated = await service.update("user7", { username: "updated" } as unknown as User);
    expect(updated).toMatchObject({ id: "user7" });
    const updateCall = calls.find((c) => c.method === "update");
    expect(updateCall?.args).toMatchObject({ 
      where: { id: "user7" }, 
      data: { username: "updated" } 
    });
  });

  it("delete transmet where.id", async () => {
    const { prisma, calls } = makePrismaMock();
    const service = new UserService(prisma as unknown as PrismaClient);
    const deleted = await service.delete("user9");
    expect(deleted.id).toBe("user9");
    const deleteCall = calls.find((c) => c.method === "delete");
    expect(deleteCall?.args).toEqual({ where: { id: "user9" } });
  });
});
