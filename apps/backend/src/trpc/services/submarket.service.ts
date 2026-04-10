// Service métier pour la gestion des sous-marchés du jeu
// Couche d'abstraction entre les routers et la base de données
// Import depuis @cashou/db-app (et non @prisma/client) car Bun crée des copies séparées
// de @prisma/client par contexte de résolution, ce qui cause des types incompatibles
import type { Submarket, PrismaClient } from "@cashou/db-app";
import defaultPrisma from "../../database.ts";
import type {SubmarketCreateSchema, SubmarketDataSchema} from "../schemas-zod/submarket-schema.ts";

export class SubmarketService {
    private prisma: PrismaClient;

    // Permet d'injecter Prisma pour les tests
    constructor(prismaClient?: PrismaClient) {
        this.prisma = prismaClient || defaultPrisma;
    }

    /**
     * Récupère tous les sous-marchés avec leurs relations
     * @returns Promise<Submarket[]> - Liste complète des sous-marchés triés par nom
     */
    async findAll(): Promise<Submarket[]> {
        return this.prisma.submarket.findMany({
            include: {
                // Inclut le marché parent
                market: true,
                // Inclut les actifs du sous-marché
                assets: true,
                // Inclut les impacts du sous-marché
                impacts: true
            },
            orderBy: { title: 'asc' }, // Tri par titre de sous-marché croissant
        });
    }

    /**
     * Récupère un sous-marché spécifique par son ID
     * @param id - Identifiant unique du sous-marché
     * @returns Promise<Submarket | null> - Le sous-marché trouvé ou null si inexistant
     */
    async findOne(id: number): Promise<Submarket | null> {
        return this.prisma.submarket.findUnique({
            where: { id },
            include: {
                // Même structure que findAll pour la cohérence des données
                market: true,
                assets: true,
                impacts: true
            }
        });
    }

    /**
     * Récupère tous les sous-marchés d'un marché spécifique
     * @param marketId - Identifiant du marché parent
     * @returns Promise<Submarket[]> - Liste des sous-marchés du marché
     */
    async findByMarketId(marketId: number): Promise<Submarket[]> {
        return this.prisma.submarket.findMany({
            where: { marketId },
            include: {
                market: true,
                assets: true,
                impacts: true
            },
            orderBy: { title: 'asc' }
        });
    }

    /**
     * Crée un nouveau sous-marché
     * @param data - Données du sous-marché validées par le schéma Zod
     * @returns Promise<Submarket> - Le sous-marché créé avec son ID généré
     */
    async create(data: SubmarketCreateSchema): Promise<Submarket> {
        return this.prisma.submarket.create({ data });
    }

    /**
     * Met à jour un sous-marché existant
     * @param id - Identifiant du sous-marché à modifier
     * @param data - Nouvelles données validées par le schéma Zod
     * @returns Promise<Submarket> - Le sous-marché mis à jour
     */
    async update(id: number, data: SubmarketDataSchema): Promise<Submarket> {
        return this.prisma.submarket.update({
            where: { id },
            data
        });
    }

    /**
     * Supprime un sous-marché
     * @param id - Identifiant du sous-marché à supprimer
     * @returns Promise<Submarket> - Le sous-marché supprimé (pour confirmation)
     */
    async delete(id: number): Promise<Submarket> {
        return this.prisma.submarket.delete({ where: { id } });
    }
}
