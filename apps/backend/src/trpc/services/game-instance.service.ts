import type { GameInstance, PrismaClient } from "@cashou/db-app";
import defaultPrisma from "../../database.ts";
import type {
  GameInstanceCreateSchema,
  GameInstanceUpdateWithIdSchema
} from "../schemas-zod/game-instance-schema.ts";
import { GameTimeService, type GameTimeInfo } from "./game-time.service.ts";
import { GameEventTriggerService } from "./game-event-trigger.service.ts";
import { cancelGameJobs } from "../../lib/job-queue.ts";

export class GameInstanceService {
  private prisma: PrismaClient;
  private gameTimeService: GameTimeService;
  private gameEventTriggerService: GameEventTriggerService;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || defaultPrisma;
    this.gameTimeService = new GameTimeService();
    this.gameEventTriggerService = new GameEventTriggerService(this.prisma);
  }

  /**
   * Récupère toutes les instances de jeu
   */
  async findAll(): Promise<GameInstance[]> {
    return this.prisma.gameInstance.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: true,
        level: true,
        wallets: true,
        transactions: true,
      },
    });
  }

  /**
   * Récupère une instance de jeu par ID
   */
  async findOne(id: number): Promise<GameInstance | null> {
    return this.prisma.gameInstance.findUnique({
      where: { id },
      include: {
        user: true,
        level: true,
        wallets: true,
        transactions: true,
      },
    });
  }

  /**
   * Crée une nouvelle instance de jeu et schedule le premier événement
   */
  async create(data: GameInstanceCreateSchema): Promise<GameInstance> {
    // Validate foreign keys if provided
    if (data.userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: data.userId },
      });
      if (!user) {
        throw new Error(`L'utilisateur avec l'ID "${data.userId}" n'existe pas`);
      }
    }

    if (data.levelId) {
      const level = await this.prisma.level.findUnique({
        where: { id: data.levelId },
      });
      if (!level) {
        throw new Error(`Le niveau avec l'ID "${data.levelId}" n'existe pas`);
      }

      // Vérifier si l'utilisateur a déjà une partie terminée avec succès sur ce niveau
      if (data.userId) {
        const completedGame = await this.prisma.gameInstance.findFirst({
          where: {
            userId: data.userId,
            levelId: data.levelId,
            isEnded: true,
          },
        });

        if (completedGame) {
          throw new Error(`Vous avez déjà terminé le niveau ${level.number}. Passez au niveau suivant !`);
        }

        // Vérifier aussi s'il y a déjà une partie en cours sur ce niveau
        const activeGame = await this.prisma.gameInstance.findFirst({
          where: {
            userId: data.userId,
            levelId: data.levelId,
            isEnded: false,
          },
        });

        if (activeGame) {
          throw new Error(`Vous avez déjà une partie en cours sur ce niveau. Reprenez votre partie !`);
        }
      }
    }

    const sanitizedData = {
      ...data,
      userId: data.userId ?? null,
      levelId: data.levelId ?? null,
      startBalance: data.startBalance ?? null,
      // Initialize new fields
      totalPausedDuration: 0,
      currentEventIndex: 0,
      isEnded: false,
      isPaused: false,
    };

    const gameInstance = await this.prisma.gameInstance.create({ data: sanitizedData });

    // Schedule the first event (or game end if no events)
    if (gameInstance.levelId) {
      await this.gameEventTriggerService.scheduleFirstEvent(gameInstance.id);
    }

    return gameInstance;
  }

  /**
   * Met à jour une instance existante
   */
   // Service - CORRIGÉ
   async update(data: GameInstanceUpdateWithIdSchema): Promise<GameInstance> {
     const { id, ...updateData } = data;

     // Vérification que l'ID existe
     if (!id) {
       throw new Error("L'ID est requis pour la mise à jour");
     }

     // Build update data object
     const updatePayload: Record<string, unknown> = {};

    if (updateData.type !== undefined) updatePayload.type = updateData.type;
    if (updateData.userId !== undefined) updatePayload.userId = updateData.userId ?? null;
    if (updateData.levelId !== undefined) updatePayload.levelId = updateData.levelId ?? null;
     if (updateData.startBalance !== undefined) updatePayload.startBalance = updateData.startBalance ?? 0;
     if (updateData.isPaused !== undefined) updatePayload.isPaused = updateData.isPaused;
     if (updateData.actionRequired !== undefined) updatePayload.actionRequired = updateData.actionRequired;
     if (updateData.pausedAt !== undefined) updatePayload.pausedAt = updateData.pausedAt;
     // New fields for game time management
     if (updateData.totalPausedDuration !== undefined) updatePayload.totalPausedDuration = updateData.totalPausedDuration;
     if (updateData.currentEventIndex !== undefined) updatePayload.currentEventIndex = updateData.currentEventIndex;
     if (updateData.isEnded !== undefined) updatePayload.isEnded = updateData.isEnded;
     if (updateData.endedAt !== undefined) updatePayload.endedAt = updateData.endedAt;

     return this.prisma.gameInstance.update({
       where: { id },
       data: updatePayload,
     });
   }



  /**
   * Supprime une instance de jeu
   */
  async delete(id: number): Promise<GameInstance> {
    return this.prisma.gameInstance.delete({ where: { id } });
  }

  /**
   * Récupère toutes les instances d'un utilisateur
   */
  async findByUser(userId: string): Promise<GameInstance[]> {
    return this.prisma.gameInstance.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        level: true,
        wallets: true,
      },
    });
  }

  /**
   * Récupère toutes les instances d’un niveau
   */
  async findByLevel(levelId: number): Promise<GameInstance[]> {
    return this.prisma.gameInstance.findMany({
      where: { levelId },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Met en pause une instance de jeu et annule les jobs schedulés
   */
  async pause(id: number): Promise<GameInstance> {
    // Cancel all scheduled jobs for this game
    await cancelGameJobs(id);

    return this.prisma.gameInstance.update({
      where: { id },
      data: { isPaused: true, pausedAt: new Date() },
    });
  }

  /**
   * Reprend une instance de jeu mise en pause
   * Calcule la durée de pause et reschedule les jobs
   */
  async resume(id: number): Promise<GameInstance> {
    const gameInstance = await this.prisma.gameInstance.findUnique({
      where: { id },
      include: { level: true },
    });

    if (!gameInstance) {
      throw new Error(`GameInstance ${id} not found`);
    }

    if (!gameInstance.isPaused || !gameInstance.pausedAt) {
      return gameInstance; // Not paused, nothing to do
    }

    // Calculate how long it was paused
    const pauseDuration = Math.floor(
      (Date.now() - new Date(gameInstance.pausedAt).getTime()) / 1000
    );

    const newTotalPausedDuration =
      (gameInstance.totalPausedDuration ?? 0) + pauseDuration;

    const updated = await this.prisma.gameInstance.update({
      where: { id },
      data: {
        isPaused: false,
        pausedAt: null,
        totalPausedDuration: newTotalPausedDuration,
      },
    });

    // Reschedule events if not ended
    if (!gameInstance.isEnded) {
      await this.gameEventTriggerService.rescheduleAfterResume(id);
    }

    return updated;
  }

  /**
   * Met à jour le statut d'action requise
   */
  async setActionRequired(id: number, required: boolean): Promise<GameInstance> {
    return this.prisma.gameInstance.update({
      where: { id },
      data: { actionRequired: required },
    });
  }

  /**
   * Récupère les informations de temps pour une instance de jeu
   */
  async getTimeInfo(id: number): Promise<GameTimeInfo | null> {
    const gameInstance = await this.prisma.gameInstance.findUnique({
      where: { id },
      include: { level: true },
    });

    if (!gameInstance) return null;

    return this.gameTimeService.calculateTimeInfo(gameInstance);
  }

  /**
   * Complete l'événement actuel et schedule le suivant
   * Appelé quand l'utilisateur a fini d'interagir avec un événement
   */
  async completeEvent(id: number): Promise<GameInstance> {
    await this.gameEventTriggerService.completeEvent(id);

    const updated = await this.prisma.gameInstance.findUnique({
      where: { id },
      include: {
        user: true,
        level: true,
        wallets: true,
        transactions: true,
      },
    });

    if (!updated) {
      throw new Error(`GameInstance ${id} not found after completing event`);
    }

    return updated;
  }

  /**
   * Reinitialise un niveau pour un utilisateur (dev only)
   * Supprime toutes les parties de l'utilisateur sur ce niveau
   */
  async resetLevelForUser(userId: string, levelId: number): Promise<{ deletedCount: number }> {
    // Trouver toutes les parties de l'utilisateur sur ce niveau
    const gameInstances = await this.prisma.gameInstance.findMany({
      where: {
        userId,
        levelId,
      },
    });

    if (gameInstances.length === 0) {
      return { deletedCount: 0 };
    }

    const gameInstanceIds = gameInstances.map(gi => gi.id);

    // Annuler les jobs schedules pour ces parties (ignorer les erreurs)
    for (const id of gameInstanceIds) {
      try {
        await cancelGameJobs(id);
      } catch (err) {
        console.warn(`[resetLevelForUser] Could not cancel jobs for game ${id}:`, err);
      }
    }

    // Supprimer dans l'ordre pour respecter les contraintes de cle etrangere
    // 1. Holdings
    await this.prisma.holding.deleteMany({
      where: { gameInstanceId: { in: gameInstanceIds } },
    });

    // 2. Transactions
    await this.prisma.transaction.deleteMany({
      where: { gameInstanceId: { in: gameInstanceIds } },
    });

    // 3. Wallets
    await this.prisma.wallet.deleteMany({
      where: { gameInstanceId: { in: gameInstanceIds } },
    });

    // 4. GameInstances
    await this.prisma.gameInstance.deleteMany({
      where: { id: { in: gameInstanceIds } },
    });

    return { deletedCount: gameInstances.length };
  }
}
