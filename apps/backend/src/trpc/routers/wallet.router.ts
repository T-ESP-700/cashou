import { initTRPC } from "@trpc/server";
import { z } from "zod";
import { WalletService } from "../services/wallet.service";
import {
  walletCreateSchema,
  walletUpdateSchema,
  walletIdSchema,
} from "../schemas-zod/wallet-schema.ts";

const t = initTRPC.create();
const walletService = new WalletService();

const userIdSchema = z.object({
  userId: z.number().int().positive("L'ID de l'utilisateur est requis"),
});

const gameInstanceIdSchema = z.object({
  gameInstanceId: z.number().int().positive("L'ID de l'instance de jeu est requis"),
});

export const walletRouter = t.router({

  /**
   * Récupère tous les portefeuilles
   * Endpoint: GET http://localhost:3000/trpc/wallet.getAll
   */
  getAll: t.procedure.query(async () => {
    return await walletService.findAll();
  }),

  /**
   * Récupère un portefeuille par son ID
   * Endpoint: GET http://localhost:3000/trpc/wallet.getById?input={"id":1}
   */
  getById: t.procedure
    .input(walletIdSchema)
    .query(async ({ input }) => {
      return await walletService.findOne(input.id);
    }),

  /**
   * Crée un nouveau portefeuille
   * Endpoint: POST http://localhost:3000/trpc/wallet.create
   */
  create: t.procedure
    .input(walletCreateSchema)
    .mutation(async ({ input }) => {
      return await walletService.create(input);
    }),

  /**
   * Met à jour un portefeuille
   * Endpoint: POST http://localhost:3000/trpc/wallet.update
   */
  update: t.procedure
    .input(z.object({ id: z.number(), data: walletUpdateSchema }))
    .mutation(async ({ input }) => {
      return await walletService.update(input.id, input.data);
    }),

  /**
   * Supprime un portefeuille
   * Endpoint: POST http://localhost:3000/trpc/wallet.delete
   */
  delete: t.procedure
    .input(walletIdSchema)
    .mutation(async ({ input }) => {
      return await walletService.delete(input.id);
    }),

  /**
   * Récupère tous les portefeuilles d’un utilisateur
   * Endpoint: GET http://localhost:3000/trpc/wallet.getByUser?input={"userId":1}
   */
  getByUser: t.procedure
    .input(userIdSchema)
    .query(async ({ input }) => {
      return await walletService.findByUser(input.userId);
    }),

  /**
   * Récupère tous les portefeuilles d’une instance de jeu
   * Endpoint: GET http://localhost:3000/trpc/wallet.getByGameInstance?input={"gameInstanceId":1}
   */
  getByGameInstance: t.procedure
    .input(gameInstanceIdSchema)
    .query(async ({ input }) => {
      return await walletService.findByGameInstance(input.gameInstanceId);
    }),

  /**
   * Met à jour le montant du portefeuille
   * Endpoint: POST http://localhost:3000/trpc/wallet.updateAmount
   */
  updateAmount: t.procedure
    .input(z.object({
      id: z.number().positive(),
      amount: z.number(),
    }))
    .mutation(async ({ input }) => {
      return await walletService.updateAmount(input.id, input.amount);
    }),

  /**
   * Ajoute un montant au portefeuille
   * Endpoint: POST http://localhost:3000/trpc/wallet.addAmount
   */
  addAmount: t.procedure
    .input(z.object({
      id: z.number().positive(),
      amountToAdd: z.number(),
    }))
    .mutation(async ({ input }) => {
      return await walletService.addAmount(input.id, input.amountToAdd);
    }),
});

// Export du type pour le frontend
export type WalletRouter = typeof walletRouter;
