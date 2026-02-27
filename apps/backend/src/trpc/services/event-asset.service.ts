// Service métier pour la gestion des événements d'actifs du jeu
// Couche d'abstraction entre les routers et la base de données
// Import depuis @cashou/db-app (et non @prisma/client) car Bun crée des copies séparées
// de @prisma/client par contexte de résolution, ce qui cause des types incompatibles
import type { EventAsset, PrismaClient } from "@cashou/db-app";
import { Prisma } from "@cashou/db-app";
import defaultPrisma from "../../database.ts";
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
     * Crée un nouvel événement d'actif et génère automatiquement l'asset_history correspondant
     * @param data - Données de l'événement d'actif validées par le schéma Zod
     * @returns Promise<EventAsset> - L'événement d'actif créé avec son ID généré
     */
    async create(data: EventAssetCreateSchema): Promise<EventAsset> {
        return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
            // 1. Créer l'event_asset
            const eventAsset = await tx.eventAsset.create({ data });

            // 2. Créer automatiquement l'asset_history correspondant
            // Le champ 'date' de event_asset devient 'timestamp' dans asset_history
            if (data.assetId && data.date && (data.value !== null && data.value !== undefined)) {
                await tx.assetHistory.create({
                    data: {
                        assetId: data.assetId,
                        timestamp: data.date,  // Le champ date devient timestamp
                        value: data.value
                        // Note: volume field removed from AssetHistory schema
                    }
                });
            }

            return eventAsset;
        });
    }

    /**
     * Met à jour un événement d'actif existant et synchronise l'asset_history correspondant
     * @param id - Identifiant de l'événement d'actif à modifier
     * @param data - Nouvelles données validées par le schéma Zod
     * @returns Promise<EventAsset> - L'événement d'actif mis à jour
     */
    async update(id: number, data: EventAssetDataSchema): Promise<EventAsset> {
        return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
            // 1. Récupérer l'event_asset existant pour connaître l'assetId
            const existingEventAsset = await tx.eventAsset.findUnique({
                where: { id },
                select: { assetId: true, date: true }
            });

            if (!existingEventAsset) {
                throw new Error(`EventAsset with id ${id} not found`);
            }

            // 2. Mettre à jour l'event_asset
            const updatedEventAsset = await tx.eventAsset.update({
                where: { id },
                data
            });

            // 3. Mettre à jour l'asset_history correspondant si les données critiques ont changé
            const assetId = data.assetId || existingEventAsset.assetId;
            const date = data.date || existingEventAsset.date;

            if (assetId && date && (data.value !== null && data.value !== undefined)) {
                // Chercher l'asset_history correspondant (même assetId et timestamp proche)
                const existingAssetHistory = await tx.assetHistory.findFirst({
                    where: {
                        assetId: assetId,
                        timestamp: {
                            gte: new Date(date.getTime() - 60000), // 1 minute avant
                            lte: new Date(date.getTime() + 60000)  // 1 minute après
                        }
                    }
                });

                if (existingAssetHistory) {
                    // Mettre à jour l'asset_history existant
                    await tx.assetHistory.update({
                        where: { id: existingAssetHistory.id },
                        data: {
                            timestamp: date,
                            value: data.value
                        }
                    });
                } else {
                    // Créer un nouvel asset_history si aucun n'existe
                    await tx.assetHistory.create({
                        data: {
                            assetId: assetId,
                            timestamp: date,
                            value: data.value
                        }
                    });
                }
            }

            return updatedEventAsset;
        });
    }

    /**
     * Supprime un événement d'actif et l'asset_history correspondant
     * @param id - Identifiant de l'événement d'actif à supprimer
     * @returns Promise<EventAsset> - L'événement d'actif supprimé (pour confirmation)
     */
    async delete(id: number): Promise<EventAsset> {
        return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
            // 1. Récupérer l'event_asset pour connaître l'assetId et la date
            const eventAsset = await tx.eventAsset.findUnique({
                where: { id },
                select: { assetId: true, date: true }
            });

            if (!eventAsset) {
                throw new Error(`EventAsset with id ${id} not found`);
            }

            // 2. Supprimer l'asset_history correspondant si il existe
            if (eventAsset.assetId && eventAsset.date) {
                const assetHistory = await tx.assetHistory.findFirst({
                    where: {
                        assetId: eventAsset.assetId,
                        timestamp: {
                            gte: new Date(eventAsset.date.getTime() - 60000), // 1 minute avant
                            lte: new Date(eventAsset.date.getTime() + 60000)  // 1 minute après
                        }
                    }
                });

                if (assetHistory) {
                    await tx.assetHistory.delete({
                        where: { id: assetHistory.id }
                    });
                }
            }

            // 3. Supprimer l'event_asset
            return tx.eventAsset.delete({ where: { id } });
        });
    }
}
