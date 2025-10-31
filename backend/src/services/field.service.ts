// Service métier pour la gestion des champs de marché du jeu
// Couche d'abstraction entre les routers et la base de données
import type { Field, PrismaClient } from "@prisma/client";
import defaultPrisma from "../database.ts";
import type {FieldCreateSchema, FieldDataSchema} from "../schemas-zod/field-schema.ts";

export class FieldService {
    private prisma: PrismaClient;

    // Permet d'injecter Prisma pour les tests
    constructor(prismaClient?: PrismaClient) {
        this.prisma = prismaClient || defaultPrisma;
    }

    /**
     * Récupère tous les champs avec leurs relations
     * @returns Promise<Field[]> - Liste complète des champs triés par titre
     */
    async findAll(): Promise<Field[]> {
        return this.prisma.field.findMany({
            include: {
                // Inclut le marché parent
                market: true,
                // Inclut les impacts du champ
                impacts: true
            },
            orderBy: { title: 'asc' }, // Tri par titre de champ croissant
        });
    }

    /**
     * Récupère un champ spécifique par son ID
     * @param id - Identifiant unique du champ
     * @returns Promise<Field | null> - Le champ trouvé ou null si inexistant
     */
    async findOne(id: number): Promise<Field | null> {
        return this.prisma.field.findUnique({
            where: { id },
            include: {
                // Même structure que findAll pour la cohérence des données
                market: true,
                impacts: true
            }
        });
    }

    /**
     * Récupère tous les champs d'un marché spécifique
     * @param marketId - Identifiant du marché parent
     * @returns Promise<Field[]> - Liste des champs du marché
     */
    async findByMarketId(marketId: number): Promise<Field[]> {
        return this.prisma.field.findMany({
            where: { marketId },
            include: {
                // market: true,  // Supprimé car redondant - on connaît déjà le marketId
                impacts: true
            },
            orderBy: { title: 'asc' }
        });
    }

    /**
     * Crée un nouveau champ
     * @param data - Données du champ validées par le schéma Zod
     * @returns Promise<Field> - Le champ créé avec son ID généré
     */
    async create(data: FieldCreateSchema): Promise<Field> {
        return this.prisma.field.create({ data });
    }

    /**
     * Met à jour un champ existant
     * @param id - Identifiant du champ à modifier
     * @param data - Nouvelles données validées par le schéma Zod
     * @returns Promise<Field> - Le champ mis à jour
     */
    async update(id: number, data: FieldDataSchema): Promise<Field> {
        return this.prisma.field.update({
            where: { id },
            data
        });
    }

    /**
     * Supprime un champ
     * @param id - Identifiant du champ à supprimer
     * @returns Promise<Field> - Le champ supprimé (pour confirmation)
     */
    async delete(id: number): Promise<Field> {
        return this.prisma.field.delete({ where: { id } });
    }
}
