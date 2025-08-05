// Service métier pour la gestion des niveaux du jeu
// Couche d'abstraction entre les routers et la base de données
import type { Level } from "@prisma/client";
import prisma from "../database";
import type {LevelCreateSchema, LevelDataSchema} from "../schemas-zod/level-schema.ts";

export class LevelService {

    /**
     * Récupère tous les niveaux avec leurs relations
     * @returns Promise<Level[]> - Liste complète des niveaux triés par numéro croissant
     */
    async findAll(): Promise<Level[]> {
        return prisma.level.findMany({
            include: {
                // Inclut les objectifs du niveau avec les détails complets
                levelGoals: { include: { goal: true } },
                // Inclut les événements du niveau avec les détails complets
                levelEvents: { include: { event: true } }
            },
            orderBy: { number: 'asc' }, // Tri par numéro de niveau croissant
        });
    }

    /**
     * Récupère un niveau spécifique par son ID
     * @param id - Identifiant unique du niveau
     * @returns Promise<Level | null> - Le niveau trouvé ou null si inexistant
     */
    async findOne(id: number): Promise<Level | null> {
        return prisma.level.findUnique({
            where: { id },
            include: {
                // Même structure que findAll pour la cohérence des données
                levelGoals: { include: { goal: true } },
                levelEvents: { include: { event: true } }
            }
        });
    }

    /**
     * Crée un nouveau niveau
     * @param data - Données du niveau validées par le schéma Zod
     * @returns Promise<Level> - Le niveau créé avec son ID généré
     */
    async create(data: LevelCreateSchema): Promise<Level> {
        return prisma.level.create({ data });
    }

    /**
     * Met à jour un niveau existant
     * @param id - Identifiant du niveau à modifier
     * @param data - Nouvelles données validées par le schéma Zod
     * @returns Promise<Level> - Le niveau mis à jour
     */
    async update(id: number, data: LevelDataSchema): Promise<Level> {
        return prisma.level.update({
            where: { id },
            data
        });
    }

    /**
     * Supprime un niveau
     * @param id - Identifiant du niveau à supprimer
     * @returns Promise<Level> - Le niveau supprimé (pour confirmation)
     */
    async delete(id: number): Promise<Level> {
        return prisma.level.delete({ where: { id } });
    }
}