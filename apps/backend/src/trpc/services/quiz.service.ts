// Service métier pour la gestion des quiz du jeu
// Couche d'abstraction entre les routers et la base de données
import type { Quiz, PrismaClient } from "@cashou/db-app";
import defaultPrisma from "../../database.ts";
import type {QuizCreateSchema, QuizDataSchema} from "../schemas-zod/quiz-schema.ts";

export class QuizService {
    private prisma: PrismaClient;

    // Permet d'injecter Prisma pour les tests
    constructor(prismaClient?: PrismaClient) {
        this.prisma = prismaClient || defaultPrisma;
    }

    /**
     * Récupère tous les quiz
     * @returns Promise<Quiz[]> - Liste complète des quiz triés par date décroissante (sans relations)
     */
    async findAll(): Promise<Quiz[]> {
        return this.prisma.quiz.findMany({
            orderBy: { createdAt: 'desc' }, // Tri par date de création décroissante (plus récent en premier)
            // Pas d'include - retourne seulement les données de la table quiz
        });
    }

    /**
     * Récupère un quiz spécifique par son ID
     * @param id - Identifiant unique du quiz
     * @returns Promise<Quiz | null> - Le quiz trouvé ou null si inexistant (sans relations)
     */
    async findOne(id: number): Promise<Quiz | null> {
        return this.prisma.quiz.findUnique({
            where: { id }
            // Pas d'include - retourne seulement les données de la table quiz
        });
    }

    /**
     * Crée un nouveau quiz
     * @param data - Données du quiz validées par le schéma Zod
     * @returns Promise<Quiz> - Le quiz créé avec son ID généré
     */
    async create(data: QuizCreateSchema): Promise<Quiz> {
        return this.prisma.quiz.create({ data });
    }

    /**
     * Met à jour un quiz existant
     * @param id - Identifiant du quiz à modifier
     * @param data - Nouvelles données validées par le schéma Zod
     * @returns Promise<Quiz> - Le quiz mis à jour
     */
    async update(id: number, data: QuizDataSchema): Promise<Quiz> {
        return this.prisma.quiz.update({
            where: { id },
            data
        });
    }

    /**
     * Supprime un quiz
     * @param id - Identifiant du quiz à supprimer
     * @returns Promise<Quiz> - Le quiz supprimé (pour confirmation)
     */
    async delete(id: number): Promise<Quiz> {
        return this.prisma.quiz.delete({ where: { id } });
    }

    /**
     * Récupère tous les quiz d'un niveau spécifique
     * @param levelId - Identifiant du niveau
     * @returns Promise<Quiz[]> - Liste des quiz du niveau (sans relations)
     */
    async findByLevel(levelId: number): Promise<Quiz[]> {
        return this.prisma.quiz.findMany({
            where: { levelId },
            orderBy: { createdAt: 'desc' }
            // Pas d'include - retourne seulement les données de la table quiz
        });
    }

    /**
     * Récupère tous les quiz d'un type spécifique
     * @param type - Type de quiz (DAILY ou MCQ)
     * @returns Promise<Quiz[]> - Liste des quiz du type spécifié (sans relations)
     */
    async findByType(type: "DAILY" | "MCQ"): Promise<Quiz[]> {
        return this.prisma.quiz.findMany({
            where: { type },
            orderBy: { createdAt: 'desc' }
            // Pas d'include - retourne seulement les données de la table quiz
        });
    }

    /**
     * Récupère le Daily Quiz d'aujourd'hui
     * @returns Promise<Quiz | null> - Le Daily Quiz du jour ou null si inexistant
     */
    async getTodaysDailyQuiz(): Promise<Quiz | null> {
        const now = new Date();
        const startOfTodayUTC = new Date(Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate()
        ));

        const endOfTodayUTC = new Date(startOfTodayUTC);
        endOfTodayUTC.setUTCDate(endOfTodayUTC.getUTCDate() + 1);

        return this.prisma.quiz.findFirst({
            where: {
                type: 'DAILY',
                date: {
                    gte: startOfTodayUTC,
                    lt: endOfTodayUTC
                }
            },
            orderBy: {
                date: 'desc'
            }
        });
    }

    /**
     * Vérifie si un Daily Quiz existe pour une date donnée
     * @param date - Date à vérifier (format ISO string)
     * @returns Promise<boolean> - true si un Daily Quiz existe pour cette date
     */
    async dailyQuizExists(date: string): Promise<boolean> {
        const targetDate = new Date(date);
        targetDate.setHours(0, 0, 0, 0); // Début de journée

        const nextDay = new Date(targetDate);
        nextDay.setDate(nextDay.getDate() + 1); // Fin de journée

        const quiz = await this.prisma.quiz.findFirst({
            where: {
                type: 'DAILY',
                date: {
                    gte: targetDate,
                    lt: nextDay
                }
            }
        });

        return quiz !== null;
    }

    /**
     * Récupère l'historique des Daily Quiz (les plus récents en premier)
     * @param limit - Nombre maximum de quiz à retourner
     * @returns Promise<Quiz[]> - Liste des Daily Quiz historiques
     */
    async getDailyHistory(limit: number = 30): Promise<Quiz[]> {
        return this.prisma.quiz.findMany({
            where: { type: 'DAILY' },
            orderBy: { createdAt: 'desc' },
            take: limit
            // Pas d'include - retourne seulement les données de la table quiz
        });
    }


}
