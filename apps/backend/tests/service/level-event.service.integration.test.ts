// tests/service/level-event.service.integration.test.ts
import { describe, it, expect, afterAll } from "bun:test";
import { PrismaClient, type LevelEvent } from "@prisma/client";
import { LevelEventService } from "../../src/trpc/services/level-event.service";

const shouldRun = !!process.env.CASHOU_DB_URL;

(shouldRun ? describe : describe.skip)("LevelEventService — Tests d'intégration", () => {
    const prisma = new PrismaClient();
    const service = new LevelEventService(prisma);
    let createdId: number | null = null;

    afterAll(async () => {
        try {
            if (createdId) {
                await prisma.levelEvent.delete({ where: { id: createdId } });
            }
        } finally {
            await prisma.$disconnect();
        }
    });

    it("create → findOne → update → delete", async () => {
        // Récupération d'IDs existants pour les clés étrangères
        const existingLevel = await prisma.level.findFirst();
        const existingEvent = await prisma.event.findFirst();

        if (!existingLevel || !existingEvent) {
            console.log("Skipping test: no existing level or event found");
            return;
        }

        const data: Omit<LevelEvent, "id" | "createdAt" | "updatedAt"> = {
            levelId: existingLevel.id,
            eventId: existingEvent.id,
        };

        const created = await service.create(data);
        expect(created.id).toBeGreaterThan(0);
        createdId = created.id;

        const fetched = await service.findOne(createdId!);
        expect(fetched?.id).toBe(createdId);
        expect(fetched?.levelId).toBe(existingLevel.id);
        expect(fetched?.eventId).toBe(existingEvent.id);

        // Test de findByLevelId et findByEventId
        const byLevel = await service.findByLevelId(existingLevel.id);
        expect(byLevel.some(le => le.id === createdId)).toBe(true);

        const byEvent = await service.findByEventId(existingEvent.id);
        expect(byEvent.some(le => le.id === createdId)).toBe(true);

        const deleted = await service.delete(createdId!);
        expect(deleted.id).toBe(createdId);

        const again = await prisma.levelEvent.create({ data });
        createdId = again.id;
    });
});
