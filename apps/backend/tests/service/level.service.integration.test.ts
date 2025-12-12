// tests/service/level.service.integration.test.ts
import { describe, it, expect, afterAll } from "bun:test";
import { PrismaClient, type Level } from "@cashou/db-app";
import { LevelService } from "../../src/trpc/services/level.service";

const shouldRun = !!process.env.CASHOU_DB_URL;

(shouldRun ? describe : describe.skip)("LevelService — Tests d'intégration", () => {
  const prisma = new PrismaClient();
  const service = new LevelService(prisma); // Suppression du "as unknown"
  let createdId: number | null = null;

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

    const created = await service.create(data); // Suppression du "as unknown as Level"
    expect(created.id).toBeGreaterThan(0);
    createdId = created.id;

    const fetched = await service.findOne(createdId!);
    expect(fetched?.id).toBe(createdId);

    const updated = await service.update(createdId!, { title: "Niveau IT (maj)" }); // Suppression du "as unknown as Level"
    expect(updated.title).toBe("Niveau IT (maj)");

    const deleted = await service.delete(createdId!);
    expect(deleted.id).toBe(createdId);

    const again = await prisma.level.create({ data });
    createdId = again.id;
  });
});