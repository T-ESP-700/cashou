import { initTRPC } from "@trpc/server";
import { z } from "zod";
import { HoldingService } from "../services/holding.service";
import {
  holdingCreateSchema,
  holdingUpdateSchema,
  holdingIdSchema,
} from "../schemas-zod/holding-schema.ts";

const t = initTRPC.create();
const holdingService = new HoldingService();

const walletIdSchema = z.object({
  walletId: z.number().int().positive("L'ID du portefeuille est requis"),
});

const assetIdSchema = z.object({
  assetId: z.number().int().positive("L'ID de l'asset est requis"),
});

const gameInstanceIdSchema = z.object({
  gameInstanceId: z.number().int().positive("L'ID de l'instance de jeu est requis"),
});

const walletAssetSchema = z.object({
  walletId: z.number().int().positive("L'ID du portefeuille est requis"),
  assetId: z.number().int().positive("L'ID de l'asset est requis"),
});

export const holdingRouter = t.router({
  /**
   * Récupère tous les holdings
   * Endpoint: GET /trpc/holding.getAll
   */
  getAll: t.procedure.query(async () => {
    return await holdingService.findAll();
  }),

  /**
   * Récupère un holding par son ID
   * Endpoint: GET /trpc/holding.getById?input={"id":1}
   */
  getById: t.procedure
    .input(holdingIdSchema)
    .query(async ({ input }) => {
      return await holdingService.findOne(input.id);
    }),

  /**
   * Récupère un holding par wallet et asset
   * Endpoint: GET /trpc/holding.getByWalletAndAsset?input={"walletId":1,"assetId":1}
   */
  getByWalletAndAsset: t.procedure
    .input(walletAssetSchema)
    .query(async ({ input }) => {
      return await holdingService.findByWalletAndAsset(input.walletId, input.assetId);
    }),

  /**
   * Récupère tous les holdings d'un wallet
   * Endpoint: GET /trpc/holding.getByWallet?input={"walletId":1}
   */
  getByWallet: t.procedure
    .input(walletIdSchema)
    .query(async ({ input }) => {
      return await holdingService.findByWallet(input.walletId);
    }),

  /**
   * Récupère tous les holdings d'une instance de jeu
   * Endpoint: GET /trpc/holding.getByGameInstance?input={"gameInstanceId":1}
   */
  getByGameInstance: t.procedure
    .input(gameInstanceIdSchema)
    .query(async ({ input }) => {
      return await holdingService.findByGameInstance(input.gameInstanceId);
    }),

  /**
   * Récupère tous les holdings d'un asset
   * Endpoint: GET /trpc/holding.getByAsset?input={"assetId":1}
   */
  getByAsset: t.procedure
    .input(assetIdSchema)
    .query(async ({ input }) => {
      return await holdingService.findByAsset(input.assetId);
    }),

  /**
   * Crée un nouveau holding
   * Endpoint: POST /trpc/holding.create
   */
  create: t.procedure
    .input(holdingCreateSchema)
    .mutation(async ({ input }) => {
      return await holdingService.create(input);
    }),

  /**
   * Met à jour un holding
   * Endpoint: POST /trpc/holding.update
   */
  update: t.procedure
    .input(z.object({ id: z.number(), data: holdingUpdateSchema }))
    .mutation(async ({ input }) => {
      return await holdingService.update(input.id, input.data);
    }),

  /**
   * Met à jour la quantité d'un holding
   * Endpoint: POST /trpc/holding.updateQuantity
   */
  updateQuantity: t.procedure
    .input(z.object({
      id: z.number().positive(),
      quantity: z.number().positive(),
    }))
    .mutation(async ({ input }) => {
      return await holdingService.updateQuantity(input.id, input.quantity);
    }),

  /**
   * Ajoute une quantité au holding
   * Endpoint: POST /trpc/holding.addQuantity
   */
  addQuantity: t.procedure
    .input(z.object({
      id: z.number().positive(),
      amountToAdd: z.number().positive(),
    }))
    .mutation(async ({ input }) => {
      return await holdingService.addQuantity(input.id, input.amountToAdd);
    }),

  /**
   * Soustrait une quantité du holding
   * Endpoint: POST /trpc/holding.subtractQuantity
   */
  subtractQuantity: t.procedure
    .input(z.object({
      id: z.number().positive(),
      amountToSubtract: z.number().positive(),
    }))
    .mutation(async ({ input }) => {
      return await holdingService.subtractQuantity(input.id, input.amountToSubtract);
    }),

  /**
   * Supprime un holding
   * Endpoint: POST /trpc/holding.delete
   */
  delete: t.procedure
    .input(holdingIdSchema)
    .mutation(async ({ input }) => {
      return await holdingService.delete(input.id);
    }),
});

export type HoldingRouter = typeof holdingRouter;
