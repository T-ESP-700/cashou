// Service métier pour la gestion des questions du jeu
// Couche d'abstraction entre les routers et la base de données
// Import depuis @cashou/db-app (et non @prisma/client) car Bun crée des copies séparées
// de @prisma/client par contexte de résolution, ce qui cause des types incompatibles
import type { Question, PrismaClient } from "@cashou/db-app";
import defaultPrisma from "../../database.ts";
import type { QuestionCreateSchema, QuestionDataSchema } from "../schemas-zod/question-schema.ts";

export class QuestionService {
    private prisma: PrismaClient;

    // Permet d'injecter Prisma pour les tests
    constructor(prismaClient?: PrismaClient) {
        this.prisma = prismaClient || defaultPrisma;
    }

    /**
     * Récupère toutes les questions
     * @returns Promise<Question[]> - Liste complète des questions triées par date de création décroissante (sans relations)
     */
    async findAll(): Promise<Question[]> {
        return this.prisma.question.findMany({
            orderBy: { createdAt: 'desc' }, // Tri par date de création décroissante (plus récent en premier)
            // Pas d'include - retourne seulement les données de la table question
        });
    }

    /**
     * Récupère une question spécifique par son ID
     * @param id - Identifiant unique de la question
     * @returns Promise<Question | null> - La question trouvée ou null si inexistante (sans relations)
     */
    async findOne(id: number): Promise<Question | null> {
        return this.prisma.question.findUnique({
            where: { id }
            // Pas d'include - retourne seulement les données de la table question
        });
    }

    /**
     * Crée une nouvelle question
     * @param data - Données de la question validées par le schéma Zod
     * @returns Promise<{ message: string, question: Question }> - La question créée avec un message de confirmation
     */
    async create(data: QuestionCreateSchema): Promise<{ message: string, question: Question }> {
        const question = await this.prisma.question.create({ data });
        console.log(question);

        return {
            message: "La question a été créée avec succès",
            question
        };
    }

    /**
     * Met à jour une question existante
     * @param id - Identifiant de la question à modifier
     * @param data - Nouvelles données validées par le schéma Zod
     * @returns Promise<Question> - La question mise à jour
     */
    async update(id: number, data: QuestionDataSchema): Promise<Question> {
        return this.prisma.question.update({
            where: { id },
            data
        });
    }

    /**
     * Supprime une question
     * @param id - Identifiant de la question à supprimer
     * @returns Promise<Question> - La question supprimée (pour confirmation)
     */
    async delete(id: number): Promise<Question> {
        return this.prisma.question.delete({ where: { id } });
    }

    /**
     * Recherche des questions par mot-clé dans le texte
     * @param keyword - Mot-clé à rechercher dans le texte de la question
     * @returns Promise<Question[]> - Liste des questions contenant le mot-clé
     */
    async search(keyword: string): Promise<Question[]> {
        return this.prisma.question.findMany({
            where: {
                text: {
                    contains: keyword,
                    mode: 'insensitive' // Recherche insensible à la casse
                }
            },
            orderBy: { createdAt: 'desc' }
            // Pas d'include - retourne seulement les données de la table question
        });
    }
}
