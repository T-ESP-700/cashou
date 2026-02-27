// Service métier pour la gestion des niveaux du jeu
// Couche d'abstraction entre les routers et la base de données
// Updated: Added User progression fields (points, levelId); stars from UserLevelCompletion
import type { Level, Goal, PrismaClient, User } from "@prisma/client";
import defaultPrisma from "../../database.ts";
import type {LevelCreateSchema, LevelDataSchema} from "../schemas-zod/level-schema.ts";
import { LevelCompletionService } from "./level-completion.service.ts";

// Extended User type with progression fields (temporary until Prisma regenerates)
type UserWithProgression = User & { points?: number | null; levelId?: number | null };

export class LevelService {
    private prisma: PrismaClient;
    private levelCompletionService: LevelCompletionService;

    // Permet d'injecter Prisma pour les tests
    constructor(prismaClient?: PrismaClient) {
        this.prisma = prismaClient || defaultPrisma;
        this.levelCompletionService = new LevelCompletionService(prismaClient);
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
     * Récupère un résumé: niveau + objectifs + événements + levelGoals (with isMandatory for stars)
     */
    async getSummary(levelId: number) {
        const levelWithGoals = await this.prisma.level.findUnique({
            where: { id: levelId },
            include: {
                levelGoals: { include: { goal: true } },
            },
        });
        const events = await this.findEvents(levelId);
        const levelGoals = levelWithGoals?.levelGoals ?? [];
        const goals = levelGoals.map((lg) => lg.goal).filter(Boolean);
        const level = levelWithGoals
            ? {
                id: levelWithGoals.id,
                title: levelWithGoals.title,
                number: levelWithGoals.number,
                description: levelWithGoals.description,
                startBalance: levelWithGoals.startBalance,
                pointsRequired: levelWithGoals.pointsRequired,
                duration: levelWithGoals.duration,
                speed: levelWithGoals.speed,
                createdAt: levelWithGoals.createdAt,
                updatedAt: levelWithGoals.updatedAt,
            }
            : null;
        return { level, goals, events, levelGoals };
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
            await this.prisma.levelGoal.createMany({
                data: src.levelGoals.map((g: { goalId: number; isMandatory?: boolean }) => ({
                    levelId: newLevel.id,
                    goalId: g.goalId,
                    isMandatory: g.isMandatory ?? true,
                })),
            });
        }
        if (src.levelEvents?.length) {
            await this.prisma.levelEvent.createMany({ data: src.levelEvents.map((e: { eventId: number }) => ({ levelId: newLevel.id, eventId: e.eventId })) });
        }
        return this.getSummary(newLevel.id);
    }

    /**
     * Liste des niveaux avec progression utilisateur (stars from UserLevelCompletion)
     */
    async getUserLevels(userId: string): Promise<Array<{ level: Level; stars: number; points: number; unlocked: boolean; mandatoryGoalsMet?: boolean; bonusGoalsMet?: boolean; quizPassed?: boolean }>> {
        const user = await this.prisma.user.findUnique({ where: { id: userId } }) as UserWithProgression | null;
        if (!user) return [];
        const [levels, completions] = await Promise.all([
            this.prisma.level.findMany({ orderBy: { number: 'asc' } }),
            this.levelCompletionService.getCompletionsByUser(userId),
        ]);
        const completionByLevelId = new Map(completions.map((c) => [c.levelId, c]));
        const result: Array<{ level: Level; stars: number; points: number; unlocked: boolean; mandatoryGoalsMet?: boolean; bonusGoalsMet?: boolean; quizPassed?: boolean }> = [];
        for (const lvl of levels) {
            const completion = completionByLevelId.get(lvl.id);
            const stars = completion?.stars ?? 0;
            const unlocked = ((user.levelId ?? 0) >= lvl.id) || ((lvl.pointsRequired ?? 0) <= (user.points ?? 0));
            result.push({
                level: lvl,
                stars,
                points: user.points ?? 0,
                unlocked,
                mandatoryGoalsMet: completion?.mandatoryGoalsMet,
                bonusGoalsMet: completion?.bonusGoalsMet,
                quizPassed: completion?.quizPassed,
            });
        }
        return result;
    }

    /**
     * Savoir si l'utilisateur peut déverrouiller un niveau
     */
    async getAvailability(userId: string, levelId: number) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } }) as UserWithProgression | null;
        const level = await this.prisma.level.findUnique({ where: { id: levelId } });
        if (!user || !level) return { canUnlock: false, reason: 'NOT_FOUND' } as const;
        const canUnlock = (level.pointsRequired ?? 0) <= (user.points ?? 0);
        return { canUnlock, required: level.pointsRequired ?? 0, userPoints: user.points ?? 0 };
    }
}
