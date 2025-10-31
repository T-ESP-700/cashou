// Service métier pour la gestion des niveaux du jeu
// Couche d'abstraction entre les routers et la base de données
import type { Level, Goal, PrismaClient } from "@prisma/client";
import defaultPrisma from "../../database.ts";
import type {LevelCreateSchema, LevelDataSchema} from "../schemas-zod/level-schema.ts";

export class LevelService {
    private prisma: PrismaClient;

    // Permet d'injecter Prisma pour les tests
    constructor(prismaClient?: PrismaClient) {
        this.prisma = prismaClient || defaultPrisma;
    }

    /**
     * Récupère tous les niveaux avec leurs relations
     * @returns Promise<Level[]> - Liste complète des niveaux triés par numéro croissant
     */
    async findAll(): Promise<Level[]> {
        return this.prisma.level.findMany({
            include: {
                // Inclut les objectifs du niveau avec les détails complets
                levelGoals: { include: { goal: true } },
                // Inclut les événements du niveau avec les détails complets
                levelEvents: { include: { event: true } }
            },
            orderBy: { number: 'asc' }, // Tri par numéro de niveau croissant
        });
    }

    /**
     * Récupère un niveau spécifique par son ID
     * @param id - Identifiant unique du niveau
     * @returns Promise<Level | null> - Le niveau trouvé ou null si inexistant
     */
    async findOne(id: number): Promise<Level | null> {
        return this.prisma.level.findUnique({
            where: { id },
            include: {
                // Même structure que findAll pour la cohérence des données
                levelGoals: { include: { goal: true } },
                levelEvents: { include: { event: true } }
            }
        });
    }

    /**
     * Crée un nouveau niveau
     * @param data - Données du niveau validées par le schéma Zod
     * @returns Promise<Level> - Le niveau créé avec son ID généré
     */
    async create(data: LevelCreateSchema): Promise<Level> {
        return this.prisma.level.create({ data });
    }

    /**
     * Met à jour un niveau existant
     * @param id - Identifiant du niveau à modifier
     * @param data - Nouvelles données validées par le schéma Zod
     * @returns Promise<Level> - Le niveau mis à jour
     */
    async update(id: number, data: LevelDataSchema): Promise<Level> {
        return this.prisma.level.update({
            where: { id },
            data
        });
    }

    /**
     * Supprime un niveau
     * @param id - Identifiant du niveau à supprimer
     * @returns Promise<Level> - Le niveau supprimé (pour confirmation)
     */
    async delete(id: number): Promise<Level> {
        return this.prisma.level.delete({ where: { id } });
    }

    /**
     * Récupère la liste des objectifs (goals) associés à un niveau
     * @param levelId - Identifiant du niveau
     * @returns Promise<Goal[]> - Liste des objectifs du niveau
     */
    async findGoals(levelId: number): Promise<Goal[]> {
        return this.prisma.goal.findMany({
            where: { levelGoals: { some: { levelId } } },
            orderBy: { title: 'asc' }
        });
    }

    /**
     * Récupère la liste des événements associés à un niveau
     * @param levelId - Identifiant du niveau
     */
    async findEvents(levelId: number) {
        return this.prisma.event.findMany({
            where: { levelEvents: { some: { levelId } } },
            orderBy: { title: 'asc' }
        });
    }

    /**
     * Récupère un résumé: niveau + objectifs + événements
     */
    async getSummary(levelId: number) {
        const level = await this.prisma.level.findUnique({
            where: { id: levelId },
        });
        // Récupérer séparément les listes d'objectifs et d'événements
        const [goals, events] = await Promise.all([
            this.findGoals(levelId),
            this.findEvents(levelId),
        ]);
        return { level, goals, events };
    }

    /**
     * Dupliquer un niveau (et ses associations)
     */
    async duplicate(levelId: number) {
        const src = await this.prisma.level.findUnique({
            where: { id: levelId },
            include: { levelGoals: true, levelEvents: true }
        });
        if (!src) return null;
        const baseData: Omit<Level, 'id' | 'createdAt' | 'updatedAt'> = {
            title: src.title ?? null,
            number: src.number ?? null,
            duration: src.duration ?? null,
            speed: src.speed ?? null,
            startBalance: src.startBalance ?? null,
            pointsRequired: src.pointsRequired ?? null,
            description: src.description ?? null,
        };
        const newLevel = await this.prisma.level.create({
            data: {
                ...baseData,
                title: (src.title ?? 'Niveau') + ' (copie)'
            }
        });
        // Recréer les associations
        if (src.levelGoals?.length) {
            await this.prisma.levelGoal.createMany({ data: src.levelGoals.map(g => ({ levelId: newLevel.id, goalId: g.goalId })) });
        }
        if (src.levelEvents?.length) {
            await this.prisma.levelEvent.createMany({ data: src.levelEvents.map(e => ({ levelId: newLevel.id, eventId: e.eventId })) });
        }
        return this.getSummary(newLevel.id);
    }

    /**
     * Liste des niveaux avec progression utilisateur
     */
    async getUserLevels(userId: number): Promise<Array<{ level: Level; stars: number; points: number; unlocked: boolean }>> {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) return [];
        const levels = await this.prisma.level.findMany({ orderBy: { number: 'asc' } });
        const result: Array<{ level: Level; stars: number; points: number; unlocked: boolean }> = [];
        for (const lvl of levels) {
            const stars = await this.prisma.userQuiz.count({
                where: { userId, isCorrect: true, quiz: { levelId: lvl.id } }
            });
            const unlocked = (user.levelId >= lvl.id) || ((lvl.pointsRequired ?? 0) <= (user.points ?? 0));
            result.push({ level: lvl, stars, points: user.points ?? 0, unlocked });
        }
        return result;
    }

    /**
     * Savoir si l’utilisateur peut déverrouiller un niveau
     */
    async getAvailability(userId: number, levelId: number) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        const level = await this.prisma.level.findUnique({ where: { id: levelId } });
        if (!user || !level) return { canUnlock: false, reason: 'NOT_FOUND' } as const;
        const canUnlock = (level.pointsRequired ?? 0) <= (user.points ?? 0);
        return { canUnlock, required: level.pointsRequired ?? 0, userPoints: user.points ?? 0 };
    }
}