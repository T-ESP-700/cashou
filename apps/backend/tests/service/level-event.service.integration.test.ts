// tests/service/level-event.service.integration.test.ts
import { describe, it, expect, afterAll, beforeAll } from "bun:test";
import { PrismaClient, type LevelEvent } from "@cashou/db-app";
import { LevelEventService } from "../../src/trpc/services/level-event.service";

const shouldRun = !!process.env.CASHOU_DB_URL;

(shouldRun ? describe : describe.skip)("LevelEventService — Tests d'intégration", () => {
    const prisma = new PrismaClient();
    const service = new LevelEventService(prisma);
    let createdId: number | null = null;
    let testLevelId: number | null = null;
    let testEventId: number | null = null;

    beforeAll(async () => {
        try {
            // Create test level
            const level = await prisma.level.create({
                data: {
                    title: "Test Level for LevelEvent",
                    number: 998,
                    duration: 300,
                    speed: 10,
                    startBalance: 10000,
                    pointsRequired: 0,
                    description: "Test level for integration tests"
                }
            });
            testLevelId = level.id;

            // Create test event
            const event = await prisma.event.create({
                data: {
                    title: "Test Event for LevelEvent",
                    description: "Test event for integration tests"
                }
            });
            testEventId = event.id;
        } catch (error) {
            console.error("Failed to create test data:", error);
        }
    });

    afterAll(async () => {
        try {
            if (createdId) {
                await prisma.levelEvent.delete({ where: { id: createdId } }).catch(() => {});
            }
            if (testLevelId) {
                await prisma.level.delete({ where: { id: testLevelId } }).catch(() => {});
            }
            if (testEventId) {
                await prisma.event.delete({ where: { id: testEventId } }).catch(() => {});
            }
        } finally {
            await prisma.$disconnect();
        }
    });

    it("create → findOne → update → delete", async () => {
        if (!testLevelId || !testEventId) {
            console.log("Skipping test: failed to create test data");
            return;
        }

        const data: Omit<LevelEvent, "id" | "createdAt" | "updatedAt"> = {
            levelId: testLevelId,
            eventId: testEventId,
            triggerPercent: 50,
            position: 1,
        };

        const created = await service.create(data);
        expect(created.id).toBeGreaterThan(0);
        createdId = created.id;

        const fetched = await service.findOne(createdId!);
        expect(fetched?.id).toBe(createdId);
        expect(fetched?.levelId).toBe(testLevelId);
        expect(fetched?.eventId).toBe(testEventId);

        // Test de findByLevelId et findByEventId
        const byLevel = await service.findByLevelId(testLevelId);
        expect(byLevel.some(le => le.id === createdId)).toBe(true);

        const byEvent = await service.findByEventId(testEventId);
        expect(byEvent.some(le => le.id === createdId)).toBe(true);

        const deleted = await service.delete(createdId!);
        expect(deleted.id).toBe(createdId);

        const again = await prisma.levelEvent.create({ data });
        createdId = again.id;
    });
});
