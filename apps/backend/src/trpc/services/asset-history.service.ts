// Service métier pour la gestion de l'historique des actifs du jeu
// Couche d'abstraction entre les routers et la base de données
import type { AssetHistory, PrismaClient } from "@cashou/db-app";
import defaultPrisma from "../../database.ts";
import type {AssetHistoryCreateSchema, AssetHistoryDataSchema} from "../schemas-zod/asset-history-schema.ts";

export class AssetHistoryService {
    private prisma: PrismaClient;

    // Permet d'injecter Prisma pour les tests
    constructor(prismaClient?: PrismaClient) {
        this.prisma = prismaClient || defaultPrisma;
    }

    /**
     * Récupère tout l'historique des actifs avec leurs relations
     * @returns Promise<AssetHistory[]> - Liste complète de l'historique triée par timestamp décroissant
     */
    async findAll(): Promise<AssetHistory[]> {
        return this.prisma.assetHistory.findMany({
            include: {
                // Inclut l'actif parent
                asset: true
            },
            orderBy: { timestamp: 'desc' }, // Tri par timestamp décroissant (plus récent en premier)
        });
    }

    /**
     * Récupère un historique d'actif spécifique par son ID
     * @param id - Identifiant unique de l'historique
     * @returns Promise<AssetHistory | null> - L'historique trouvé ou null si inexistant
     */
    async findOne(id: number): Promise<AssetHistory | null> {
        return this.prisma.assetHistory.findUnique({
            where: { id },
            include: {
                // Même structure que findAll pour la cohérence des données
                asset: true
            }
        });
    }

    /**
     * Récupère tout l'historique d'un actif spécifique
     * @param assetId - Identifiant de l'actif parent
     * @returns Promise<AssetHistory[]> - Liste de l'historique de l'actif
     */
    async findByAssetId(assetId: number): Promise<AssetHistory[]> {
        return this.prisma.assetHistory.findMany({
            where: { assetId },
            include: {
                // asset: true,  // Supprimé car redondant - on connaît déjà l'assetId
            },
            orderBy: { timestamp: 'desc' }
        });
    }

    /**
     * Récupère l'historique d'un actif dans une période donnée
     * @param assetId - Identifiant de l'actif
     * @param startDate - Date de début de la période
     * @param endDate - Date de fin de la période
     * @returns Promise<AssetHistory[]> - Liste de l'historique dans la période
     */
    async findByAssetIdAndPeriod(assetId: number, startDate: Date, endDate: Date): Promise<AssetHistory[]> {
        return this.prisma.assetHistory.findMany({
            where: {
                assetId,
                timestamp: {
                    gte: startDate,
                    lte: endDate
                }
            },
            orderBy: { timestamp: 'desc' }
        });
    }

    /**
     * Récupère la valeur la plus récente d'un actif
     * @param assetId - Identifiant de l'actif
     * @returns Promise<AssetHistory | null> - L'historique le plus récent
     */
    async findLatestByAssetId(assetId: number): Promise<AssetHistory | null> {
        return this.prisma.assetHistory.findFirst({
            where: { assetId },
            orderBy: { timestamp: 'desc' }
        });
    }

    /**
     * Crée un nouvel historique d'actif
     * @param data - Données de l'historique validées par le schéma Zod
     * @returns Promise<AssetHistory> - L'historique créé avec son ID généré
     */
    async create(data: AssetHistoryCreateSchema): Promise<AssetHistory> {
        return this.prisma.assetHistory.create({ data });
    }

    /**
     * Met à jour un historique d'actif existant
     * @param id - Identifiant de l'historique à modifier
     * @param data - Nouvelles données validées par le schéma Zod
     * @returns Promise<AssetHistory> - L'historique mis à jour
     */
    async update(id: number, data: AssetHistoryDataSchema): Promise<AssetHistory> {
        return this.prisma.assetHistory.update({
            where: { id },
            data
        });
    }

    /**
     * Supprime un historique d'actif
     * @param id - Identifiant de l'historique à supprimer
     * @returns Promise<AssetHistory> - L'historique supprimé (pour confirmation)
     */
    async delete(id: number): Promise<AssetHistory> {
        return this.prisma.assetHistory.delete({ where: { id } });
    }
}
