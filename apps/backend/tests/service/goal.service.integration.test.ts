// tests/service/goal.service.integration.test.ts
import { describe, it, expect, afterAll } from "bun:test";
import { PrismaClient, type Goal } from "@cashou/db-app";
import { GoalService } from "../../src/trpc/services/goal.service";

const shouldRun = !!process.env.CASHOU_DB_URL;

(shouldRun ? describe : describe.skip)("GoalService — Tests d'intégration", () => {
    const prisma = new PrismaClient();
    const service = new GoalService(prisma);
    let createdId: number | null = null;

    afterAll(async () => {
        try {
            if (createdId) {
                await prisma.goal.delete({ where: { id: createdId } });
            }
        } finally {
            await prisma.$disconnect();
        }
    });

    it("create → findOne → update → delete", async () => {
        const data: Omit<Goal, "id" | "createdAt" | "updatedAt"> = {
            title: "Objectif IT",
            description: "Atteindre 1000 points pour les tests d'intégration",
            goalType: null,
            goalValue: null,
        };

        const created = await service.create(data);
        expect(created.id).toBeGreaterThan(0);
        createdId = created.id;

        const fetched = await service.findOne(createdId!);
        expect(fetched?.id).toBe(createdId);

        const updated = await service.update(createdId!, { title: "Objectif IT (maj)" });
        expect(updated.title).toBe("Objectif IT (maj)");

        const deleted = await service.delete(createdId!);
        expect(deleted.id).toBe(createdId);
        createdId = null; // Mark as deleted so afterAll doesn't try to delete again
    });
});