// Service métier pour la gestion des réponses des utilisateurs (UserAnswer)
// Couche d'abstraction entre les routers et la base de données
// Import depuis @cashou/db-app (et non @prisma/client) car Bun crée des copies séparées
// de @prisma/client par contexte de résolution, ce qui cause des types incompatibles
import type { UserAnswer, PrismaClient } from "@cashou/db-app";
import defaultPrisma from "../../database.ts";
import type {UserAnswerCreateSchema, UserAnswerDataSchema} from "../schemas-zod/user-answer-schema.ts";

export class UserAnswerService {
    private prisma: PrismaClient;

    // Permet d'injecter Prisma pour les tests
    constructor(prismaClient?: PrismaClient) {
        this.prisma = prismaClient || defaultPrisma;
    }

    /**
     * Récupère toutes les réponses des utilisateurs
     * @returns Promise<UserAnswer[]> - Liste complète des réponses triées par date de création décroissante
     */
    async findAll(): Promise<UserAnswer[]> {
        return this.prisma.userAnswer.findMany({
            orderBy: { createdAt: 'desc' }, // Tri par date de création décroissante (plus récent en premier)
            // Pas d'include - retourne seulement les données de la table user_answers
        });
    }

    /**
     * Récupère une réponse spécifique par son ID
     * @param id - Identifiant unique de la réponse
     * @returns Promise<UserAnswer | null> - La réponse trouvée ou null si inexistante
     */
    async findOne(id: number): Promise<UserAnswer | null> {
        return this.prisma.userAnswer.findUnique({
            where: { id }
            // Pas d'include - retourne seulement les données de la table user_answers
        });
    }

    /**
     * Crée une nouvelle réponse utilisateur
     * @param data - Données de la réponse validées par le schéma Zod
     * @returns Promise<UserAnswer> - La réponse créée avec son ID généré
     */
    async create(data: UserAnswerCreateSchema): Promise<UserAnswer> {
        return this.prisma.userAnswer.create({ data });
    }

    /**
     * Met à jour une réponse existante
     * @param id - Identifiant de la réponse à modifier
     * @param data - Nouvelles données validées par le schéma Zod
     * @returns Promise<UserAnswer> - La réponse mise à jour
     */
    async update(id: number, data: Partial<UserAnswerDataSchema>): Promise<UserAnswer> {
        return this.prisma.userAnswer.update({
            where: { id },
            data
        });
    }

    /**
     * Supprime une réponse
     * @param id - Identifiant de la réponse à supprimer
     * @returns Promise<UserAnswer> - La réponse supprimée (pour confirmation)
     */
    async delete(id: number): Promise<UserAnswer> {
        return this.prisma.userAnswer.delete({ where: { id } });
    }

    /**
     * Récupère toutes les réponses d'un utilisateur
     * @param userId - Identifiant de l'utilisateur
     * @returns Promise<UserAnswer[]> - Liste des réponses de l'utilisateur
     */
    async findByUser(userId: string): Promise<UserAnswer[]> {
        return this.prisma.userAnswer.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
            // Pas d'include - retourne seulement les données de la table user_answers
        });
    }

    /**
     * Récupère toutes les réponses à une question
     * @param questionId - Identifiant de la question
     * @returns Promise<UserAnswer[]> - Liste des réponses à la question
     */
    async findByQuestion(questionId: number): Promise<UserAnswer[]> {
        return this.prisma.userAnswer.findMany({
            where: { questionId },
            orderBy: { createdAt: 'desc' }
            // Pas d'include - retourne seulement les données de la table user_answers
        });
    }

    /**
     * Récupère toutes les occurrences d'une réponse spécifique
     * @param answerId - Identifiant de la réponse
     * @returns Promise<UserAnswer[]> - Liste des utilisateurs ayant choisi cette réponse
     */
    async findByAnswer(answerId: number): Promise<UserAnswer[]> {
        return this.prisma.userAnswer.findMany({
            where: { answerId },
            orderBy: { createdAt: 'desc' }
            // Pas d'include - retourne seulement les données de la table user_answers
        });
    }

    /**
     * Récupère les réponses selon l'exactitude (correctes ou incorrectes)
     * @param accurate - true pour les réponses correctes, false pour les incorrectes
     * @returns Promise<UserAnswer[]> - Liste des réponses filtrées par exactitude
     */
    async findByAccuracy(accurate: boolean): Promise<UserAnswer[]> {
        return this.prisma.userAnswer.findMany({
            where: { accurate },
            orderBy: { createdAt: 'desc' }
            // Pas d'include - retourne seulement les données de la table user_answers
        });
    }

    /**
     * Enregistre la réponse d'un utilisateur à une question (avec validation automatique)
     * @param userId - Identifiant de l'utilisateur
     * @param questionId - Identifiant de la question
     * @param answerId - Identifiant de la réponse choisie
     * @returns Promise<UserAnswer> - La réponse enregistrée avec validation automatique
     */
    async submitAnswer(userId: string, questionId: number, answerId: number): Promise<UserAnswer> {
        // Vérifier si l'utilisateur a déjà répondu à cette question
        const existingAnswer = await this.prisma.userAnswer.findFirst({
            where: { userId, questionId }
        });

        if (existingAnswer) {
            throw new Error("L'utilisateur a déjà répondu à cette question");
        }

        // Récupérer la réponse pour vérifier si elle est correcte
        const answer = await this.prisma.answer.findUnique({
            where: { id: answerId }
        });

        if (!answer) {
            throw new Error("Réponse introuvable");
        }

        // Créer l'enregistrement avec validation automatique
        return this.prisma.userAnswer.create({
            data: {
                userId,
                questionId,
                answerId,
                accurate: answer.isCorrect || false
            }
        });
    }

    /**
     * Récupère la réponse d'un utilisateur à une question spécifique
     * @param userId - Identifiant de l'utilisateur
     * @param questionId - Identifiant de la question
     * @returns Promise<UserAnswer | null> - La réponse trouvée ou null
     */
    async findByUserAndQuestion(userId: string, questionId: number): Promise<UserAnswer | null> {
        return this.prisma.userAnswer.findFirst({
            where: { userId, questionId }
            // Pas d'include - retourne seulement les données de la table user_answers
        });
    }

    /**
     * Vérifie si un utilisateur a déjà répondu à une question
     * @param userId - Identifiant de l'utilisateur
     * @param questionId - Identifiant de la question
     * @returns Promise<boolean> - true si l'utilisateur a déjà répondu
     */
    async hasUserAnswered(userId: string, questionId: number): Promise<boolean> {
        const answer = await this.findByUserAndQuestion(userId, questionId);
        return answer !== null;
    }

    /**
     * Récupère les statistiques de réponses d'un utilisateur
     * @param userId - Identifiant de l'utilisateur
     * @returns Promise<object> - Statistiques (total, correctes, incorrectes, taux de réussite)
     */
    async getUserStats(userId: string): Promise<{
        total: number;
        correct: number;
        incorrect: number;
        successRate: number;
    }> {
        const [total, correct] = await Promise.all([
            this.prisma.userAnswer.count({ where: { userId } }),
            this.prisma.userAnswer.count({ 
                where: { 
                    userId, 
                    accurate: true 
                } 
            })
        ]);

        const incorrect = total - correct;
        const successRate = total > 0 ? (correct / total) * 100 : 0;

        return {
            total,
            correct,
            incorrect,
            successRate: Math.round(successRate * 100) / 100 // Arrondi à 2 décimales
        };
    }

    /**
     * Récupère les statistiques d'une question
     * @param questionId - Identifiant de la question
     * @returns Promise<object> - Statistiques (total réponses, correctes, incorrectes, taux de réussite)
     */
    async getQuestionStats(questionId: number): Promise<{
        totalAnswers: number;
        correct: number;
        incorrect: number;
        successRate: number;
    }> {
        const [totalAnswers, correct] = await Promise.all([
            this.prisma.userAnswer.count({ where: { questionId } }),
            this.prisma.userAnswer.count({ 
                where: { 
                    questionId, 
                    accurate: true 
                } 
            })
        ]);

        const incorrect = totalAnswers - correct;
        const successRate = totalAnswers > 0 ? (correct / totalAnswers) * 100 : 0;

        return {
            totalAnswers,
            correct,
            incorrect,
            successRate: Math.round(successRate * 100) / 100 // Arrondi à 2 décimales
        };
    }

    /**
     * Récupère les statistiques d'une réponse spécifique
     * @param answerId - Identifiant de la réponse
     * @returns Promise<object> - Statistiques (nombre de fois choisie)
     */
    async getAnswerStats(answerId: number): Promise<{
        timesChosen: number;
    }> {
        const timesChosen = await this.prisma.userAnswer.count({ 
            where: { answerId } 
        });

        return { timesChosen };
    }
}
