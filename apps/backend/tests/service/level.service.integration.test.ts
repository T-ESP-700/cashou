// tests/service/level.service.integration.test.ts
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { PrismaClient, type Level } from "@cashou/db-app";
import { LevelService } from "../../src/trpc/services/level.service";

const shouldRun = !!process.env.CASHOU_DB_URL;

(shouldRun ? describe : describe.skip)("LevelService — Tests d'intégration", () => {
  const prisma = new PrismaClient();
  const service = new LevelService(prisma);
  let createdId: number | null = null;

  beforeAll(async () => {
    // Reset the sequence to avoid conflicts with seeded data (id=1)
    // Find the max id and set the sequence to start after it
    const result = await prisma.$queryRaw<[{ max: number | null }]>`SELECT MAX(id) as max FROM levels`;
    const maxId = result[0]?.max ?? 0;
    await prisma.$executeRawUnsafe(`ALTER SEQUENCE levels_id_seq RESTART WITH ${maxId + 1}`);
  });

  afterAll(async () => {
    try {
      if (createdId) {
        await prisma.level.delete({ where: { id: createdId } });
      }
    } finally {
      await prisma.$disconnect();
    }
  });

  it("create → findOne → update → delete", async () => {
    const data: Omit<Level, "id" | "createdAt" | "updatedAt"> = {
      title: "Niveau IT",
      number: 101,
      duration: 45,
      speed: 2,
      startBalance: 5000,
      pointsRequired: 250,
      description: "Cas d'intégration",
    };

    const created = await service.create(data);
    expect(created.id).toBeGreaterThan(0);
    createdId = created.id;

    const fetched = await service.findOne(createdId!);
    expect(fetched?.id).toBe(createdId);

    const updated = await service.update(createdId!, { title: "Niveau IT (maj)" });
    expect(updated.title).toBe("Niveau IT (maj)");

    const deleted = await service.delete(createdId!);
    expect(deleted.id).toBe(createdId);
    createdId = null; // Mark as deleted so afterAll doesn't try to delete again
  });
});