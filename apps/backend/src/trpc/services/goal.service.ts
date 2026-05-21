// Service métier pour la gestion des objectifs du jeu
// Import depuis @cashou/db-app (et non @prisma/client) car Bun crée des copies séparées
// de @prisma/client par contexte de résolution, ce qui cause des types incompatibles
import type { Goal, PrismaClient } from "@cashou/db-app";
import defaultPrisma from "../../database.ts";
import type { GoalCreateSchema, GoalDataSchema } from "../schemas-zod/goal-schema.ts";

export class GoalService {
    private prisma: PrismaClient;

    // Permet d'injecter Prisma pour les tests
    constructor(prismaClient?: PrismaClient) {
        this.prisma = prismaClient || defaultPrisma;
    }

    /**
     * Récupère tous les objectifs avec leurs relations
     * @returns Promise<Goal[]> - Liste complète des objectifs triés par titre croissant
     */
    async findAll(): Promise<Goal[]> {
        return this.prisma.goal.findMany({
            include: {
                // Inclut les niveaux associés à l'objectif avec les détails complets
                levelGoals: { include: { level: true } }
            },
            orderBy: { title: 'asc' }, // Tri par titre croissant
        });
    }

    /**
     * Récupère un objectif spécifique par son ID
     * @param id - Identifiant unique de l'objectif
     * @returns Promise<Goal | null> - L'objectif trouvé ou null si inexistant
     */
    async findOne(id: number): Promise<Goal | null> {
        return this.prisma.goal.findUnique({
            where: { id },
            include: {
                // Même structure que findAll pour la cohérence des données
                levelGoals: { include: { level: true } }
            }
        });
    }

    /**
     * Crée un nouvel objectif
     * @param data - Données de l'objectif validées par le schéma Zod
     * @returns Promise<Goal> - L'objectif créé avec son ID généré
     */
    async create(data: GoalCreateSchema): Promise<Goal> {
        return this.prisma.goal.create({ data });
    }

    /**
     * Met à jour un objectif existant
     * @param id - Identifiant de l'objectif à modifier
     * @param data - Nouvelles données validées par le schéma Zod
     * @returns Promise<Goal> - L'objectif mis à jour
     */
    async update(id: number, data: GoalDataSchema): Promise<Goal> {
        return this.prisma.goal.update({
            where: { id },
            data
        });
    }

    /**
     * Supprime un objectif
     * @param id - Identifiant de l'objectif à supprimer
     * @returns Promise<Goal> - L'objectif supprimé (pour confirmation)
     */
    async delete(id: number): Promise<Goal> {
        return this.prisma.goal.delete({ where: { id } });
    }
}
