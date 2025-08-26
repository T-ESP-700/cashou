// Service métier pour la gestion des marchés du jeu
// Couche d'abstraction entre les routers et la base de données
import type { Market, PrismaClient } from "@prisma/client";
import defaultPrisma from "../database.ts";
import type {MarketCreateSchema, MarketDataSchema} from "../schemas-zod/market-schema.ts";

export class MarketService {
    private prisma: PrismaClient;

    // Permet d'injecter Prisma pour les tests
    constructor(prismaClient?: PrismaClient) {
        this.prisma = prismaClient || defaultPrisma;
    }

    /**
     * Récupère tous les marchés avec leurs relations
     * @returns Promise<Market[]> - Liste complète des marchés triés par nom
     */
    async findAll(): Promise<Market[]> {
        return this.prisma.market.findMany({
            include: {
                // Inclut les sous-marchés du marché
                submarkets: true,
                // Inclut les actifs du marché
                assets: true,
                // Inclut les champs du marché
                fields: true
            },
            orderBy: { name: 'asc' }, // Tri par nom de marché croissant
        });
    }

    /**
     * Récupère un marché spécifique par son ID
     * @param id - Identifiant unique du marché
     * @returns Promise<Market | null> - Le marché trouvé ou null si inexistant
     */
    async findOne(id: number): Promise<Market | null> {
        return this.prisma.market.findUnique({
            where: { id },
            include: {
                // Même structure que findAll pour la cohérence des données
                submarkets: true,
                assets: true,
                fields: true
            }
        });
    }

    /**
     * Crée un nouveau marché
     * @param data - Données du marché validées par le schéma Zod
     * @returns Promise<Market> - Le marché créé avec son ID généré
     */
    async create(data: MarketCreateSchema): Promise<Market> {
        return this.prisma.market.create({ data });
    }

    /**
     * Met à jour un marché existant
     * @param id - Identifiant du marché à modifier
     * @param data - Nouvelles données validées par le schéma Zod
     * @returns Promise<Market> - Le marché mis à jour
     */
    async update(id: number, data: MarketDataSchema): Promise<Market> {
        return this.prisma.market.update({
            where: { id },
            data
        });
    }

    /**
     * Supprime un marché
     * @param id - Identifiant du marché à supprimer
     * @returns Promise<Market> - Le marché supprimé (pour confirmation)
     */
    async delete(id: number): Promise<Market> {
        return this.prisma.market.delete({ where: { id } });
    }
}
