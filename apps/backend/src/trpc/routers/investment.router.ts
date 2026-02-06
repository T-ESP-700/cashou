import { initTRPC } from "@trpc/server";
import { z } from "zod";
import { InvestmentService } from "../services/investment.service";
import {
  buySchema,
  sellSchema,
  portfolioSchema,
  holdingInterestsSchema,
} from "../schemas-zod/investment-schema.ts";

const t = initTRPC.create();
const investmentService = new InvestmentService();

export const investmentRouter = t.router({
  /**
   * Achète un asset (dépôt sur livret, achat d'actions, etc.)
   * Endpoint: POST /trpc/investment.buy
   */
  buy: t.procedure
    .input(buySchema)
    .mutation(async ({ input }) => {
      return await investmentService.buy(input);
    }),

  /**
   * Vend un asset (retrait d'un livret, vente d'actions, etc.)
   * Les intérêts sont calculés et ajoutés au montant retiré
   * Endpoint: POST /trpc/investment.sell
   */
  sell: t.procedure
    .input(sellSchema)
    .mutation(async ({ input }) => {
      return await investmentService.sell(input);
    }),

  /**
   * Récupère le portefeuille complet avec calcul des intérêts
   * Endpoint: GET /trpc/investment.getPortfolio
   */
  getPortfolio: t.procedure
    .input(portfolioSchema)
    .query(async ({ input }) => {
      return await investmentService.getPortfolio(input.walletId, input.gameInstanceId);
    }),

  /**
   * Récupère un holding spécifique avec ses intérêts calculés
   * Endpoint: GET /trpc/investment.getHoldingWithInterests
   */
  getHoldingWithInterests: t.procedure
    .input(holdingInterestsSchema)
    .query(async ({ input }) => {
      return await investmentService.getHoldingWithInterests(input.holdingId, input.gameInstanceId);
    }),

  /**
   * Applique les intérêts à tous les holdings d'une game instance
   * (utile pour la fin du niveau)
   * Endpoint: POST /trpc/investment.applyInterests
   */
  applyInterests: t.procedure
    .input(z.object({
      gameInstanceId: z.number().int().positive("L'ID de l'instance de jeu est requis"),
    }))
    .mutation(async ({ input }) => {
      await investmentService.applyInterestsToAllHoldings(input.gameInstanceId);
      return { success: true };
    }),

  /**
   * Récupère le résumé des frais payés pour une partie
   * Endpoint: GET /trpc/investment.getFeesSummary
   */
  getFeesSummary: t.procedure
    .input(z.object({
      gameInstanceId: z.number().int().positive("L'ID de l'instance de jeu est requis"),
    }))
    .query(async ({ input }) => {
      return await investmentService.getTotalFeesPaid(input.gameInstanceId);
    }),
});

export type InvestmentRouter = typeof investmentRouter;
