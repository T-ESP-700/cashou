
// Service métier pour la gestion des associations niveau-événement
// Import depuis @cashou/db-app (et non @prisma/client) car Bun crée des copies séparées
// de @prisma/client par contexte de résolution, ce qui cause des types incompatibles
import type { LevelEvent, PrismaClient } from "@cashou/db-app";
import defaultPrisma from "../../database.ts";
import type { LevelEventCreateSchema, LevelEventDataSchema } from "../schemas-zod/level-event-schema.ts";

export class LevelEventService {
    private prisma: PrismaClient;

    // Permet d'injecter Prisma pour les tests
    constructor(prismaClient?: PrismaClient) {
        this.prisma = prismaClient || defaultPrisma;
    }

    /**
     * Récupère toutes les associations niveau-événement avec leurs relations
     * @returns Promise<LevelEvent[]> - Liste complète des associations triées par ID croissant
     */
    async findAll(): Promise<LevelEvent[]> {
        return this.prisma.levelEvent.findMany({
            include: {
                // Inclut les détails complets du niveau associé
                level: true,
                // Inclut les détails complets de l'événement associé
                event: true
            },
            orderBy: { id: 'asc' }, // Tri par ID croissant
        });
    }

    /**
     * Récupère une association spécifique par son ID
     * @param id - Identifiant unique de l'association
     * @returns Promise<LevelEvent | null> - L'association trouvée ou null si inexistante
     */
    async findOne(id: number): Promise<LevelEvent | null> {
        return this.prisma.levelEvent.findUnique({
            where: { id },
            include: {
                // Même structure que findAll pour la cohérence des données
                level: true,
                event: true
            }
        });
    }

    /**
     * Récupère toutes les associations pour un niveau donné
     * @param levelId - Identifiant du niveau
     * @returns Promise<LevelEvent[]> - Les associations du niveau avec les événements
     */
    async findByLevelId(levelId: number): Promise<LevelEvent[]> {
        return this.prisma.levelEvent.findMany({
            where: { levelId },
            include: {
                level: true,
                event: true
            },
            orderBy: { eventId: 'asc' }
        });
    }

    /**
     * Récupère toutes les associations pour un événement donné
     * @param eventId - Identifiant de l'événement
     * @returns Promise<LevelEvent[]> - Les associations de l'événement avec les niveaux
     */
    async findByEventId(eventId: number): Promise<LevelEvent[]> {
        return this.prisma.levelEvent.findMany({
            where: { eventId },
            include: {
                level: true,
                event: true
            },
            orderBy: { levelId: 'asc' }
        });
    }

    /**
     * Crée une nouvelle association niveau-événement
     * @param data - Données de l'association validées par le schéma Zod
     * @returns Promise<LevelEvent> - L'association créée avec son ID généré
     */
    async create(data: LevelEventCreateSchema): Promise<LevelEvent> {
        return this.prisma.levelEvent.create({ data });
    }

    /**
     * Met à jour une association existante
     * @param id - Identifiant de l'association à modifier
     * @param data - Nouvelles données validées par le schéma Zod
     * @returns Promise<LevelEvent> - L'association mise à jour
     */
    async update(id: number, data: LevelEventDataSchema): Promise<LevelEvent> {
        return this.prisma.levelEvent.update({
            where: { id },
            data
        });
    }

    /**
     * Supprime une association
     * @param id - Identifiant de l'association à supprimer
     * @returns Promise<LevelEvent> - L'association supprimée (pour confirmation)
     */
    async delete(id: number): Promise<LevelEvent> {
        return this.prisma.levelEvent.delete({ where: { id } });
    }
}
