// Service métier pour la gestion des actifs du jeu
// Couche d'abstraction entre les routers et la base de données
import type { Asset, PrismaClient } from "@cashou/db-app";
import defaultPrisma from "../../database.ts";
import type {AssetCreateSchema, AssetDataSchema} from "../schemas-zod/asset-schema.ts";

export class AssetService {
    private prisma: PrismaClient;

    // Permet d'injecter Prisma pour les tests
    constructor(prismaClient?: PrismaClient) {
        this.prisma = prismaClient || defaultPrisma;
    }

    /**
     * Récupère tous les actifs avec leurs relations
     * @returns Promise<Asset[]> - Liste complète des actifs triés par titre
     */
    async findAll(): Promise<Asset[]> {
        return this.prisma.asset.findMany({
            include: {
                // Inclut le marché parent
                market: true,
                // Inclut le sous-marché parent
                submarket: true,
                // Inclut le champ disciplinaire
                field: true,
                // Inclut l'historique des actifs
                assetHistories: true,
                // Inclut les événements liés aux actifs
                eventAssets: true,
                // Inclut les transactions liées aux actifs
                transactions: true
            },
            orderBy: { title: 'asc' }, // Tri par titre d'actif croissant
        });
    }

    /**
     * Récupère un actif spécifique par son ID
     * @param id - Identifiant unique de l'actif
     * @returns Promise<Asset | null> - L'actif trouvé ou null si inexistant
     */
    async findOne(id: number): Promise<Asset | null> {
        return this.prisma.asset.findUnique({
            where: { id },
            include: {
                // Même structure que findAll pour la cohérence des données
                market: true,
                submarket: true,
                field: true,
                assetHistories: true,
                eventAssets: true,
                transactions: true
            }
        });
    }

    /**
     * Récupère tous les actifs d'un marché spécifique
     * @param marketId - Identifiant du marché parent
     * @returns Promise<Asset[]> - Liste des actifs du marché
     */
    async findByMarketId(marketId: number): Promise<Asset[]> {
        return this.prisma.asset.findMany({
            where: { marketId },
            include: {
                // market: true,  // Supprimé car redondant - on connaît déjà le marketId
                submarket: true,
                field: true,
                assetHistories: true,
                eventAssets: true,
                transactions: true
            },
            orderBy: { title: 'asc' }
        });
    }

    /**
     * Récupère tous les actifs d'un sous-marché spécifique
     * @param submarketId - Identifiant du sous-marché parent
     * @returns Promise<Asset[]> - Liste des actifs du sous-marché
     */
    async findBySubmarketId(submarketId: number): Promise<Asset[]> {
        return this.prisma.asset.findMany({
            where: { submarketId },
            include: {
                market: true,
                field: true,
                // submarket: true,  // Supprimé car redondant - on connaît déjà le submarketId
                assetHistories: true,
                eventAssets: true,
                transactions: true
            },
            orderBy: { title: 'asc' }
        });
    }

    /**
     * Récupère les actifs autorisés pour la partie en cours.
     * La source de vérité est la table level_assets seedée par niveau.
     * Fallback: si aucun mapping n'existe encore pour un ancien seed, on retourne
     * tous les actifs pour préserver le fonctionnement historique.
     */
    async findAvailableForGame(gameInstanceId: number): Promise<Asset[]> {
        const gameInstance = await this.prisma.gameInstance.findUnique({
            where: { id: gameInstanceId },
            select: { levelId: true },
        });

        if (!gameInstance?.levelId) {
            return [];
        }

        const levelAssets = await this.prisma.levelAsset.findMany({
            where: { levelId: gameInstance.levelId },
            include: {
                asset: {
                    include: {
                        market: true,
                        submarket: true,
                        field: true,
                        assetHistories: true,
                        eventAssets: true,
                        transactions: true,
                    },
                },
            },
            orderBy: {
                asset: { title: 'asc' },
            },
        });

        if (levelAssets.length > 0) {
            return levelAssets.map((levelAsset) => levelAsset.asset);
        }

        return this.findAll();
    }

    /**
     * Crée un nouvel actif
     * @param data - Données de l'actif validées par le schéma Zod
     * @returns Promise<Asset> - L'actif créé avec son ID généré
     */
    async create(data: AssetCreateSchema): Promise<Asset> {
        return this.prisma.asset.create({ data });
    }

    /**
     * Met à jour un actif existant
     * @param id - Identifiant de l'actif à modifier
     * @param data - Nouvelles données validées par le schéma Zod
     * @returns Promise<Asset> - L'actif mis à jour
     */
    async update(id: number, data: AssetDataSchema): Promise<Asset> {
        return this.prisma.asset.update({
            where: { id },
            data
        });
    }

    /**
     * Supprime un actif
     * @param id - Identifiant de l'actif à supprimer
     * @returns Promise<Asset> - L'actif supprimé (pour confirmation)
     */
    async delete(id: number): Promise<Asset> {
        return this.prisma.asset.delete({ where: { id } });
    }
}
