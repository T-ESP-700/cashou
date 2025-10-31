// tests/service/level-goal.service.integration.test.ts
import { describe, it, expect, afterAll } from "bun:test";
import { PrismaClient, type LevelGoal } from "@prisma/client";
import { LevelGoalService } from "../../src/trpc/services/level-goal.service";

const shouldRun = !!process.env.CASHOU_DB_URL;

(shouldRun ? describe : describe.skip)("LevelGoalService — Tests d'intégration", () => {
    const prisma = new PrismaClient();
    const service = new LevelGoalService(prisma);
    let createdId: number | null = null;

    afterAll(async () => {
        try {
            if (createdId) {
                await prisma.levelGoal.delete({ where: { id: createdId } });
            }
        } finally {
            await prisma.$disconnect();
        }
    });

    it("create → findOne → update → delete", async () => {
        // Récupération d'IDs existants pour les clés étrangères
        const existingLevel = await prisma.level.findFirst();
        const existingGoal = await prisma.goal.findFirst();

        if (!existingLevel || !existingGoal) {
            console.log("Skipping test: no existing level or goal found");
            return;
        }

        const data: Omit<LevelGoal, "id" | "createdAt" | "updatedAt"> = {
            levelId: existingLevel.id,
            goalId: existingGoal.id,
        };

        const created = await service.create(data);
        expect(created.id).toBeGreaterThan(0);
        createdId = created.id;

        const fetched = await service.findOne(createdId!);
        expect(fetched?.id).toBe(createdId);
        expect(fetched?.levelId).toBe(existingLevel.id);
        expect(fetched?.goalId).toBe(existingGoal.id);

        // Test de findByLevelId et findByGoalId
        const byLevel = await service.findByLevelId(existingLevel.id);
        expect(byLevel.some(lg => lg.id === createdId)).toBe(true);

        const byGoal = await service.findByGoalId(existingGoal.id);
        expect(byGoal.some(lg => lg.id === createdId)).toBe(true);

        const deleted = await service.delete(createdId!);
        expect(deleted.id).toBe(createdId);

        const again = await prisma.levelGoal.create({ data });
        createdId = again.id;
    });
});
