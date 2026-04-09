import { z } from "zod";
import { GameInstanceService } from "../services/game-instance.service";
import { EndGameService } from "../services/end-game.service";
import {
  gameInstanceCreateSchema,
  gameInstanceUpdateWithIdSchema,
  gameInstanceIdSchema,
  gameInstanceBaseActionSchema
} from "../schemas-zod/game-instance-schema.ts";
import {
  router,
  protectedProcedure,
  protectedOrBackofficeProcedure,
} from "../index.ts";

const gameInstanceService = new GameInstanceService();
const endGameService = new EndGameService();

// Additional schemas
const userIdSchema = z.object({
  userId: z.string().min(1, "L'ID de l'utilisateur est requis"),
});

const levelIdSchema = z.object({
  levelId: z.number().int().positive("L'ID du niveau est requis"),
});

/**
 * Helper: verify that the authenticated user owns the game instance.
 * Throws if not found or not owned.
 */
async function verifyOwnership(gameInstanceId: number, userId: string): Promise<void> {
  const game = await gameInstanceService.findOne(gameInstanceId);
  if (!game) {
    throw new Error(`GameInstance ${gameInstanceId} not found`);
  }
  if (game.userId !== userId) {
    throw new Error("You do not own this game instance");
  }
}

export const gameInstanceRouter = router({
  /**
   * Récupère toutes les instances de jeu
   * Endpoint: GET http://localhost:3000/trpc/gameInstance.getAll
   */
  getAll: protectedOrBackofficeProcedure.query(async () => {
    return await gameInstanceService.findAll();
  }),

  /**
   * Récupère une instance spécifique
   * Endpoint: GET http://localhost:3000/trpc/gameInstance.getById?input={"id":1}
   */
  getById: protectedOrBackofficeProcedure
    .input(gameInstanceIdSchema)
    .query(async ({ input }) => {
      return await gameInstanceService.findOne(input.id);
    }),

  /**
   * Crée une nouvelle instance
   * Endpoint: POST http://localhost:3000/trpc/gameInstance.create
   */
  create: protectedOrBackofficeProcedure
    .input(gameInstanceCreateSchema)
    .mutation(async ({ input }) => {
      return await gameInstanceService.create(input);
    }),

  /**
   * Met à jour une instance
   * Endpoint: POST http://localhost:3000/trpc/gameInstance.update?input={"id":1}
   */
  update: protectedOrBackofficeProcedure
    .input(gameInstanceUpdateWithIdSchema)
    .mutation(async ({ input }) => {
      return await gameInstanceService.update(input);
    }),

  /**
   * Supprime une instance
   * Endpoint: POST http://localhost:3000/trpc/gameInstance.delete
   */
  delete: protectedOrBackofficeProcedure
    .input(gameInstanceIdSchema)
    .mutation(async ({ input }) => {
      return await gameInstanceService.delete(input.id);
    }),

  /**
   * Récupère les instances d'un utilisateur
   * Endpoint: GET http://localhost:3000/trpc/gameInstance.getByUser?input={"userId":1}
   */
  getByUser: protectedOrBackofficeProcedure
    .input(userIdSchema)
    .query(async ({ input }) => {
      return await gameInstanceService.findByUser(input.userId);
    }),

  getActiveByUser: protectedOrBackofficeProcedure
    .input(userIdSchema)
    .query(async ({ input }) => {
      return await gameInstanceService.findActiveByUser(input.userId);
    }),

  abandon: protectedProcedure
    .input(gameInstanceIdSchema)
    .mutation(async ({ input, ctx }) => {
      await verifyOwnership(input.id, ctx.userId);
      return await gameInstanceService.abandon(input.id);
    }),

  /**
   * Récupère les instances d'un niveau
   * Endpoint: GET http://localhost:3000/trpc/gameInstance.getByLevel?input={"levelId":1}
   */
  getByLevel: protectedOrBackofficeProcedure
    .input(levelIdSchema)
    .query(async ({ input }) => {
      return await gameInstanceService.findByLevel(input.levelId);
    }),

  /**
   * Met en pause une instance
   * Endpoint: POST http://localhost:3000/trpc/gameInstance.pause
   */
  pause: protectedProcedure
    .input(gameInstanceIdSchema)
    .mutation(async ({ input, ctx }) => {
      await verifyOwnership(input.id, ctx.userId);
      return await gameInstanceService.pause(input.id);
    }),

  /**
   * Reprend une instance mise en pause
   * Endpoint: POST http://localhost:3000/trpc/gameInstance.resume
   */
  resume: protectedProcedure
    .input(gameInstanceIdSchema)
    .mutation(async ({ input, ctx }) => {
      await verifyOwnership(input.id, ctx.userId);
      return await gameInstanceService.resume(input.id);
    }),

  /**
   * Démarre une partie en mode préparation (première fois)
   * Réinitialise le createdAt et démarre le chrono
   * Endpoint: POST http://localhost:3000/trpc/gameInstance.start
   */
  start: protectedProcedure
    .input(gameInstanceIdSchema)
    .mutation(async ({ input, ctx }) => {
      await verifyOwnership(input.id, ctx.userId);
      return await gameInstanceService.start(input.id);
    }),

  /**
   * Met à jour le statut d'action requise
   * Endpoint: POST http://localhost:3000/trpc/gameInstance.setActionRequired
   */
  setActionRequired: protectedOrBackofficeProcedure
    .input(gameInstanceBaseActionSchema)
    .mutation(async ({ input }) => {
      return await gameInstanceService.setActionRequired(input.id, input.actionRequired);
    }),

  /**
   * Termine une partie et valide les objectifs
   * - Vend tous les assets et ajoute au wallet
   * - Vérifie si wallet >= startBalance pour le goal "Reste en positif"
   * Endpoint: POST http://localhost:3000/trpc/gameInstance.endGame
   */
  endGame: protectedProcedure
    .input(gameInstanceIdSchema)
    .mutation(async ({ input, ctx }) => {
      await verifyOwnership(input.id, ctx.userId);
      return await endGameService.endGame(input.id);
    }),

  /**
   * Retourne le résultat de fin de partie en lecture seule (sans modifier l'état).
   * Endpoint: GET http://localhost:3000/trpc/gameInstance.getEndGameResult?input={"id":1}
   */
  getEndGameResult: protectedOrBackofficeProcedure
    .input(gameInstanceIdSchema)
    .query(async ({ input }) => {
      return await endGameService.getEndGameResult(input.id);
    }),

  /**
   * Retourne la meilleure gameInstance terminée d'un utilisateur pour un niveau donné.
   * Endpoint: GET http://localhost:3000/trpc/gameInstance.getBestForLevel?input={"levelId":1,"userId":"..."}
   */
  getBestForLevel: protectedOrBackofficeProcedure
    .input(z.object({
      levelId: z.number().int().positive("L'ID du niveau est requis"),
      userId: z.string().min(1, "L'ID de l'utilisateur est requis"),
    }))
    .query(async ({ input }) => {
      return await gameInstanceService.findBestForLevel(input.levelId, input.userId);
    }),

  /**
   * Complete l'événement actuel et schedule le suivant
   * Appelé quand l'utilisateur a fini d'interagir avec un événement
   * Endpoint: POST http://localhost:3000/trpc/gameInstance.completeEvent
   */
  completeEvent: protectedProcedure
    .input(gameInstanceIdSchema)
    .mutation(async ({ input, ctx }) => {
      await verifyOwnership(input.id, ctx.userId);
      return await gameInstanceService.completeEvent(input.id);
    }),

  /**
   * Récupère les informations de temps pour une instance de jeu
   * Endpoint: GET http://localhost:3000/trpc/gameInstance.getTimeInfo?input={"id":1}
   */
  getTimeInfo: protectedOrBackofficeProcedure
    .input(gameInstanceIdSchema)
    .query(async ({ input }) => {
      return await gameInstanceService.getTimeInfo(input.id);
    }),

  /**
   * Reinitialise un niveau pour un utilisateur (dev only)
   * Endpoint: POST http://localhost:3000/trpc/gameInstance.resetLevel
   */
  resetLevel: protectedOrBackofficeProcedure
    .input(z.object({
      userId: z.string().min(1, "L'ID de l'utilisateur est requis"),
      levelId: z.number().int().positive("L'ID du niveau est requis"),
    }))
    .mutation(async ({ input }) => {
      return await gameInstanceService.resetLevelForUser(input.userId, input.levelId);
    }),
});

export type GameInstanceRouter = typeof gameInstanceRouter;
