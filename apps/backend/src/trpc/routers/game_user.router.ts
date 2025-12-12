import { initTRPC } from "@trpc/server";
import { GameUserService } from "../services/game_user.service";
import {
  GameUserCreateSchema,
  GameUserUpdateSchema,
  GameUserSearchByUserSchema,
  GameUserSearchByGameInstanceSchema,
  GameUserSearchByStatusSchema,
  GameUserStatusUpdateSchema,
  GameUserSearchByCreatorSchema,
} from "../schemas-zod/game_user-schema";
import { z } from "zod";

const t = initTRPC.create();
const gameUserService = new GameUserService();

export const gameUserRouter = t.router({
  /**
   * Crée une nouvelle association entre un utilisateur et une instance de jeu.
   * Endpoint: POST http://localhost:3000/trpc/gameUser.create
   * @input GameUserCreateSchema - Données de l'association à créer.
   */
  create: t.procedure
    .input(GameUserCreateSchema)
    .mutation(async ({ input }) => gameUserService.create(input)),

  /**
   * Met à jour une association existante.
   * Endpoint: POST http://localhost:3000/trpc/gameUser.update
   * @input GameUserUpdateSchema - Données à mettre à jour.
   */
  update: t.procedure
    .input(GameUserUpdateSchema.extend({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => gameUserService.update(input.id, input)),

  /**
   * Récupère une association par son ID.
   * Endpoint: GET http://localhost:3000/trpc/gameUser.findAll
   */
  findAll: t.procedure
    .query(async () => gameUserService.findAll()),
  
  /**
   * Récupère une association par son ID.
   * Endpoint: GET http://localhost:3000/trpc/gameUser.findById?input={"id":1}
   * @input {id: number} - ID de l'association.
   */
  findById: t.procedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input }) => gameUserService.findById(input.id)),

  /**
   * Récupère les associations pour un utilisateur donné.
   * Endpoint: GET http://localhost:3000/trpc/gameUser.findByUser?input={"userId":1}
   * @input GameUserSearchByUserSchema - ID de l'utilisateur.
   */
  findByUser: t.procedure
    .input(GameUserSearchByUserSchema)
    .query(async ({ input }) => gameUserService.findByUser(input)),

  /**
   * Récupère les associations pour une instance de jeu donnée.
   * Endpoint: GET http://localhost:3000/trpc/gameUser.findByGameInstance?input={"gameInstanceId":1}
   * @input GameUserSearchByGameInstanceSchema - ID de l'instance de jeu.
   */
  findByGameInstance: t.procedure
    .input(GameUserSearchByGameInstanceSchema)
    .query(async ({ input }) => gameUserService.findByGameInstance(input)),

  /**
   * Récupère les associations par statut.
   * Endpoint: GET http://localhost:3000/trpc/gameUser.findByStatus?input={"status":"PENDING"}
   * @input GameUserSearchByStatusSchema - Statut de l'association.
   */
  findByStatus: t.procedure
    .input(GameUserSearchByStatusSchema)
    .query(async ({ input }) => gameUserService.findByStatus(input)),

  /**
   * Récupère les associations créées par un utilisateur.
   * Endpoint: GET http://localhost:3000/trpc/gameUser.findByCreator?input={"creatorId":1}
   * @input GameUserSearchByCreatorSchema - ID du créateur.
   */
  findByCreator: t.procedure
    .input(GameUserSearchByCreatorSchema)
    .query(async ({ input }) => {console.log(input);
      return gameUserService.findByCreator(input)}),

  /**
   * Met à jour le statut d'une association.
   * Endpoint: POST http://localhost:3000/trpc/gameUser.updateStatus
   * @input GameUserStatusUpdateSchema - ID de l'association et nouveau statut.
   */
  updateStatus: t.procedure
    .input(GameUserStatusUpdateSchema.extend({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => gameUserService.updateStatus(input.id, input)),

  /**
   * Supprime une association.
   * Endpoint: POST http://localhost:3000/trpc/gameUser.delete
   * @input {id: number} - ID de l'association à supprimer.
   */
  delete: t.procedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => gameUserService.delete(input.id)),
});
