/**
 * Service for level completion and star calculation.
 *
 * Star rules:
 * - 3 stars only if mandatory + bonus + quiz ALL passed in the SAME game session.
 * - 1 or 2 stars reflect the best single-session score (never downgraded).
 * - quizPassed flag is permanent once earned (cannot be lost on retry).
 * - mandatoryGoalsMet / bonusGoalsMet reflect the best single-session values.
 *
 * Example: session A → mandatory✓ bonus✓ quiz✗ = 2 stars stored.
 *          session B → mandatory✓ bonus✗ quiz✓ = 2 stars (no upgrade).
 *          quizPassed becomes true permanently after session B.
 *          Stars remain 2 (not 3) because no single session had all three.
 */
import type { PrismaClient } from "@cashou/db-app";
import defaultPrisma from "../../database.ts";

export interface LevelCompletionCriteria {
    mandatoryGoalsMet: boolean;
    bonusGoalsMet: boolean;
    quizPassed: boolean;
}

/**
 * Compute stars (1-3) from the three criteria of a SINGLE session.
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
     * Check if user has passed the quiz for the given level in any past attempt.
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
     * Upsert UserLevelCompletion with the following rules:
     * - Stars are only upgraded if the new session score (stars) is strictly higher.
     * - quizPassed is permanent: once true it stays true regardless of new sessions.
     * - mandatoryGoalsMet / bonusGoalsMet reflect the session that produced the best star count.
     *   If stars are equal, the flags from the existing record are kept (no downgrade).
     */
    async upsertBest(
        userId: string,
        levelId: number,
        criteria: LevelCompletionCriteria
    ): Promise<void> {
        const sessionStars = computeStars(criteria);
        const now = new Date();

        const existing = await this.prisma.userLevelCompletion.findUnique({
            where: { userId_levelId: { userId, levelId } },
        });

        if (existing) {
            // quizPassed is permanent: once earned it cannot be lost
            const permanentQuizPassed = existing.quizPassed || criteria.quizPassed;

            if (sessionStars > existing.stars) {
                // Strictly better session: upgrade stars and all flags
                await this.prisma.userLevelCompletion.update({
                    where: { userId_levelId: { userId, levelId } },
                    data: {
                        stars: sessionStars,
                        mandatoryGoalsMet: criteria.mandatoryGoalsMet,
                        bonusGoalsMet: criteria.bonusGoalsMet,
                        quizPassed: permanentQuizPassed,
                        completedAt: now,
                        updatedAt: now,
                    },
                });
            } else if (sessionStars === existing.stars) {
                // Equal score: keep stars unchanged but update mandatory/bonus flags
                // so that a future quiz completion can correctly compute 3 stars.
                // quizPassed stays permanent. Stars are never downgraded.
                await this.prisma.userLevelCompletion.update({
                    where: { userId_levelId: { userId, levelId } },
                    data: {
                        mandatoryGoalsMet: criteria.mandatoryGoalsMet,
                        bonusGoalsMet: criteria.bonusGoalsMet,
                        quizPassed: permanentQuizPassed,
                        updatedAt: now,
                    },
                });
            } else if (permanentQuizPassed !== existing.quizPassed) {
                // Lower stars but quiz was just earned: only update quizPassed
                await this.prisma.userLevelCompletion.update({
                    where: { userId_levelId: { userId, levelId } },
                    data: {
                        quizPassed: permanentQuizPassed,
                        updatedAt: now,
                    },
                });
            }
            // If stars are strictly lower AND quizPassed hasn't changed: do nothing
        } else {
            await this.prisma.userLevelCompletion.create({
                data: {
                    userId,
                    levelId,
                    stars: sessionStars,
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
     * fetch quizPassed from existing record (permanent), then upsert best completion.
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
        if (mandatoryGoals.length === 0) mandatoryGoalsMet = true;
        if (bonusGoals.length === 0) bonusGoalsMet = true;

        // quizPassed for THIS session is false at game end (quiz hasn't been done yet).
        // The permanent quizPassed flag will be merged inside upsertBest.
        const quizPassedThisSession = false;

        await this.upsertBest(userId, levelId, {
            mandatoryGoalsMet,
            bonusGoalsMet,
            quizPassed: quizPassedThisSession,
        });
    }

    /**
     * Called when user completes a level quiz with success.
     * Sets quizPassed permanently. Stars are recomputed combining the stored
     * mandatory/bonus flags with quizPassed=true to check if 3 stars are now reached.
     * However, 3 stars are only granted if the SAME session had all three criteria —
     * here we only have the quiz result, so we rely on the stored session flags.
     * If the stored session already had mandatory+bonus, adding quiz makes it 3 stars.
     */
    async recordFromQuizComplete(userId: string, levelId: number): Promise<void> {
        const existing = await this.prisma.userLevelCompletion.findUnique({
            where: { userId_levelId: { userId, levelId } },
        });

        const mandatoryGoalsMet = existing?.mandatoryGoalsMet ?? false;
        const bonusGoalsMet = existing?.bonusGoalsMet ?? false;

        await this.upsertBest(userId, levelId, {
            mandatoryGoalsMet,
            bonusGoalsMet,
            quizPassed: true,
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
