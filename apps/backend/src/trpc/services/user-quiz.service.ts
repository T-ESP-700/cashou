// Service métier pour la gestion des participations aux quiz (UserQuiz)
// Couche d'abstraction entre les routers et la base de données
// Import depuis @cashou/db-app (et non @prisma/client) car Bun crée des copies séparées
// de @prisma/client par contexte de résolution, ce qui cause des types incompatibles
import type { UserQuiz, PrismaClient } from "@cashou/db-app";
import defaultPrisma from "../../database.ts";
import type {UserQuizCreateSchema, UserQuizDataSchema} from "../schemas-zod/user-quiz-schema.ts";
import { LevelCompletionService } from "./level-completion.service.ts";

export class UserQuizService {
    private prisma: PrismaClient;
    private levelCompletionService: LevelCompletionService;

    // Permet d'injecter Prisma pour les tests
    constructor(prismaClient?: PrismaClient) {
        this.prisma = prismaClient || defaultPrisma;
        this.levelCompletionService = new LevelCompletionService(prismaClient);
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
        return this.prisma.userQuiz.create({ data: data as any });
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
            data: data as any
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
    async findByUser(userId: number | string): Promise<UserQuiz[]> {
        return this.prisma.userQuiz.findMany({
            where: { userId: String(userId) },
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
     * @param userId - Identifiant de l'utilisateur (number ou string)
     * @returns Promise<UserQuiz> - La participation créée
     */
    async startQuiz(quizId: number, userId: number | string): Promise<UserQuiz> {
        const userIdStr = userId.toString();
        // Vérifier si l'utilisateur a déjà participé à ce quiz
        const existingParticipation = await this.prisma.userQuiz.findFirst({
            where: { quizId, userId: userIdStr }
        });

        if (existingParticipation) {
            throw new Error("L'utilisateur a déjà participé à ce quiz");
        }

        return this.prisma.userQuiz.create({
            data: { quizId, userId: userIdStr }
        });
    }

    /**
     * Crée ou met à jour une participation au quiz pour l'utilisateur connecté
     * @param quizId - Identifiant du quiz
     * @param userId - Identifiant de l'utilisateur (string)
     * @param isCorrect - Résultat du quiz (optionnel)
     * @returns Promise<UserQuiz> - La participation créée ou mise à jour
     */
    async createOrUpdateParticipation(quizId: number, userId: string, isCorrect?: boolean): Promise<UserQuiz> {
        // Chercher une participation existante
        const existingParticipation = await this.prisma.userQuiz.findFirst({
            where: { quizId, userId }
        });

        let participation: UserQuiz;
        if (existingParticipation) {
            // Mettre à jour la participation existante
            participation = await this.prisma.userQuiz.update({
                where: { id: existingParticipation.id },
                data: {
                    completedAt: new Date(),
                    isCorrect: isCorrect !== undefined ? isCorrect : existingParticipation.isCorrect,
                }
            });
        } else {
            // Créer une nouvelle participation
            participation = await this.prisma.userQuiz.create({
                data: {
                    quizId,
                    userId,
                    completedAt: new Date(),
                    isCorrect: isCorrect,
                }
            });
        }

        // Mettre à jour les streaks si c'est le quiz du jour
        await this.updateStreaksIfTodaysQuiz(quizId, userId);

        // If quiz passed and quiz is linked to a level (end-of-level quiz), update level completion star
        if (isCorrect === true) {
            const quiz = await this.prisma.quiz.findUnique({
                where: { id: quizId },
                select: { levelId: true },
            });
            if (quiz?.levelId != null) {
                await this.levelCompletionService.recordFromQuizComplete(userId, quiz.levelId);
            }
        }

        return participation;
    }

    /**
     * Met à jour les streaks de l'utilisateur si le quiz est le quiz du jour
     * @param quizId - Identifiant du quiz
     * @param userId - Identifiant de l'utilisateur (string)
     */
    private async updateStreaksIfTodaysQuiz(quizId: number, userId: string): Promise<void> {
        // Vérifier si c'est le quiz du jour
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const quiz = await this.prisma.quiz.findUnique({
            where: { id: quizId }
        });

        if (!quiz || quiz.type !== 'DAILY') {
            return; // Ce n'est pas un quiz daily, on ne fait rien
        }

        // Vérifier si c'est le quiz du jour (même logique que hasDoneDailyToday)
        const quizDate = quiz.date ? new Date(quiz.date) : new Date(quiz.createdAt);
        const quizDateStart = new Date(quizDate);
        quizDateStart.setHours(0, 0, 0, 0);

        // Vérifier si la date du quiz correspond à aujourd'hui
        if (quizDateStart.getTime() < today.getTime() || quizDateStart.getTime() >= tomorrow.getTime()) {
            return; // Ce n'est pas le quiz du jour, on ne fait rien
        }

        // Récupérer toutes les questions du quiz
        const quizQuestions = await this.prisma.quizQuestion.findMany({
            where: { quizId },
            include: {
                question: {
                    include: {
                        answers: true
                    }
                }
            }
        });

        if (quizQuestions.length === 0) {
            return; // Pas de questions, on ne fait rien
        }

        // Récupérer toutes les réponses de l'utilisateur pour ce quiz
        const questionIds = quizQuestions.map((qq) => qq.questionId).filter((id): id is number => id !== null);
        const userAnswers = await this.prisma.userAnswer.findMany({
            where: {
                userId,
                questionId: { in: questionIds }
            }
        });

        // Calculer le nombre de bonnes réponses
        let correctAnswers = 0;
        for (const userAnswer of userAnswers) {
            if (userAnswer.accurate) {
                correctAnswers++;
            }
        }

        const totalQuestions = quizQuestions.length;
        const score = correctAnswers / totalQuestions;

        // Récupérer l'utilisateur pour accéder aux streaks actuels
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { currentStreak: true, maxStreak: true }
        });

        if (!user) {
            return; // Utilisateur introuvable
        }

        let newCurrentStreak = user.currentStreak;
        let newMaxStreak = user.maxStreak;

        // Appliquer les règles de streak
        // Si 2/3 ou 3/3 (score >= 2/3) → currentStreak +1
        // Si 0/3 ou 1/3 (score < 2/3) → currentStreak = 0
        if (score >= 2/3) {
            newCurrentStreak = user.currentStreak + 1;
        } else {
            newCurrentStreak = 0;
        }

        // Mettre à jour maxStreak si currentStreak > maxStreak
        if (newCurrentStreak > user.maxStreak) {
            newMaxStreak = newCurrentStreak;
        }

        // Mettre à jour l'utilisateur
        await this.prisma.user.update({
            where: { id: userId },
            data: {
                currentStreak: newCurrentStreak,
                maxStreak: newMaxStreak
            }
        });
    }

    /**
     * Termine un quiz (met à jour avec le résultat et la date de completion)
     * @param id - Identifiant de la participation
     * @param isCorrect - Résultat du quiz
     * @returns Promise<UserQuiz> - La participation mise à jour
     */
    async completeQuiz(id: number, isCorrect: boolean): Promise<UserQuiz> {
        const updated = await this.prisma.userQuiz.update({
            where: { id },
            data: {
                isCorrect,
                completedAt: new Date()
            },
            include: { quiz: true }
        });
        if (isCorrect && updated.userId && updated.quiz?.levelId) {
            await this.levelCompletionService.recordFromQuizComplete(
                updated.userId,
                updated.quiz.levelId
            );
        }
        return updated;
    }

    /**
     * Vérifie si un utilisateur a déjà participé à un quiz
     * @param quizId - Identifiant du quiz
     * @param userId - Identifiant de l'utilisateur
     * @returns Promise<boolean> - true si l'utilisateur a déjà participé
     */
    async hasUserParticipated(quizId: number, userId: number | string): Promise<boolean> {
        const participation = await this.prisma.userQuiz.findFirst({
            where: { quizId, userId: String(userId) }
        });
        return participation !== null;
    }

    /**
     * Récupère les statistiques d'un utilisateur
     * @param userId - Identifiant de l'utilisateur
     * @returns Promise<object> - Statistiques (total, réussites, échecs, taux de réussite)
     */
    async getUserStats(userId: number | string): Promise<{
        total: number;
        completed: number;
        correct: number;
        incorrect: number;
        successRate: number;
    }> {
        const [total, completed, correct] = await Promise.all([
            this.prisma.userQuiz.count({ where: { userId: String(userId) } }),
            this.prisma.userQuiz.count({
                where: {
                    userId: String(userId),
                    completedAt: { not: null }
                }
            }),
            this.prisma.userQuiz.count({
                where: {
                    userId: String(userId),
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
    async getStatus(userId: number | string, quizId: number) {
        const participation = await this.prisma.userQuiz.findFirst({
            where: { userId: String(userId), quizId }
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
    async getInProgressByUser(userId: number | string) {
        return this.prisma.userQuiz.findMany({
            where: {
                userId: String(userId),
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
    async resumeQuiz(userId: number | string, quizId: number) {
        const participation = await this.prisma.userQuiz.findFirst({
            where: {
                userId: String(userId),
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
    async getHistoryByUser(userId: number | string, limit: number = 20, offset: number = 0) {
        const [history, total] = await Promise.all([
            this.prisma.userQuiz.findMany({
                where: {
                    userId: String(userId),
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
                    userId: String(userId),
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
    async getUserDetailedStats(userId: number | string, period?: 'week' | 'month' | 'year') {
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
                    userId: String(userId),
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

        // Analyse par type de quiz
        const dailyQuizzes = quizData.filter((uq) => uq.quiz?.type === 'DAILY');
        const mcqQuizzes = quizData.filter((uq) => uq.quiz?.type === 'MCQ');

        // Calcul des temps moyens (approximatif basé sur la différence entre création et completion)
        const completedQuizzes = quizData.filter((uq) => uq.completedAt);
        const averageCompletionTime = completedQuizzes.length > 0
            ? completedQuizzes.reduce((acc: number, uq) => {
                const timeMs = uq.completedAt!.getTime() - uq.createdAt.getTime();
                return acc + timeMs;
            }, 0) / completedQuizzes.length
            : 0;

        return {
            ...basicStats,
            period,
            dailyQuizStats: {
                total: dailyQuizzes.length,
                completed: dailyQuizzes.filter((uq) => uq.completedAt).length,
                correct: dailyQuizzes.filter((uq) => uq.isCorrect).length
            },
            mcqQuizStats: {
                total: mcqQuizzes.length,
                completed: mcqQuizzes.filter((uq) => uq.completedAt).length,
                correct: mcqQuizzes.filter((uq) => uq.isCorrect).length
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
        const userStatsMap = new Map<string, {
            user: { id: string; username: string | null; points: number | null; levelId: number };
            totalQuizzes: number;
            correctQuizzes: number;
        }>();

        completedQuizzes.forEach((quiz) => {
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
    async getStatsByType(userId: number | string) {
        const [dailyQuizzes, mcqQuizzes] = await Promise.all([
            this.prisma.userQuiz.findMany({
                where: {
                    userId: String(userId),
                    quiz: { type: 'DAILY' }
                }
            }),
            this.prisma.userQuiz.findMany({
                where: {
                    userId: String(userId),
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
    async getStreaks(userId: number | string) {
        // Récupérer tous les quiz terminés, triés par date
        const completedQuizzes = await this.prisma.userQuiz.findMany({
            where: {
                userId: String(userId),
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
     * Trouve d'abord le quiz Daily du jour (par date ou createdAt), puis vérifie si l'utilisateur l'a complété
     */
    async hasDoneDailyToday(userId: number | string) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Trouver le quiz Daily du jour (priorité au champ date, sinon createdAt)
        const todaysDailyQuiz = await this.prisma.quiz.findFirst({
            where: {
                type: 'DAILY',
                OR: [
                    {
                        date: {
                            gte: today,
                            lt: tomorrow
                        }
                    },
                    {
                        date: null,
                        createdAt: {
                            gte: today,
                            lt: tomorrow
                        }
                    }
                ]
            }
        });

        if (!todaysDailyQuiz) {
            return {
                hasDone: false,
                quiz: null,
                isCorrect: null
            };
        }

        // Vérifier si l'utilisateur a complété ce quiz (completedAt non null)
        const todayParticipation = await this.prisma.userQuiz.findFirst({
            where: {
                userId: userId.toString(),
                quizId: todaysDailyQuiz.id,
                completedAt: {
                    not: null
                }
            },
            include: {
                quiz: {
                    select: {
                        id: true,
                        title: true,
                        date: true
                    }
                }
            }
        });

        return {
            hasDone: todayParticipation !== null,
            quiz: todayParticipation?.quiz || todaysDailyQuiz,
            isCorrect: todayParticipation?.isCorrect || null
        };
    }

    /**
     * Obtenir l'historique des daily quiz
     */
    async getDailyHistory(userId: number | string, days: number = 30) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        return this.prisma.userQuiz.findMany({
            where: {
                userId: String(userId),
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
     * Retourne le statut du quiz de niveau pour une gameInstance donnée.
     * - notDone : aucun UserQuiz complété lié à cette partie
     * - doneAndPassed : quiz fait et réussi
     * - doneAndFailed : quiz fait mais raté
     */
    async getQuizStatusForGame(gameInstanceId: number, userId: string): Promise<{
        status: 'notDone' | 'doneAndPassed' | 'doneAndFailed';
        userQuizId: number | null;
    }> {
        const userQuiz = await this.prisma.userQuiz.findFirst({
            where: {
                gameInstanceId,
                userId,
                completedAt: { not: null },
            },
            orderBy: { completedAt: 'desc' },
        });

        if (!userQuiz) {
            return { status: 'notDone', userQuizId: null };
        }

        return {
            status: userQuiz.isCorrect ? 'doneAndPassed' : 'doneAndFailed',
            userQuizId: userQuiz.id,
        };
    }

    /**
     * Démarre un quiz de niveau pour une instance de jeu donnée.
     * Crée un UserQuiz lié à la gameInstance et tire 1 question aléatoire parmi celles du quiz.
     * Chaque appel crée une nouvelle tentative indépendante.
     *
     * @param quizId - ID du quiz MCQ associé au niveau
     * @param userId - ID de l'utilisateur (string)
     * @param gameInstanceId - ID de l'instance de jeu (pour isoler les tentatives)
     * @returns { userQuiz, question } - La participation créée et la question tirée
     */
    async startLevelQuiz(quizId: number, userId: string, gameInstanceId: number) {
        // Vérifier que le quiz existe et est de type MCQ
        const quiz = await this.prisma.quiz.findUnique({
            where: { id: quizId },
        });
        if (!quiz) {
            throw new Error(`Quiz ${quizId} introuvable`);
        }

        // Récupérer toutes les questions du quiz avec leurs réponses
        const allQuizQuestions = await this.prisma.quizQuestion.findMany({
            where: { quizId },
            include: {
                question: {
                    include: {
                        answers: { orderBy: { id: 'asc' } },
                    },
                },
            },
        });

        if (allQuizQuestions.length === 0) {
            throw new Error(`Aucune question trouvée pour le quiz ${quizId}`);
        }

        // Tirer 1 question aléatoire (Fisher-Yates sur 1 élément = simple random index)
        const randomIndex = Math.floor(Math.random() * allQuizQuestions.length);
        const pickedQuizQuestion = allQuizQuestions[randomIndex];

        if (!pickedQuizQuestion.question) {
            throw new Error(`La question tirée est invalide pour le quiz ${quizId}`);
        }

        // Créer un nouveau UserQuiz lié à cette gameInstance (une tentative = un UserQuiz)
        const userQuiz = await this.prisma.userQuiz.create({
            data: {
                quizId,
                userId,
                gameInstanceId,
            },
        });

        return {
            userQuiz,
            question: {
                id: pickedQuizQuestion.question.id,
                text: pickedQuizQuestion.question.text,
                explanation: pickedQuizQuestion.question.explanation,
                answers: pickedQuizQuestion.question.answers.map((a) => ({
                    id: a.id,
                    text: a.text,
                    isCorrect: a.isCorrect,
                })),
            },
        };
    }

    /**
     * Soumet la réponse pour un quiz de niveau et finalise la participation.
     * Met à jour UserQuiz avec isCorrect et completedAt.
     * Déclenche la mise à jour de l'étoile quiz si la réponse est correcte.
     *
     * @param userQuizId - ID du UserQuiz créé par startLevelQuiz
     * @param questionId - ID de la question à laquelle l'user a répondu
     * @param answerId - ID de la réponse choisie
     * @param userId - ID de l'utilisateur
     * @returns { userQuiz, isCorrect }
     */
    async submitLevelQuizAnswer(
        userQuizId: number,
        questionId: number,
        answerId: number,
        userId: string
    ) {
        // Vérifier que la participation existe et appartient à l'utilisateur
        const userQuiz = await this.prisma.userQuiz.findUnique({
            where: { id: userQuizId },
            include: { quiz: { select: { levelId: true } } },
        });

        if (!userQuiz || userQuiz.userId !== userId) {
            throw new Error(`Participation au quiz ${userQuizId} introuvable`);
        }

        if (userQuiz.completedAt !== null) {
            throw new Error(`Ce quiz a déjà été complété`);
        }

        // Vérifier si la réponse choisie est correcte
        const answer = await this.prisma.answer.findUnique({
            where: { id: answerId },
            select: { isCorrect: true, questionId: true },
        });

        if (!answer || answer.questionId !== questionId) {
            throw new Error(`Réponse ${answerId} invalide pour la question ${questionId}`);
        }

        const isCorrect = answer.isCorrect === true;

        // Enregistrer la réponse de l'utilisateur
        await this.prisma.userAnswer.create({
            data: {
                userId,
                questionId,
                answerId,
                accurate: isCorrect,
            },
        });

        // Finaliser la participation
        const updatedUserQuiz = await this.prisma.userQuiz.update({
            where: { id: userQuizId },
            data: {
                isCorrect,
                completedAt: new Date(),
            },
        });

        // Si réussi et quiz lié à un niveau, mettre à jour l'étoile quiz
        if (isCorrect && userQuiz.quiz?.levelId != null) {
            await this.levelCompletionService.recordFromQuizComplete(
                userId,
                userQuiz.quiz.levelId
            );
        }

        return { userQuiz: updatedUserQuiz, isCorrect };
    }

    /**
     * Obtenir la série de daily quiz consécutifs
     */
    async getDailyStreak(userId: number | string) {
        // Récupérer les daily quiz des derniers jours
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const dailyQuizzes = await this.prisma.userQuiz.findMany({
            where: {
                userId: String(userId),
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
