// Service métier pour la gestion des participations aux quiz (UserQuiz)
// Couche d'abstraction entre les routers et la base de données
import type { UserQuiz, Quiz, PrismaClient } from "@prisma/client";
import defaultPrisma from "../../database.ts";
import type {UserQuizCreateSchema, UserQuizDataSchema} from "../schemas-zod/user-quiz-schema.ts";

export class UserQuizService {
    private prisma: PrismaClient;

    // Permet d'injecter Prisma pour les tests
    constructor(prismaClient?: PrismaClient) {
        this.prisma = prismaClient || defaultPrisma;
    }

    /**
     * Récupère toutes les participations aux quiz
     * @returns Promise<UserQuiz[]> - Liste complète des participations triées par date de création décroissante
     */
    async findAll(): Promise<UserQuiz[]> {
        return this.prisma.userQuiz.findMany({
            orderBy: { createdAt: 'desc' }, // Tri par date de création décroissante (plus récent en premier)
            // Pas d'include - retourne seulement les données de la table user_quiz
        });
    }

    /**
     * Récupère une participation spécifique par son ID
     * @param id - Identifiant unique de la participation
     * @returns Promise<UserQuiz | null> - La participation trouvée ou null si inexistante
     */
    async findOne(id: number): Promise<UserQuiz | null> {
        return this.prisma.userQuiz.findUnique({
            where: { id }
            // Pas d'include - retourne seulement les données de la table user_quiz
        });
    }

    /**
     * Crée une nouvelle participation à un quiz
     * @param data - Données de la participation validées par le schéma Zod
     * @returns Promise<UserQuiz> - La participation créée avec son ID généré
     */
    async create(data: UserQuizCreateSchema): Promise<UserQuiz> {
        return this.prisma.userQuiz.create({ data });
    }

    /**
     * Met à jour une participation existante
     * @param id - Identifiant de la participation à modifier
     * @param data - Nouvelles données validées par le schéma Zod
     * @returns Promise<UserQuiz> - La participation mise à jour
     */
    async update(id: number, data: Partial<UserQuizDataSchema>): Promise<UserQuiz> {
        return this.prisma.userQuiz.update({
            where: { id },
            data
        });
    }

    /**
     * Supprime une participation
     * @param id - Identifiant de la participation à supprimer
     * @returns Promise<UserQuiz> - La participation supprimée (pour confirmation)
     */
    async delete(id: number): Promise<UserQuiz> {
        return this.prisma.userQuiz.delete({ where: { id } });
    }

    /**
     * Récupère toutes les participations d'un utilisateur
     * @param userId - Identifiant de l'utilisateur
     * @returns Promise<UserQuiz[]> - Liste des participations de l'utilisateur
     */
    async findByUser(userId: number): Promise<UserQuiz[]> {
        return this.prisma.userQuiz.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
            // Pas d'include - retourne seulement les données de la table user_quiz
        });
    }

    /**
     * Récupère toutes les participations d'un quiz
     * @param quizId - Identifiant du quiz
     * @returns Promise<UserQuiz[]> - Liste des participations au quiz
     */
    async findByQuiz(quizId: number): Promise<UserQuiz[]> {
        return this.prisma.userQuiz.findMany({
            where: { quizId },
            orderBy: { createdAt: 'desc' }
            // Pas d'include - retourne seulement les données de la table user_quiz
        });
    }

    /**
     * Récupère les participations selon le résultat (réussies ou échouées)
     * @param isCorrect - true pour les réussites, false pour les échecs
     * @returns Promise<UserQuiz[]> - Liste des participations filtrées par résultat
     */
    async findByResult(isCorrect: boolean): Promise<UserQuiz[]> {
        return this.prisma.userQuiz.findMany({
            where: { isCorrect },
            orderBy: { createdAt: 'desc' }
            // Pas d'include - retourne seulement les données de la table user_quiz
        });
    }

    /**
     * Démarre un quiz pour un utilisateur (crée une participation)
     * @param quizId - Identifiant du quiz
     * @param userId - Identifiant de l'utilisateur
     * @returns Promise<UserQuiz> - La participation créée
     */
    async startQuiz(quizId: number, userId: number): Promise<UserQuiz> {
        // Vérifier si l'utilisateur a déjà participé à ce quiz
        const existingParticipation = await this.prisma.userQuiz.findFirst({
            where: { quizId, userId }
        });

        if (existingParticipation) {
            throw new Error("L'utilisateur a déjà participé à ce quiz");
        }

        return this.prisma.userQuiz.create({
            data: { quizId, userId }
        });
    }

    /**
     * Termine un quiz (met à jour avec le résultat et la date de completion)
     * @param id - Identifiant de la participation
     * @param isCorrect - Résultat du quiz
     * @returns Promise<UserQuiz> - La participation mise à jour
     */
    async completeQuiz(id: number, isCorrect: boolean): Promise<UserQuiz> {
        return this.prisma.userQuiz.update({
            where: { id },
            data: {
                isCorrect,
                completedAt: new Date()
            }
        });
    }

    /**
     * Vérifie si un utilisateur a déjà participé à un quiz
     * @param quizId - Identifiant du quiz
     * @param userId - Identifiant de l'utilisateur
     * @returns Promise<boolean> - true si l'utilisateur a déjà participé
     */
    async hasUserParticipated(quizId: number, userId: number): Promise<boolean> {
        const participation = await this.prisma.userQuiz.findFirst({
            where: { quizId, userId }
        });
        return participation !== null;
    }

    /**
     * Récupère les statistiques d'un utilisateur
     * @param userId - Identifiant de l'utilisateur
     * @returns Promise<object> - Statistiques (total, réussites, échecs, taux de réussite)
     */
    async getUserStats(userId: number): Promise<{
        total: number;
        completed: number;
        correct: number;
        incorrect: number;
        successRate: number;
    }> {
        const [total, completed, correct] = await Promise.all([
            this.prisma.userQuiz.count({ where: { userId } }),
            this.prisma.userQuiz.count({ 
                where: { 
                    userId, 
                    completedAt: { not: null } 
                } 
            }),
            this.prisma.userQuiz.count({ 
                where: { 
                    userId, 
                    isCorrect: true 
                } 
            })
        ]);

        const incorrect = completed - correct;
        const successRate = completed > 0 ? (correct / completed) * 100 : 0;

        return {
            total,
            completed,
            correct,
            incorrect,
            successRate: Math.round(successRate * 100) / 100 // Arrondi à 2 décimales
        };
    }

    /**
     * Récupère les statistiques d'un quiz
     * @param quizId - Identifiant du quiz
     * @returns Promise<object> - Statistiques (participants, terminés, réussites, taux de réussite)
     */
    async getQuizStats(quizId: number): Promise<{
        participants: number;
        completed: number;
        correct: number;
        incorrect: number;
        successRate: number;
    }> {
        const [participants, completed, correct] = await Promise.all([
            this.prisma.userQuiz.count({ where: { quizId } }),
            this.prisma.userQuiz.count({ 
                where: { 
                    quizId, 
                    completedAt: { not: null } 
                } 
            }),
            this.prisma.userQuiz.count({ 
                where: { 
                    quizId, 
                    isCorrect: true 
                } 
            })
        ]);

        const incorrect = completed - correct;
        const successRate = completed > 0 ? (correct / completed) * 100 : 0;

        return {
            participants,
            completed,
            correct,
            incorrect,
            successRate: Math.round(successRate * 100) / 100 // Arrondi à 2 décimales
        };
    }

    // === NOUVELLES MÉTHODES POUR LES ROUTES PERSONNALISÉES ===

    /**
     * Obtenir le statut d'un utilisateur sur un quiz spécifique
     */
    async getStatus(userId: number, quizId: number) {
        const participation = await this.prisma.userQuiz.findFirst({
            where: { userId, quizId }
        });

        if (!participation) {
            return {
                started: false,
                completed: false,
                isCorrect: null,
                progress: 0,
                startedAt: null,
                completedAt: null
            };
        }

        return {
            started: true,
            completed: participation.completedAt !== null,
            isCorrect: participation.isCorrect,
            progress: participation.completedAt ? 100 : 50, // 50% si commencé mais pas fini
            startedAt: participation.createdAt,
            completedAt: participation.completedAt
        };
    }

    /**
     * Obtenir tous les quiz en cours pour un utilisateur
     */
    async getInProgressByUser(userId: number) {
        return this.prisma.userQuiz.findMany({
            where: {
                userId,
                completedAt: null // Quiz commencés mais pas terminés
            },
            include: {
                quiz: {
                    select: {
                        id: true,
                        title: true,
                        type: true,
                        levelId: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    /**
     * Abandonner un quiz en cours
     */
    async abandonQuiz(userQuizId: number) {
        // On supprime la participation pour "abandonner" le quiz
        return this.prisma.userQuiz.delete({
            where: { id: userQuizId }
        });
    }

    /**
     * Reprendre un quiz interrompu
     */
    async resumeQuiz(userId: number, quizId: number) {
        const participation = await this.prisma.userQuiz.findFirst({
            where: {
                userId,
                quizId,
                completedAt: null // Pas encore terminé
            },
            include: {
                quiz: {
                    include: {
                        quizQuestions: {
                            include: {
                                question: {
                                    include: {
                                        answers: true
                                    }
                                }
                            },
                            orderBy: { position: 'asc' }
                        }
                    }
                }
            }
        });

        if (!participation) {
            throw new Error("Aucun quiz en cours trouvé pour cet utilisateur");
        }

        return participation;
    }

    /**
     * Obtenir l'historique complet des quiz d'un utilisateur avec pagination
     */
    async getHistoryByUser(userId: number, limit: number = 20, offset: number = 0) {
        const [history, total] = await Promise.all([
            this.prisma.userQuiz.findMany({
                where: {
                    userId,
                    completedAt: { not: null } // Seulement les quiz terminés
                },
                include: {
                    quiz: {
                        select: {
                            id: true,
                            title: true,
                            type: true,
                            levelId: true
                        }
                    }
                },
                orderBy: { completedAt: 'desc' },
                take: limit,
                skip: offset
            }),
            this.prisma.userQuiz.count({
                where: {
                    userId,
                    completedAt: { not: null }
                }
            })
        ]);

        return {
            history,
            pagination: {
                total,
                limit,
                offset,
                hasMore: offset + limit < total
            }
        };
    }

    /**
     * Obtenir le temps écoulé depuis le début d'un quiz
     */
    async getElapsedTime(userQuizId: number) {
        const participation = await this.prisma.userQuiz.findUnique({
            where: { id: userQuizId }
        });

        if (!participation) {
            throw new Error("Participation au quiz introuvable");
        }

        const startedAt = participation.createdAt;
        const now = new Date();
        const elapsedMs = now.getTime() - startedAt.getTime();
        const elapsedMinutes = Math.floor(elapsedMs / (1000 * 60));

        return {
            startedAt,
            elapsedMinutes,
            elapsedSeconds: Math.floor(elapsedMs / 1000)
        };
    }

    /**
     * Statistiques détaillées d'un utilisateur avec période
     */
    async getUserDetailedStats(userId: number, period?: 'week' | 'month' | 'year') {
        let dateFilter = {};
        
        if (period) {
            const now = new Date();
            const startDate = new Date();
            
            switch (period) {
                case 'week':
                    startDate.setDate(now.getDate() - 7);
                    break;
                case 'month':
                    startDate.setMonth(now.getMonth() - 1);
                    break;
                case 'year':
                    startDate.setFullYear(now.getFullYear() - 1);
                    break;
            }
            
            dateFilter = {
                createdAt: { gte: startDate }
            };
        }

        const [basicStats, quizData] = await Promise.all([
            this.getUserStats(userId),
            this.prisma.userQuiz.findMany({
                where: {
                    userId,
                    ...dateFilter
                },
                include: {
                    quiz: {
                        select: {
                            type: true,
                            levelId: true
                        }
                    }
                },
                orderBy: { completedAt: 'desc' }
            })
        ]);

        // Type helper for quiz data with included quiz relation
        type UserQuizWithQuiz = UserQuiz & { quiz: { type: string; levelId: number | null } | null };

        // Analyse par type de quiz
        const dailyQuizzes = quizData.filter((uq: UserQuizWithQuiz) => uq.quiz?.type === 'DAILY');
        const mcqQuizzes = quizData.filter((uq: UserQuizWithQuiz) => uq.quiz?.type === 'MCQ');

        // Calcul des temps moyens (approximatif basé sur la différence entre création et completion)
        const completedQuizzes = quizData.filter((uq: UserQuizWithQuiz) => uq.completedAt);
        const averageCompletionTime = completedQuizzes.length > 0
            ? completedQuizzes.reduce((acc: number, uq: UserQuizWithQuiz) => {
                const timeMs = uq.completedAt!.getTime() - uq.createdAt.getTime();
                return acc + timeMs;
            }, 0) / completedQuizzes.length
            : 0;

        return {
            ...basicStats,
            period,
            dailyQuizStats: {
                total: dailyQuizzes.length,
                completed: dailyQuizzes.filter((uq: UserQuizWithQuiz) => uq.completedAt).length,
                correct: dailyQuizzes.filter((uq: UserQuizWithQuiz) => uq.isCorrect).length
            },
            mcqQuizStats: {
                total: mcqQuizzes.length,
                completed: mcqQuizzes.filter((uq: UserQuizWithQuiz) => uq.completedAt).length,
                correct: mcqQuizzes.filter((uq: UserQuizWithQuiz) => uq.isCorrect).length
            },
            averageCompletionTimeMinutes: Math.round(averageCompletionTime / (1000 * 60))
        };
    }

    /**
     * Obtenir le leaderboard des utilisateurs
     */
    async getLeaderboard(limit: number = 10, period?: 'daily' | 'weekly' | 'monthly') {
        let dateFilter = {};
        
        if (period) {
            const now = new Date();
            const startDate = new Date();
            
            switch (period) {
                case 'daily':
                    startDate.setDate(now.getDate() - 1);
                    break;
                case 'weekly':
                    startDate.setDate(now.getDate() - 7);
                    break;
                case 'monthly':
                    startDate.setMonth(now.getMonth() - 1);
                    break;
            }
            
            dateFilter = {
                completedAt: { gte: startDate }
            };
        }

        // Récupérer tous les quiz terminés avec leurs utilisateurs
        const completedQuizzes = await this.prisma.userQuiz.findMany({
            where: {
                completedAt: { not: null },
                ...dateFilter
            },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        points: true,
                        levelId: true
                    }
                }
            }
        });

        // Grouper par utilisateur et calculer les statistiques
        type UserQuizWithUser = UserQuiz & { user: { id: number; username: string | null; points: number; levelId: number | null } | null };
        const userStatsMap = new Map<number, {
            user: { id: number; username: string | null; points: number; levelId: number | null };
            totalQuizzes: number;
            correctQuizzes: number;
        }>();

        completedQuizzes.forEach((quiz: UserQuizWithUser) => {
            if (!quiz.user) return;
            
            const userId = quiz.user.id;
            const existing = userStatsMap.get(userId) || {
                user: quiz.user,
                totalQuizzes: 0,
                correctQuizzes: 0
            };

            existing.totalQuizzes++;
            if (quiz.isCorrect) {
                existing.correctQuizzes++;
            }

            userStatsMap.set(userId, existing);
        });

        // Convertir en tableau et calculer les scores
        const leaderboard = Array.from(userStatsMap.values()).map(stat => {
            const score = stat.totalQuizzes > 0 ? (stat.correctQuizzes / stat.totalQuizzes) * 100 : 0;
            return {
                user: stat.user,
                totalQuizzes: stat.totalQuizzes,
                correctQuizzes: stat.correctQuizzes,
                score: Math.round(score * 100) / 100
            };
        });

        // Trier par score décroissant, limiter et ajouter le rang
        return leaderboard
            .sort((a, b) => b.score - a.score)
            .slice(0, limit)
            .map((entry, index) => ({
                ...entry,
                rank: index + 1  // Rang commence à 1
            }));
    }

    /**
     * Statistiques par type de quiz
     */
    async getStatsByType(userId: number) {
        const [dailyQuizzes, mcqQuizzes] = await Promise.all([
            this.prisma.userQuiz.findMany({
                where: {
                    userId,
                    quiz: { type: 'DAILY' }
                }
            }),
            this.prisma.userQuiz.findMany({
                where: {
                    userId,
                    quiz: { type: 'MCQ' }
                }
            })
        ]);

        // Calculer les stats pour Daily Quiz
        const dailyTotal = dailyQuizzes.length;
        const dailyCorrect = dailyQuizzes.filter((quiz: UserQuiz) => quiz.isCorrect).length;
        const dailySuccessRate = dailyTotal > 0 ? (dailyCorrect / dailyTotal) * 100 : 0;

        // Calculer les stats pour MCQ
        const mcqTotal = mcqQuizzes.length;
        const mcqCorrect = mcqQuizzes.filter((quiz: UserQuiz) => quiz.isCorrect).length;
        const mcqSuccessRate = mcqTotal > 0 ? (mcqCorrect / mcqTotal) * 100 : 0;

        return {
            daily: {
                total: dailyTotal,
                correct: dailyCorrect,
                successRate: Math.round(dailySuccessRate * 100) / 100
            },
            mcq: {
                total: mcqTotal,
                correct: mcqCorrect,
                successRate: Math.round(mcqSuccessRate * 100) / 100
            }
        };
    }

    /**
     * Obtenir les séries de réussite (streaks)
     */
    async getStreaks(userId: number) {
        // Récupérer tous les quiz terminés, triés par date
        const completedQuizzes = await this.prisma.userQuiz.findMany({
            where: {
                userId,
                completedAt: { not: null }
            },
            orderBy: { completedAt: 'desc' }
        });

        if (completedQuizzes.length === 0) {
            return {
                currentStreak: 0,
                bestStreak: 0,
                currentStreakType: null
            };
        }

        // Calculer la série actuelle
        let currentStreak = 0;
        for (const quiz of completedQuizzes) {
            if (quiz.isCorrect) {
                currentStreak++;
            } else {
                break;
            }
        }

        // Calculer la meilleure série
        let bestStreak = 0;
        let tempStreak = 0;
        
        for (const quiz of completedQuizzes.reverse()) {
            if (quiz.isCorrect) {
                tempStreak++;
                bestStreak = Math.max(bestStreak, tempStreak);
            } else {
                tempStreak = 0;
            }
        }

        return {
            currentStreak,
            bestStreak,
            currentStreakType: currentStreak > 0 ? 'success' : 'none'
        };
    }

    /**
     * Vérifier si l'utilisateur a fait son daily quiz aujourd'hui
     */
    async hasDoneDailyToday(userId: number) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const todayParticipation = await this.prisma.userQuiz.findFirst({
            where: {
                userId,
                quiz: { type: 'DAILY' },
                completedAt: {
                    gte: today,
                    lt: tomorrow
                }
            },
            include: {
                quiz: {
                    select: {
                        id: true,
                        title: true
                    }
                }
            }
        });

        return {
            hasDone: todayParticipation !== null,
            quiz: todayParticipation?.quiz || null,
            isCorrect: todayParticipation?.isCorrect || null
        };
    }

    /**
     * Obtenir l'historique des daily quiz
     */
    async getDailyHistory(userId: number, days: number = 30) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        return this.prisma.userQuiz.findMany({
            where: {
                userId,
                quiz: { type: 'DAILY' },
                completedAt: { gte: startDate }
            },
            include: {
                quiz: {
                    select: {
                        id: true,
                        title: true,
                        date: true
                    }
                }
            },
            orderBy: { completedAt: 'desc' }
        });
    }

    /**
     * Obtenir la série de daily quiz consécutifs
     */
    async getDailyStreak(userId: number) {
        // Récupérer les daily quiz des derniers jours
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const dailyQuizzes = await this.prisma.userQuiz.findMany({
            where: {
                userId,
                quiz: { type: 'DAILY' },
                completedAt: {
                    gte: thirtyDaysAgo,
                    not: null
                }
            },
            include: {
                quiz: {
                    select: { date: true }
                }
            },
            orderBy: { completedAt: 'desc' }
        });

        if (dailyQuizzes.length === 0) {
            return {
                currentStreak: 0,
                lastActivityDate: null
            };
        }

        // Grouper par jour
        const quizzesByDay = new Map<string, UserQuiz>();
        dailyQuizzes.forEach((quiz: UserQuiz) => {
            if (quiz.completedAt) {
                const day = quiz.completedAt.toISOString().split('T')[0];
                if (!quizzesByDay.has(day) || quiz.isCorrect) {
                    quizzesByDay.set(day, quiz);
                }
            }
        });

        // Calculer la série de jours consécutifs
        let currentStreak = 0;
        const today = new Date();
        
        for (let i = 0; i < 30; i++) {
            const checkDate = new Date(today);
            checkDate.setDate(today.getDate() - i);
            const dayKey = checkDate.toISOString().split('T')[0];
            
            if (quizzesByDay.has(dayKey)) {
                currentStreak++;
            } else {
                break;
            }
        }

        return {
            currentStreak,
            lastActivityDate: dailyQuizzes[0]?.completedAt || null
        };
    }
}
