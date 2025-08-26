// Service métier pour la gestion des événements d'actifs du jeu
// Couche d'abstraction entre les routers et la base de données
import type { EventAsset, PrismaClient } from "@prisma/client";
import defaultPrisma from "../database.ts";
import type {EventAssetCreateSchema, EventAssetDataSchema} from "../schemas-zod/event-asset-schema.ts";

export class EventAssetService {
    private prisma: PrismaClient;

    // Permet d'injecter Prisma pour les tests
    constructor(prismaClient?: PrismaClient) {
        this.prisma = prismaClient || defaultPrisma;
    }

    /**
     * Récupère tous les événements d'actifs avec leurs relations
     * @returns Promise<EventAsset[]> - Liste complète des événements d'actifs triée par date décroissante
     */
    async findAll(): Promise<EventAsset[]> {
        return this.prisma.eventAsset.findMany({
            include: {
                // Inclut l'actif parent
                asset: true,
                // Inclut l'événement parent
                event: true
            },
            orderBy: { date: 'desc' }, // Tri par date décroissante (plus récent en premier)
        });
    }

    /**
     * Récupère un événement d'actif spécifique par son ID
     * @param id - Identifiant unique de l'événement d'actif
     * @returns Promise<EventAsset | null> - L'événement d'actif trouvé ou null si inexistant
     */
    async findOne(id: number): Promise<EventAsset | null> {
        return this.prisma.eventAsset.findUnique({
            where: { id },
            include: {
                // Même structure que findAll pour la cohérence des données
                asset: true,
                event: true
            }
        });
    }

    /**
     * Récupère tous les événements d'actifs d'un actif spécifique
     * @param assetId - Identifiant de l'actif parent
     * @returns Promise<EventAsset[]> - Liste des événements d'actifs de l'actif
     */
    async findByAssetId(assetId: number): Promise<EventAsset[]> {
        return this.prisma.eventAsset.findMany({
            where: { assetId },
            include: {
                // asset: true,  // Supprimé car redondant - on connaît déjà l'assetId
                event: true
            },
            orderBy: { date: 'desc' }
        });
    }

    /**
     * Récupère tous les événements d'actifs d'un événement spécifique
     * @param eventId - Identifiant de l'événement parent
     * @returns Promise<EventAsset[]> - Liste des événements d'actifs de l'événement
     */
    async findByEventId(eventId: number): Promise<EventAsset[]> {
        return this.prisma.eventAsset.findMany({
            where: { eventId },
            include: {
                asset: true,
                // event: true,  // Supprimé car redondant - on connaît déjà l'eventId
            },
            orderBy: { date: 'desc' }
        });
    }

    /**
     * Récupère les événements d'actifs dans une période donnée
     * @param startDate - Date de début de la période
     * @param endDate - Date de fin de la période
     * @returns Promise<EventAsset[]> - Liste des événements d'actifs dans la période
     */
    async findByPeriod(startDate: Date, endDate: Date): Promise<EventAsset[]> {
        return this.prisma.eventAsset.findMany({
            where: {
                date: {
                    gte: startDate,
                    lte: endDate
                }
            },
            include: {
                asset: true,
                event: true
            },
            orderBy: { date: 'desc' }
        });
    }

    /**
     * Crée un nouvel événement d'actif
     * @param data - Données de l'événement d'actif validées par le schéma Zod
     * @returns Promise<EventAsset> - L'événement d'actif créé avec son ID généré
     */
    async create(data: EventAssetCreateSchema): Promise<EventAsset> {
        return this.prisma.eventAsset.create({ data });
    }

    /**
     * Met à jour un événement d'actif existant
     * @param id - Identifiant de l'événement d'actif à modifier
     * @param data - Nouvelles données validées par le schéma Zod
     * @returns Promise<EventAsset> - L'événement d'actif mis à jour
     */
    async update(id: number, data: EventAssetDataSchema): Promise<EventAsset> {
        return this.prisma.eventAsset.update({
            where: { id },
            data
        });
    }

    /**
     * Supprime un événement d'actif
     * @param id - Identifiant de l'événement d'actif à supprimer
     * @returns Promise<EventAsset> - L'événement d'actif supprimé (pour confirmation)
     */
    async delete(id: number): Promise<EventAsset> {
        return this.prisma.eventAsset.delete({ where: { id } });
    }
}
