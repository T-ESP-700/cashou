// Service métier pour la gestion des impacts du jeu
// Couche d'abstraction entre les routers et la base de données
import type { Impact, PrismaClient } from "@prisma/client";
import defaultPrisma from "../../database.ts";
import type {ImpactCreateSchema, ImpactDataSchema} from "../schemas-zod/impact-schema.ts";

export class ImpactService {
    private prisma: PrismaClient;

    // Permet d'injecter Prisma pour les tests
    constructor(prismaClient?: PrismaClient) {
        this.prisma = prismaClient || defaultPrisma;
    }

    /**
     * Récupère tous les impacts avec leurs relations
     * @returns Promise<Impact[]> - Liste complète des impacts
     */
    async findAll(): Promise<Impact[]> {
        return this.prisma.impact.findMany({
            include: {
                // Inclut l'événement parent
                event: true,
                // Inclut le champ parent
                field: true,
                // Inclut le sous-marché parent
                submarket: true
            },
            orderBy: { createdAt: 'desc' }, // Tri par date de création décroissante
        });
    }

    /**
     * Récupère un impact spécifique par son ID
     * @param id - Identifiant unique de l'impact
     * @returns Promise<Impact | null> - L'impact trouvé ou null si inexistant
     */
    async findOne(id: number): Promise<Impact | null> {
        return this.prisma.impact.findUnique({
            where: { id },
            include: {
                // Même structure que findAll pour la cohérence des données
                event: true,
                field: true,
                submarket: true
            }
        });
    }

    /**
     * Récupère tous les impacts d'un événement spécifique
     * @param eventId - Identifiant de l'événement parent
     * @returns Promise<Impact[]> - Liste des impacts de l'événement
     */
    async findByEventId(eventId: number): Promise<Impact[]> {
        return this.prisma.impact.findMany({
            where: { eventId },
            include: {
                // event: true,  // Supprimé car redondant - on connaît déjà l'eventId
                field: true,
                submarket: true
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    /**
     * Récupère tous les impacts d'un champ spécifique
     * @param fieldId - Identifiant du champ parent
     * @returns Promise<Impact[]> - Liste des impacts du champ
     */
    async findByFieldId(fieldId: number): Promise<Impact[]> {
        return this.prisma.impact.findMany({
            where: { fieldId },
            include: {
                event: true,
                // field: true,  // Supprimé car redondant - on connaît déjà le fieldId
                submarket: true
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    /**
     * Récupère tous les impacts d'un sous-marché spécifique
     * @param submarketId - Identifiant du sous-marché parent
     * @returns Promise<Impact[]> - Liste des impacts du sous-marché
     */
    async findBySubmarketId(submarketId: number): Promise<Impact[]> {
        return this.prisma.impact.findMany({
            where: { submarketId },
            include: {
                event: true,
                field: true,
                // submarket: true,  // Supprimé car redondant - on connaît déjà le submarketId
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    /**
     * Récupère les impacts avec un coefficient supérieur à une valeur donnée
     * @param minCoef - Coefficient minimum
     * @returns Promise<Impact[]> - Liste des impacts avec un coefficient élevé
     */
    async findByMinCoefficient(minCoef: number): Promise<Impact[]> {
        return this.prisma.impact.findMany({
            where: {
                coef: {
                    gte: minCoef
                }
            },
            include: {
                event: true,
                field: true,
                submarket: true
            },
            orderBy: { coef: 'desc' }
        });
    }

    /**
     * Crée un nouvel impact
     * @param data - Données de l'impact validées par le schéma Zod
     * @returns Promise<Impact> - L'impact créé avec son ID généré
     */
    async create(data: ImpactCreateSchema): Promise<Impact> {
        return this.prisma.impact.create({ data });
    }

    /**
     * Met à jour un impact existant
     * @param id - Identifiant de l'impact à modifier
     * @param data - Nouvelles données validées par le schéma Zod
     * @returns Promise<Impact> - L'impact mis à jour
     */
    async update(id: number, data: ImpactDataSchema): Promise<Impact> {
        return this.prisma.impact.update({
            where: { id },
            data
        });
    }

    /**
     * Supprime un impact
     * @param id - Identifiant de l'impact à supprimer
     * @returns Promise<Impact> - L'impact supprimé (pour confirmation)
     */
    async delete(id: number): Promise<Impact> {
        return this.prisma.impact.delete({ where: { id } });
    }
}
