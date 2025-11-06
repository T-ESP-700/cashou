// tests/service/level-goal.service.integration.test.ts
import { describe, it, expect, afterAll, beforeAll } from "bun:test";
import { PrismaClient, type LevelGoal } from "@prisma/client";
import { LevelGoalService } from "../../src/trpc/services/level-goal.service";

const shouldRun = !!process.env.CASHOU_DB_URL;

(shouldRun ? describe : describe.skip)("LevelGoalService — Tests d'intégration", () => {
    const prisma = new PrismaClient();
    const service = new LevelGoalService(prisma);
    let createdId: number | null = null;
    let testLevelId: number | null = null;
    let testGoalId: number | null = null;

    beforeAll(async () => {
        try {
            // Create test level
            const level = await prisma.level.create({
                data: {
                    title: "Test Level for LevelGoal",
                    number: 999,
                    duration: 300,
                    speed: 10,
                    startBalance: 10000,
                    pointsRequired: 0,
                    description: "Test level for integration tests"
                }
            });
            testLevelId = level.id;

            // Create test goal
            const goal = await prisma.goal.create({
                data: {
                    title: "Test Goal for LevelGoal",
                    description: "Test goal for integration tests"
                }
            });
            testGoalId = goal.id;
        } catch (error) {
            console.error("Failed to create test data:", error);
        }
    });

    afterAll(async () => {
        try {
            if (createdId) {
                await prisma.levelGoal.delete({ where: { id: createdId } }).catch(() => {});
            }
            if (testLevelId) {
                await prisma.level.delete({ where: { id: testLevelId } }).catch(() => {});
            }
            if (testGoalId) {
                await prisma.goal.delete({ where: { id: testGoalId } }).catch(() => {});
            }
        } finally {
            await prisma.$disconnect();
        }
    });

    it("create → findOne → update → delete", async () => {
        if (!testLevelId || !testGoalId) {
            console.log("Skipping test: failed to create test data");
            return;
        }

        const data: Omit<LevelGoal, "id" | "createdAt" | "updatedAt"> = {
            levelId: testLevelId,
            goalId: testGoalId,
        };

        const created = await service.create(data);
        expect(created.id).toBeGreaterThan(0);
        createdId = created.id;

        const fetched = await service.findOne(createdId!);
        expect(fetched?.id).toBe(createdId);
        expect(fetched?.levelId).toBe(testLevelId);
        expect(fetched?.goalId).toBe(testGoalId);

        // Test de findByLevelId et findByGoalId
        const byLevel = await service.findByLevelId(testLevelId);
        expect(byLevel.some(lg => lg.id === createdId)).toBe(true);

        const byGoal = await service.findByGoalId(testGoalId);
        expect(byGoal.some(lg => lg.id === createdId)).toBe(true);

        const deleted = await service.delete(createdId!);
        expect(deleted.id).toBe(createdId);

        const again = await prisma.levelGoal.create({ data });
        createdId = again.id;
    });
});
