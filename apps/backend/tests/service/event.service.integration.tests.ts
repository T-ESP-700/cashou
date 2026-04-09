// tests/service/event.service.integration.test.ts
import { describe, it, expect, afterAll } from "bun:test";
import { PrismaClient, type Event } from "@cashou/db-app";
import { EventService } from "../../src/trpc/services/event.service";

const shouldRun = !!process.env.CASHOU_DB_URL;

(shouldRun ? describe : describe.skip)("EventService — Tests d'intégration", () => {
    const prisma = new PrismaClient();
    const service = new EventService(prisma);
    let createdId: number | null = null;

    afterAll(async () => {
        try {
            if (createdId) {
                await prisma.event.delete({ where: { id: createdId } });
            }
        } finally {
            await prisma.$disconnect();
        }
    });

    it("create → findOne → update → delete", async () => {
        const data: Omit<Event, "id" | "createdAt" | "updatedAt"> = {
            title: "Événement IT",
            description: "Crise économique majeure pour les tests d'intégration",
            hasImpact: true,
        };

        const created = await service.create(data);
        expect(created.id).toBeGreaterThan(0);
        createdId = created.id;

        const fetched = await service.findOne(createdId!);
        expect(fetched?.id).toBe(createdId);

        const updated = await service.update(createdId!, { title: "Événement IT (maj)" });
        expect(updated.title).toBe("Événement IT (maj)");

        const deleted = await service.delete(createdId!);
        expect(deleted.id).toBe(createdId);

        const again = await prisma.event.create({ data });
        createdId = again.id;
    });
});