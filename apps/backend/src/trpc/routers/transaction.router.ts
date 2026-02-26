import { initTRPC } from "@trpc/server";
import { z } from "zod";
import { TransactionService } from "../services/transaction.service";
import {
  transactionCreateSchema,
  transactionUpdateSchema,
  transactionIdSchema,
  walletIdSchema,
  assetIdSchema,
  transactionTypeSchema
} from "../schemas-zod/transaction-schema.ts";

const t = initTRPC.create();

const transactionService = new TransactionService();

export const transactionRouter = t.router({

  /**
   * Récupère toutes les transactions
   * Endpoint: GET http://localhost:3000/trpc/transaction.getAll
   */
  getAll: t.procedure.query(async () => {
    return await transactionService.findAll();
  }),

  /**
   * Récupère une transaction par son ID
   * Endpoint: GET http://localhost:3000/trpc/transaction.getById?input={"id":1}
   */
  getById: t.procedure
    .input(transactionIdSchema)
    .query(async ({ input }) => {
      return await transactionService.findOne(input.id);
    }),

  /**
   * Crée une nouvelle transaction
   * Endpoint: POST http://localhost:3000/trpc/transaction.create
   */
  create: t.procedure
    .input(transactionCreateSchema)
    .mutation(async ({ input }) => {
      return await transactionService.create(input);
    }),

  /**
   * Met à jour une transaction existante
   * Endpoint: POST http://localhost:3000/trpc/transaction.update
   */
  update: t.procedure
    .input(z.object({
      id: z.number().min(1),
      data: transactionUpdateSchema
    }))
    .mutation(async ({ input }) => {
      console.log('Updating transaction', input.id);
      console.log('Transaction Data', input.data);
      return await transactionService.update(input.id, input.data);
    }),

  /**
   * Supprime une transaction
   * Endpoint: POST http://localhost:3000/trpc/transaction.delete
   */
  delete: t.procedure
    .input(transactionIdSchema)
    .mutation(async ({ input }) => {
      return await transactionService.delete(input.id);
    }),

  /**
   * Récupère toutes les transactions d’un portefeuille
   * Endpoint: GET http://localhost:3000/trpc/transaction.getByWallet?input={"walletId":1}
   */
  getByWallet: t.procedure
    .input(walletIdSchema)
    .query(async ({ input }) => {
      return await transactionService.findByWallet(input.walletId);
    }),

  /**
   * Récupère toutes les transactions d’un actif
   * Endpoint: GET http://localhost:3000/trpc/transaction.getByAsset?input={"assetId":1}
   */
  getByAsset: t.procedure
    .input(assetIdSchema)
    .query(async ({ input }) => {
      return await transactionService.findByAsset(input.assetId);
    }),

  /**
   * Récupère les transactions par type (achat, vente, etc.)
   * Endpoint: GET http://localhost:3000/trpc/transaction.getByType?input={"type":"SELL"}
   */
  getByType: t.procedure
    .input(transactionTypeSchema)
    .query(async ({ input }) => {
      return await transactionService.findByType(input.type);
    }),

  /**
   * Récupère toutes les transactions d’une instance de jeu
   * Endpoint: GET http://localhost:3000/trpc/transaction.getByGameInstance?input={"gameInstanceId":1}
   */
  getByGameInstance: t.procedure
    .input(z.object({ gameInstanceId: z.number().int().min(1) }))
    .query(async ({ input }) => {
      return await transactionService.findByGameInstance(input.gameInstanceId);
    }),

  /**
   * Calcule la valeur totale des transactions d’un portefeuille
   * Endpoint: GET http://localhost:3000/trpc/transaction.getTotalValueByWallet?input={"walletId":1}
   */
  getTotalValueByWallet: t.procedure
    .input(walletIdSchema)
    .query(async ({ input }) => {
      return await transactionService.getTotalValueByWallet(input.walletId);
    }),
});