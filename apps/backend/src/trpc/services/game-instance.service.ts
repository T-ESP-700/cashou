import type { GameInstance, PrismaClient } from "@cashou/db-app";
import defaultPrisma from "../../database.ts";
import type {
  GameInstanceCreateSchema,
  GameInstanceUpdateWithIdSchema
} from "../schemas-zod/game-instance-schema.ts";
import { GameTimeService, type GameTimeInfo } from "./game-time.service.ts";
import { GameEventTriggerService } from "./game-event-trigger.service.ts";
import { GameInstanceEventService } from "./game-instance-event.service.ts";
import { cancelGameJobs } from "../../lib/job-queue.ts";
import { broadcastToGame } from "../../ws/game-socket.ts";

export class GameInstanceService {
  private prisma: PrismaClient;
  private gameTimeService: GameTimeService;
  private gameEventTriggerService: GameEventTriggerService;
  private gameInstanceEventService: GameInstanceEventService;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || defaultPrisma;
    this.gameTimeService = new GameTimeService();
    this.gameEventTriggerService = new GameEventTriggerService(this.prisma);
    this.gameInstanceEventService = new GameInstanceEventService(this.prisma);
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
    let levelStartBalance: number | null = null;

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

      // Allow replay: do not block when a completed game exists for this level.
      // Only block when there is already an active (non-ended) game on this level.
      if (data.userId) {
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
      levelStartBalance = level.startBalance;
    }

    // Respecter le paramètre isPaused si fourni (mode préparation)
    const isPausedValue = data.isPaused ?? false;

    const sanitizedData = {
      ...data,
      userId: data.userId ?? null,
      levelId: data.levelId ?? null,
      startBalance: data.startBalance ?? levelStartBalance ?? null,
      // Initialize new fields
      totalPausedDuration: 0,
      currentEventIndex: 0,
      isEnded: false,
      actionRequired: false,
      isPaused: isPausedValue,
      // Set pausedAt so time calculations work correctly when game starts paused
      pausedAt: isPausedValue ? new Date() : null,
    };

    const gameInstance = await this.prisma.gameInstance.create({ data: sanitizedData });

    // Schedule events for this game
    if (gameInstance.levelId && !isPausedValue) {
      // Schedule events using the new database-persisted system
      await this.gameInstanceEventService.scheduleEventsForGameInstance(gameInstance.id);

      // Also schedule the first event using pg-boss for in-memory processing
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
    console.log(`[GAME-ENDED] delete: gameInstanceId=${id}, reason=GAME_INSTANCE_DELETED`);
    return this.prisma.gameInstance.delete({ where: { id } });
  }

  /**
   * Retourne la partie en cours de l'utilisateur (isEnded = false), ou null.
   */
  async findActiveByUser(userId: string): Promise<GameInstance | null> {
    return this.prisma.gameInstance.findFirst({
      where: { userId, isEnded: false },
      orderBy: { createdAt: "desc" },
      include: { level: true },
    });
  }

  /**
   * Abandonne une partie en cours : la clôture sans enregistrer de récompenses.
   * Ne pas appeler endGame (qui calcule et enregistre les étoiles).
   */
  async abandon(id: number): Promise<GameInstance> {
    console.log(`[GAME-ENDED] abandon: gameInstanceId=${id}, reason=USER_ABANDON`);
    await cancelGameJobs(id);
    return this.prisma.gameInstance.update({
      where: { id },
      data: { isEnded: true, endedAt: new Date() },
    });
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
   * Retourne la meilleure gameInstance terminee d un utilisateur pour un niveau donne.
   * Meilleure = max etoiles (mandatory + bonus), puis la plus ancienne en cas d egalite.
   * Retourne null si aucune partie terminee n existe pour ce niveau.
   */
  async findBestForLevel(levelId: number, userId: string): Promise<GameInstance | null> {
    // Use LevelCompletion.stars (already computed at game-end) instead of recalculating.
    // The most recent completed instance is returned; stars are tracked in LevelCompletion.
    const bestInstance = await this.prisma.gameInstance.findFirst({
      where: { levelId, userId, isEnded: true },
      orderBy: { createdAt: 'desc' },
      include: {
        level: true,
        wallets: true,
      },
    });

    return bestInstance;
  }


  /**
   * Met en pause une instance de jeu et annule les jobs schedulés
   * Idempotent: no-op if already paused
   */
  async pause(id: number): Promise<GameInstance> {
    // Check if already paused
    const gameInstance = await this.prisma.gameInstance.findUnique({
      where: { id },
    });

    if (!gameInstance) {
      throw new Error(`GameInstance ${id} not found`);
    }

    if (gameInstance.isPaused) {
      // Already paused, no-op
      return gameInstance;
    }

    // Cancel all scheduled jobs for this game
    await cancelGameJobs(id);

    const updated = await this.prisma.gameInstance.update({
      where: { id },
      data: { isPaused: true, pausedAt: new Date() },
    });

    // Broadcast pause to WebSocket clients
    broadcastToGame(String(id), {
      type: "game:pause",
      payload: { reason: "user_paused" },
    });

    return updated;
  }

  /**
   * Reprend une instance de jeu mise en pause
   * Calcule la durée de pause, met à jour les compteurs, et shift les événements schedulés
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

    // If the game was never start()'d (preparation mode), don't unpause.
    // The user must click "Démarrer" which calls start() to begin the game.
    if (gameInstance.levelId) {
      const eventCount = await this.prisma.gameInstanceEvent.count({
        where: { gameInstanceId: id },
      });

      if (eventCount === 0) {
        console.log(`[GameInstanceService] resume() skipped for game ${id}: still in preparation mode (0 events).`);
        return gameInstance;
      }
    }

    // Calculate how long it was paused (in seconds for consistency)
    const pauseDurationSeconds = Math.floor(
      (Date.now() - new Date(gameInstance.pausedAt).getTime()) / 1000
    );

    const newTotalPausedDuration =
      (gameInstance.totalPausedDuration ?? 0) + pauseDurationSeconds;

    // Use a transaction to update GameInstance and shift GameInstanceEvents atomically
    const [updated] = await this.prisma.$transaction(async (tx) => {
      // Update the game instance
      const updatedInstance = await tx.gameInstance.update({
        where: { id },
        data: {
          isPaused: false,
          pausedAt: null,
          totalPausedDuration: newTotalPausedDuration,
        },
      });

      // Shift all non-triggered GameInstanceEvent.scheduledAt forward
      await this.gameInstanceEventService.shiftScheduledEvents(id, pauseDurationSeconds);

      return [updatedInstance];
    });

    // Reschedule pg-boss jobs if not ended
    if (!gameInstance.isEnded) {
      await this.gameEventTriggerService.rescheduleAfterResume(id);
    }

    // Broadcast resume to WebSocket clients
    broadcastToGame(String(id), {
      type: "game:resume",
      payload: {},
    });

    return updated;
  }

  /**
   * Démarre une partie qui était en mode préparation
   * Réinitialise le createdAt et démarre le chrono
   */
  async start(id: number): Promise<GameInstance> {
    const gameInstance = await this.prisma.gameInstance.findUnique({
      where: { id },
      include: { level: true },
    });

    if (!gameInstance) {
      throw new Error(`GameInstance ${id} not found`);
    }

    if (!gameInstance.isPaused) {
      return gameInstance; // Already running
    }

    if (gameInstance.isEnded) {
      throw new Error(`Cannot start an ended game`);
    }

    // Guard: prevent restarting a game that already had events triggered
    const triggeredCount = await this.prisma.gameInstanceEvent.count({
      where: { gameInstanceId: id, triggeredAt: { not: null } },
    });
    if (triggeredCount > 0) {
      throw new Error("Cannot restart a game that has already had events. Use resume().");
    }

    // Réinitialiser le createdAt à maintenant et démarrer le jeu
    console.log(`[GAME-ENDED] start: gameInstanceId=${id}, levelId=${gameInstance.levelId}, reason=CHRONO_RESET_ON_START (createdAt and totalPausedDuration reset to 0)`);
    const updated = await this.prisma.gameInstance.update({
      where: { id },
      data: {
        createdAt: new Date(),
        isPaused: false,
        pausedAt: null,
        actionRequired: false,
        totalPausedDuration: 0,
      },
    });

    // Schedule the first event
    if (gameInstance.levelId) {
      console.log(`[GameInstanceService] ▶️ start() scheduling events for game ${id}, levelId=${gameInstance.levelId}`);
      try {
        await this.gameInstanceEventService.scheduleEventsForGameInstance(id);
        console.log(`[GameInstanceService] ✅ scheduleEventsForGameInstance done for game ${id}`);
      } catch (err) {
        console.error(`[GameInstanceService] ❌ scheduleEventsForGameInstance FAILED for game ${id}:`, err);
        throw err;
      }
      try {
        await this.gameEventTriggerService.scheduleFirstEvent(id);
        console.log(`[GameInstanceService] ✅ scheduleFirstEvent done for game ${id}`);
      } catch (err) {
        console.error(`[GameInstanceService] ❌ scheduleFirstEvent FAILED for game ${id}:`, err);
        // Don't throw — events are in DB, pg-boss is a bonus
      }
    } else {
      console.log(`[GameInstanceService] ⚠️ start() no levelId for game ${id}, skipping event scheduling`);
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

    console.log(`[GAME-ENDED] resetLevelForUser: userId=${userId}, levelId=${levelId}, deletingCount=${gameInstances.length}, gameInstanceIds=${gameInstances.map(gi => gi.id).join(',')}, reason=MANUAL_RESET_LEVEL`);

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

    // 3.5. GameInstanceEvents
    await this.prisma.gameInstanceEvent.deleteMany({
      where: { gameInstanceId: { in: gameInstanceIds } },
    });

    // 4. GameInstances
    await this.prisma.gameInstance.deleteMany({
      where: { id: { in: gameInstanceIds } },
    });

    return { deletedCount: gameInstances.length };
  }
}
