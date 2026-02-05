// tests/service/level.service.integration.test.ts
import { describe, it, expect, afterAll } from "bun:test";
import { PrismaClient, type Level } from "@cashou/db-app";
import { LevelService } from "../../src/trpc/services/level.service";

const shouldRun = !!process.env.CASHOU_DB_URL;

(shouldRun ? describe : describe.skip)("LevelService — Tests d'intégration", () => {
  const prisma = new PrismaClient();
  const service = new LevelService(prisma);
  let createdId: number | null = null;
  // Use a unique number to avoid conflicts with seeded data
  const uniqueNumber = 10000 + Math.floor(Math.random() * 89999);

  afterAll(async () => {
    try {
      if (createdId) {
        await prisma.level.delete({ where: { id: createdId } }).catch(() => {});
      }
    } finally {
      await prisma.$disconnect();
    }
  });

  it("create → findOne → update → delete", async () => {
    const data: Omit<Level, "id" | "createdAt" | "updatedAt"> = {
      title: `Niveau IT ${uniqueNumber}`,
      number: uniqueNumber,
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

    const updated = await service.update(createdId!, { title: `Niveau IT ${uniqueNumber} (maj)` });
    expect(updated.title).toBe(`Niveau IT ${uniqueNumber} (maj)`);

    const deleted = await service.delete(createdId!);
    expect(deleted.id).toBe(createdId);
    createdId = null; // Mark as deleted so afterAll doesn't try to delete again
  });
});