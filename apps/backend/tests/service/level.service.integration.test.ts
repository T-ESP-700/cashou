// tests/service/level.service.integration.test.ts
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { PrismaClient, type Level } from "@cashou/db-app";
import { LevelService } from "../../src/trpc/services/level.service";

const shouldRun = !!process.env.CASHOU_DB_URL;

(shouldRun ? describe : describe.skip)("LevelService — Tests d'intégration", () => {
  const prisma = new PrismaClient();
  const service = new LevelService(prisma); // Suppression du "as unknown"
  let createdId: number | null = null;

  beforeAll(async () => {
    // Clean up any existing test data with number 9999
    await prisma.level.deleteMany({
      where: {
        number: 9999
      }
    });
    // Reset the sequence to avoid ID conflicts
    // This ensures the next ID will be higher than any existing ID
    await prisma.$executeRawUnsafe(`
      SELECT setval(
        pg_get_serial_sequence('levels', 'id'),
        COALESCE((SELECT MAX(id) FROM levels), 1),
        true
      );
    `).catch(() => {
      // Ignore errors if sequence doesn't exist or table is empty
    });
  });

  afterAll(async () => {
    try {
      if (createdId) {
        await prisma.level.delete({ where: { id: createdId } }).catch(() => {});
      }
      // Clean up any remaining test data
      await prisma.level.deleteMany({
        where: {
          number: 9999
        }
      });
    } finally {
      await prisma.$disconnect();
    }
  });

  it("create → findOne → update → delete", async () => {
    // Ensure cleanup before creating
    await prisma.level.deleteMany({
      where: {
        number: 9999
      }
    });

    const data: Omit<Level, "id" | "createdAt" | "updatedAt"> = {
      title: "Niveau IT Test",
      number: 9999, // Use a unique number unlikely to conflict with real data
      duration: 45,
      speed: 2,
      startBalance: 5000,
      pointsRequired: 250,
      description: "Cas d'intégration test",
    };

    const created = await service.create(data); // Suppression du "as unknown as Level"
    expect(created.id).toBeGreaterThan(0);
    createdId = created.id;

    const fetched = await service.findOne(createdId!);
    expect(fetched?.id).toBe(createdId);

    const updated = await service.update(createdId!, { title: "Niveau IT Test (maj)" }); // Suppression du "as unknown as Level"
    expect(updated.title).toBe("Niveau IT Test (maj)");

    const deleted = await service.delete(createdId!);
    expect(deleted.id).toBe(createdId);

    createdId = null; // Mark as deleted so afterAll doesn't try to delete again
  });
});
