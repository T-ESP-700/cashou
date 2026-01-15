// Service métier pour la gestion des utilisateurs du jeu
// Couche d'abstraction entre les routers et la base de données
import type { User, PrismaClient } from "@cashou/db-app";
import defaultPrisma from "../../database.ts";
import type {UserCreateSchema, UserDataSchema} from "../schemas-zod/user-schema.ts";

export class UserService {
    private prisma: PrismaClient;

    // Permet d'injecter Prisma pour les tests
    constructor(prismaClient?: PrismaClient) {
        this.prisma = prismaClient || defaultPrisma;
    }

    /**
     * Récupère tous les utilisateurs
     * @returns Promise<User[]> - Liste complète des utilisateurs triés par date de création décroissante
     */
    async findAll(): Promise<User[]> {
        return this.prisma.user.findMany({
            orderBy: { createdAt: 'desc' }, // Tri par date de création décroissante (plus récent en premier)
            // Pas d'include - retourne seulement les données de la table user
        });
    }

    /**
     * Récupère un utilisateur spécifique par son ID
     * @param id - Identifiant unique de l'utilisateur
     * @returns Promise<User | null> - L'utilisateur trouvé ou null si inexistant (sans relations)
     */
    async findOne(id: string): Promise<User | null> {
        return this.prisma.user.findUnique({
            where: { id }
            // Pas d'include - retourne seulement les données de la table user
        });
    }

    /**
     * Crée un nouvel utilisateur
     * @param data - Données de l'utilisateur validées par le schéma Zod
     * @returns Promise<User> - L'utilisateur créé avec son ID généré
     */
    async create(data: UserCreateSchema): Promise<User> {
        // Convert null values to undefined for Prisma compatibility
        const prismaData = {
            ...data,
            username: data.username ?? undefined,
            discriminator: data.discriminator ?? undefined,
            email: data.email ?? undefined,
            lastActivity: data.lastActivity ?? undefined,
            points: data.points ?? undefined,
            currentStreak: data.currentStreak ?? undefined,
            maxStreak: data.maxStreak ?? undefined,
            badges: data.badges ?? undefined,
        };
        return this.prisma.user.create({ data: prismaData });
    }

    /**
     * Met à jour un utilisateur existant
     * @param id - Identifiant de l'utilisateur à modifier
     * @param data - Nouvelles données validées par le schéma Zod
     * @returns Promise<User> - L'utilisateur mis à jour
     */
    async update(id: string, data: Partial<UserDataSchema>): Promise<User> {
        // Convert null values to undefined for Prisma compatibility
        const prismaData: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(data)) {
            prismaData[key] = value ?? undefined;
        }
        return this.prisma.user.update({
            where: { id },
            data: prismaData
        });
    }

    /**
     * Supprime un utilisateur
     * @param id - Identifiant de l'utilisateur à supprimer
     * @returns Promise<User> - L'utilisateur supprimé (pour confirmation)
     */
    async delete(id: string): Promise<User> {
        return this.prisma.user.delete({ where: { id } });
    }

    /**
     * Récupère tous les utilisateurs d'un niveau spécifique
     * @param levelId - Identifiant du niveau
     * @returns Promise<User[]> - Liste des utilisateurs du niveau
     */
    async findByLevel(levelId: number): Promise<User[]> {
        return this.prisma.user.findMany({
            where: { levelId },
            orderBy: { createdAt: 'desc' }
            // Pas d'include - retourne seulement les données de la table user
        });
    }

    /**
     * Recherche un utilisateur par email
     * @param email - Email de l'utilisateur
     * @returns Promise<User | null> - L'utilisateur trouvé ou null si inexistant
     */
    async findByEmail(email: string): Promise<User | null> {
        return this.prisma.user.findFirst({
            where: { email }
            // Pas d'include - retourne seulement les données de la table user
        });
    }

    /**
     * Récupère les utilisateurs par ordre de points (classement)
     * @param limit - Nombre maximum d'utilisateurs à retourner (optionnel)
     * @returns Promise<User[]> - Liste des utilisateurs triés par points décroissants
     */
    async findTopUsers(limit?: number): Promise<User[]> {
        return this.prisma.user.findMany({
            where: {
                points: {
                    not: null // Exclut les utilisateurs sans points
                }
            },
            orderBy: { points: 'desc' }, // Tri par points décroissants
            take: limit // Limite le nombre de résultats si spécifié
            // Pas d'include - retourne seulement les données de la table user
        });
    }

    /**
     * Met à jour la dernière activité d'un utilisateur
     * @param id - Identifiant de l'utilisateur
     * @returns Promise<User> - L'utilisateur avec la dernière activité mise à jour
     */
    async updateLastActivity(id: string): Promise<User> {
        return this.prisma.user.update({
            where: { id },
            data: { lastActivity: new Date() }
        });
    }

    /**
     * Ajoute des points à un utilisateur
     * @param id - Identifiant de l'utilisateur
     * @param pointsToAdd - Nombre de points à ajouter
     * @returns Promise<User> - L'utilisateur avec les points mis à jour
     */
    async addPoints(id: string, pointsToAdd: number): Promise<User> {
        const user = await this.findOne(id);
        if (!user) {
            throw new Error("Utilisateur introuvable");
        }

        const currentPoints = user.points || 0;
        return this.prisma.user.update({
            where: { id },
            data: { points: currentPoints + pointsToAdd }
        });
    }
}
