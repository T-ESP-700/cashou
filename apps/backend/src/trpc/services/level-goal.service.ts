
// Service métier pour la gestion des associations niveau-objectif
import type { LevelGoal, PrismaClient } from "@cashou/db-app";
import defaultPrisma from "../../database.ts";
import type { LevelGoalCreateSchema, LevelGoalDataSchema } from "../schemas-zod/level-goal-schema.ts";

export class LevelGoalService {
    private prisma: PrismaClient;

    // Permet d'injecter Prisma pour les tests
    constructor(prismaClient?: PrismaClient) {
        this.prisma = prismaClient || defaultPrisma;
    }

    /**
     * Récupère toutes les associations niveau-objectif avec leurs relations
     * @returns Promise<LevelGoal[]> - Liste complète des associations triées par ID croissant
     */
    async findAll(): Promise<LevelGoal[]> {
        return this.prisma.levelGoal.findMany({
            include: {
                // Inclut les détails complets du niveau associé
                level: true,
                // Inclut les détails complets de l'objectif associé
                goal: true
            },
            orderBy: { id: 'asc' }, // Tri par ID croissant
        });
    }

    /**
     * Récupère une association spécifique par son ID
     * @param id - Identifiant unique de l'association
     * @returns Promise<LevelGoal | null> - L'association trouvée ou null si inexistante
     */
    async findOne(id: number): Promise<LevelGoal | null> {
        return this.prisma.levelGoal.findUnique({
            where: { id },
            include: {
                // Même structure que findAll pour la cohérence des données
                level: true,
                goal: true
            }
        });
    }

    /**
     * Récupère toutes les associations pour un niveau donné
     * @param levelId - Identifiant du niveau
     * @returns Promise<LevelGoal[]> - Les associations du niveau avec les objectifs
     */
    async findByLevelId(levelId: number): Promise<LevelGoal[]> {
        return this.prisma.levelGoal.findMany({
            where: { levelId },
            include: {
                level: true,
                goal: true
            },
            orderBy: { goalId: 'asc' }
        });
    }

    /**
     * Récupère toutes les associations pour un objectif donné
     * @param goalId - Identifiant de l'objectif
     * @returns Promise<LevelGoal[]> - Les associations de l'objectif avec les niveaux
     */
    async findByGoalId(goalId: number): Promise<LevelGoal[]> {
        return this.prisma.levelGoal.findMany({
            where: { goalId },
            include: {
                level: true,
                goal: true
            },
            orderBy: { levelId: 'asc' }
        });
    }

    /**
     * Crée une nouvelle association niveau-objectif
     * @param data - Données de l'association validées par le schéma Zod
     * @returns Promise<LevelGoal> - L'association créée avec son ID généré
     */
    async create(data: LevelGoalCreateSchema): Promise<LevelGoal> {
        return this.prisma.levelGoal.create({ data });
    }

    /**
     * Met à jour une association existante
     * @param id - Identifiant de l'association à modifier
     * @param data - Nouvelles données validées par le schéma Zod
     * @returns Promise<LevelGoal> - L'association mise à jour
     */
    async update(id: number, data: LevelGoalDataSchema): Promise<LevelGoal> {
        return this.prisma.levelGoal.update({
            where: { id },
            data
        });
    }

    /**
     * Supprime une association
     * @param id - Identifiant de l'association à supprimer
     * @returns Promise<LevelGoal> - L'association supprimée (pour confirmation)
     */
    async delete(id: number): Promise<LevelGoal> {
        return this.prisma.levelGoal.delete({ where: { id } });
    }
}
