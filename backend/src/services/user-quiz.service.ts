// Service métier pour la gestion des participations aux quiz (UserQuiz)
// Couche d'abstraction entre les routers et la base de données
import type { UserQuiz, PrismaClient } from "@prisma/client";
import defaultPrisma from "../database.ts";
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
}
