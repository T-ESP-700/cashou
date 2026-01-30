/**
 * Service for level completion and star calculation.
 * Stores best result per (userId, levelId) and updates on game end or quiz completion.
 */
import type { PrismaClient } from "@cashou/db-app";
import defaultPrisma from "../../database.ts";

export interface LevelCompletionCriteria {
    mandatoryGoalsMet: boolean;
    bonusGoalsMet: boolean;
    quizPassed: boolean;
}

/**
 * Compute stars (1-3) from the three criteria.
 * 3 stars = all three; 2 stars = two of three; 1 star = at least one.
 */
export function computeStars(criteria: LevelCompletionCriteria): number {
    const count =
        (criteria.mandatoryGoalsMet ? 1 : 0) +
        (criteria.bonusGoalsMet ? 1 : 0) +
        (criteria.quizPassed ? 1 : 0);
    return Math.max(1, Math.min(3, count));
}

export class LevelCompletionService {
    private prisma: PrismaClient;

    constructor(prismaClient?: PrismaClient) {
        this.prisma = prismaClient || defaultPrisma;
    }

    /**
     * Check if user has passed at least one quiz for the given level.
     */
    async hasQuizPassedForLevel(userId: string, levelId: number): Promise<boolean> {
        const count = await this.prisma.userQuiz.count({
            where: {
                userId,
                isCorrect: true,
                completedAt: { not: null },
                quiz: { levelId },
            },
        });
        return count > 0;
    }

    /**
     * Upsert UserLevelCompletion keeping the best result (only update if new stars >= existing).
     */
    async upsertBest(
        userId: string,
        levelId: number,
        criteria: LevelCompletionCriteria
    ): Promise<void> {
        const stars = computeStars(criteria);
        const now = new Date();

        const existing = await this.prisma.userLevelCompletion.findUnique({
            where: { userId_levelId: { userId, levelId } },
        });

        if (existing) {
            if (stars < existing.stars) return;
            await this.prisma.userLevelCompletion.update({
                where: { userId_levelId: { userId, levelId } },
                data: {
                    stars,
                    mandatoryGoalsMet: criteria.mandatoryGoalsMet,
                    bonusGoalsMet: criteria.bonusGoalsMet,
                    quizPassed: criteria.quizPassed,
                    completedAt: now,
                    updatedAt: now,
                },
            });
        } else {
            await this.prisma.userLevelCompletion.create({
                data: {
                    userId,
                    levelId,
                    stars,
                    mandatoryGoalsMet: criteria.mandatoryGoalsMet,
                    bonusGoalsMet: criteria.bonusGoalsMet,
                    quizPassed: criteria.quizPassed,
                    completedAt: now,
                },
            });
        }
    }

    /**
     * Called after a successful endGame: compute mandatory/bonus from goal results and levelGoals,
     * fetch quizPassed, then upsert best completion.
     */
    async recordFromGameEnd(
        userId: string,
        levelId: number,
        goalResultsByGoalId: Map<number, boolean>,
        levelGoals: Array<{ goalId: number; isMandatory: boolean }>
    ): Promise<void> {
        let mandatoryGoalsMet = true;
        let bonusGoalsMet = true;
        const mandatoryGoals = levelGoals.filter((lg) => lg.isMandatory);
        const bonusGoals = levelGoals.filter((lg) => !lg.isMandatory);

        for (const lg of mandatoryGoals) {
            if (!goalResultsByGoalId.get(lg.goalId)) {
                mandatoryGoalsMet = false;
                break;
            }
        }
        for (const lg of bonusGoals) {
            if (!goalResultsByGoalId.get(lg.goalId)) {
                bonusGoalsMet = false;
                break;
            }
        }
        // If no mandatory/bonus goals defined, keep true
        if (mandatoryGoals.length === 0) mandatoryGoalsMet = true;
        if (bonusGoals.length === 0) bonusGoalsMet = true;

        const quizPassed = await this.hasQuizPassedForLevel(userId, levelId);

        await this.upsertBest(userId, levelId, {
            mandatoryGoalsMet,
            bonusGoalsMet,
            quizPassed,
        });
    }

    /**
     * Called when user completes a quiz with success: set quizPassed true,
     * keep or infer mandatory/bonus from existing completion (or false if none).
     */
    async recordFromQuizComplete(userId: string, levelId: number): Promise<void> {
        const existing = await this.prisma.userLevelCompletion.findUnique({
            where: { userId_levelId: { userId, levelId } },
        });

        const mandatoryGoalsMet = existing?.mandatoryGoalsMet ?? false;
        const bonusGoalsMet = existing?.bonusGoalsMet ?? false;
        const quizPassed = true;

        await this.upsertBest(userId, levelId, {
            mandatoryGoalsMet,
            bonusGoalsMet,
            quizPassed,
        });
    }

    /**
     * Get completion for (userId, levelId) if any.
     */
    async getCompletion(userId: string, levelId: number) {
        return this.prisma.userLevelCompletion.findUnique({
            where: { userId_levelId: { userId, levelId } },
        });
    }

    /**
     * Get all completions for a user (e.g. for level list with stars).
     */
    async getCompletionsByUser(userId: string) {
        return this.prisma.userLevelCompletion.findMany({
            where: { userId },
        });
    }
}
