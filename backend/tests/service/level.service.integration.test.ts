import { describe, it, expect, afterAll } from "bun:test";
import { PrismaClient } from "@prisma/client";
import {LevelService} from "../../src/services/level.service.ts";

const shouldRun = !!process.env.CASHOU_DB_URL;

(shouldRun ? describe : describe.skip)("LevelService — Tests d'intégration", () => {
  const prisma = new PrismaClient();
  const service = new LevelService(prisma as any);
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
    // create
    const data = {
      title: "Niveau IT",
      number: 101,
      duration: 45,
      speed: 2,
      startBalance: 5000,
      pointsRequired: 250,
      description: "Cas d'intégration",
    };
    const created = await service.create(data as any);
    expect(created.id).toBeGreaterThan(0);
    createdId = created.id;

    // findOne
    const fetched = await service.findOne(createdId!);
    expect(fetched?.id).toBe(createdId);

    // update
    const updated = await service.update(createdId!, { title: "Niveau IT (maj)" } as any);
    expect(updated.title).toBe("Niveau IT (maj)");

    // delete (et récréation pour clean in afterAll)
    const deleted = await service.delete(createdId!);
    expect(deleted.id).toBe(createdId);
    // on remet pour afterAll (id différent, c'est ok)
    const again = await prisma.level.create({ data });
    createdId = again.id;
  });
});
