// Service métier pour la gestion des entrées du dictionnaire (Dico)
// Couche d'abstraction entre les routers et la base de données
import type { DicoEntry, PrismaClient } from "@prisma/client";
import defaultPrisma from "../../database.ts";
import type { DicoEntryCreateSchema, DicoEntryDataSchema } from "../schemas-zod/dico-entry-schema.ts";

export class DicoEntryService {
    private prisma: PrismaClient;

    // Permet d'injecter Prisma pour les tests
    constructor(prismaClient?: PrismaClient) {
        this.prisma = prismaClient || defaultPrisma;
    }

    /**
     * Récupère toutes les entrées du dictionnaire
     * @returns Promise<DicoEntry[]> - Liste complète des entrées triées par terme
     */
    async findAll(): Promise<DicoEntry[]> {
        return this.prisma.dicoEntry.findMany({
            orderBy: { term: 'asc' }, // Tri alphabétique par terme
        });
    }

    /**
     * Récupère toutes les entrées avec pagination
     * @param page - Numéro de page (1-indexed)
     * @param limit - Nombre d'entrées par page
     * @returns Promise<{entries: DicoEntry[], total: number, page: number, totalPages: number}>
     */
    async findAllPaginated(page: number = 1, limit: number = 50): Promise<{
        entries: DicoEntry[];
        total: number;
        page: number;
        totalPages: number;
    }> {
        const skip = (page - 1) * limit;

        const [entries, total] = await Promise.all([
            this.prisma.dicoEntry.findMany({
                orderBy: { term: 'asc' },
                skip,
                take: limit,
            }),
            this.prisma.dicoEntry.count(),
        ]);

        return {
            entries,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }

    /**
     * Récupère une entrée spécifique par son ID
     * @param id - Identifiant unique de l'entrée
     * @returns Promise<DicoEntry | null> - L'entrée trouvée ou null si inexistante
     */
    async findOne(id: number): Promise<DicoEntry | null> {
        return this.prisma.dicoEntry.findUnique({
            where: { id }
        });
    }

    /**
     * Récupère une entrée spécifique par son terme
     * @param term - Terme recherché (exact match)
     * @returns Promise<DicoEntry | null> - L'entrée trouvée ou null si inexistante
     */
    async findByTerm(term: string): Promise<DicoEntry | null> {
        return this.prisma.dicoEntry.findUnique({
            where: { term }
        });
    }

    /**
     * Recherche des entrées par terme ou définition (recherche partielle)
     * @param query - Terme de recherche
     * @returns Promise<DicoEntry[]> - Liste des entrées correspondantes
     */
    async search(query: string): Promise<DicoEntry[]> {
        return this.prisma.dicoEntry.findMany({
            where: {
                OR: [
                    { term: { contains: query, mode: 'insensitive' } },
                    { definition: { contains: query, mode: 'insensitive' } },
                ],
            },
            orderBy: { term: 'asc' },
        });
    }

    /**
     * Crée une nouvelle entrée
     * @param data - Données de l'entrée validées par le schéma Zod
     * @returns Promise<DicoEntry> - L'entrée créée avec son ID généré
     */
    async create(data: DicoEntryCreateSchema): Promise<DicoEntry> {
        return this.prisma.dicoEntry.create({ data });
    }

    /**
     * Crée plusieurs entrées en une seule opération
     * @param entries - Liste des entrées à créer
     * @returns Promise<{count: number}> - Nombre d'entrées créées
     */
    async createMany(entries: DicoEntryCreateSchema[]): Promise<{ count: number }> {
        return this.prisma.dicoEntry.createMany({
            data: entries,
            skipDuplicates: true, // Ignore les doublons basés sur le terme unique
        });
    }

    /**
     * Met à jour une entrée existante
     * @param id - Identifiant de l'entrée à modifier
     * @param data - Nouvelles données validées par le schéma Zod
     * @returns Promise<DicoEntry> - L'entrée mise à jour
     */
    async update(id: number, data: Partial<DicoEntryDataSchema>): Promise<DicoEntry> {
        return this.prisma.dicoEntry.update({
            where: { id },
            data
        });
    }

    /**
     * Supprime une entrée
     * @param id - Identifiant de l'entrée à supprimer
     * @returns Promise<DicoEntry> - L'entrée supprimée (pour confirmation)
     */
    async delete(id: number): Promise<DicoEntry> {
        return this.prisma.dicoEntry.delete({ where: { id } });
    }

    /**
     * Supprime toutes les entrées (utile pour les tests ou le reset)
     * @returns Promise<{count: number}> - Nombre d'entrées supprimées
     */
    async deleteAll(): Promise<{ count: number }> {
        return this.prisma.dicoEntry.deleteMany();
    }

    /**
     * Compte le nombre total d'entrées
     * @returns Promise<number> - Nombre total d'entrées
     */
    async count(): Promise<number> {
        return this.prisma.dicoEntry.count();
    }
}
