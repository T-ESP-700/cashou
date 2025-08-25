// Service métier pour la gestion des quiz du jeu
// Couche d'abstraction entre les routers et la base de données
import type { Quiz, PrismaClient } from "@prisma/client";
import defaultPrisma from "../database.ts";
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
            orderBy: { date: 'desc' }, // Tri par date décroissante (plus récent en premier)
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
            orderBy: { date: 'desc' }
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
            orderBy: { date: 'desc' }
            // Pas d'include - retourne seulement les données de la table quiz
        });
    }
}
