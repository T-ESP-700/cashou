// Service métier pour la gestion des réponses du jeu
// Couche d'abstraction entre les routers et la base de données
import type { Answer, PrismaClient } from "@prisma/client";
import defaultPrisma from "../../database.ts";
import type {AnswerCreateSchema, AnswerDataSchema} from "../schemas-zod/answer-schema.ts";

export class AnswerService {
    private prisma: PrismaClient;

    // Permet d'injecter Prisma pour les tests
    constructor(prismaClient?: PrismaClient) {
        this.prisma = prismaClient || defaultPrisma;
    }

    /**
     * Récupère toutes les réponses
     * @returns Promise<Answer[]> - Liste complète des réponses triées par date de création décroissante (sans relations)
     */
    async findAll(): Promise<Answer[]> {
        return this.prisma.answer.findMany({
            orderBy: { createdAt: 'desc' }, // Tri par date de création décroissante (plus récent en premier)
            // Pas d'include - retourne seulement les données de la table answer
        });
    }

    /**
     * Récupère une réponse spécifique par son ID
     * @param id - Identifiant unique de la réponse
     * @returns Promise<Answer | null> - La réponse trouvée ou null si inexistante (sans relations)
     */
    async findOne(id: number): Promise<Answer | null> {
        return this.prisma.answer.findUnique({
            where: { id }
            // Pas d'include - retourne seulement les données de la table answer
        });
    }

    /**
     * Crée une nouvelle réponse
     * @param data - Données de la réponse validées par le schéma Zod
     * @returns Promise<Answer> - La réponse créée avec son ID généré
     */
    async create(data: AnswerCreateSchema): Promise<Answer> {
        return this.prisma.answer.create({ data });
    }

    /**
     * Met à jour une réponse existante
     * @param id - Identifiant de la réponse à modifier
     * @param data - Nouvelles données validées par le schéma Zod
     * @returns Promise<Answer> - La réponse mise à jour
     */
    async update(id: number, data: AnswerDataSchema): Promise<Answer> {
        return this.prisma.answer.update({
            where: { id },
            data
        });
    }

    /**
     * Supprime une réponse
     * @param id - Identifiant de la réponse à supprimer
     * @returns Promise<Answer> - La réponse supprimée (pour confirmation)
     */
    async delete(id: number): Promise<Answer> {
        return this.prisma.answer.delete({ where: { id } });
    }

    /**
     * Récupère toutes les réponses d'une question spécifique
     * @param questionId - Identifiant de la question
     * @returns Promise<Answer[]> - Liste des réponses de la question (sans relations)
     */
    async findByQuestion(questionId: number): Promise<Answer[]> {
        return this.prisma.answer.findMany({
            where: { questionId },
            orderBy: { createdAt: 'asc' } // Tri par ordre de création
            // Pas d'include - retourne seulement les données de la table answer
        });
    }
}
