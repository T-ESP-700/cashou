import { z } from "zod";

export const buySchema = z.object({
  walletId: z.number().int().positive("L'ID du portefeuille est requis"),
  assetId: z.number().int().positive("L'ID de l'asset est requis"),
  amount: z.number().positive("Le montant doit être positif"),
  gameInstanceId: z.number().int().positive("L'ID de l'instance de jeu est requis"),
  // Si true, `amount` est ignoré et le serveur calcule lui-même le dépôt maximum possible
  // (solde du wallet vs capacité restante du plafond), au moment exact de l'exécution —
  // immunise le bouton "Max" contre la dérive due aux intérêts qui courent en continu.
  depositMax: z.boolean().optional(),
});

export const sellSchema = z.object({
  walletId: z.number().int().positive("L'ID du portefeuille est requis"),
  assetId: z.number().int().positive("L'ID de l'asset est requis"),
  amount: z.number().positive("Le montant doit être positif"),
  gameInstanceId: z.number().int().positive("L'ID de l'instance de jeu est requis"),
});

export const portfolioSchema = z.object({
  walletId: z.number().int().positive("L'ID du portefeuille est requis"),
  gameInstanceId: z.number().int().positive("L'ID de l'instance de jeu est requis"),
});

export const holdingInterestsSchema = z.object({
  holdingId: z.number().int().positive("L'ID du holding est requis"),
  gameInstanceId: z.number().int().positive("L'ID de l'instance de jeu est requis"),
});

export type BuySchema = z.infer<typeof buySchema>;
export type SellSchema = z.infer<typeof sellSchema>;
export type PortfolioSchema = z.infer<typeof portfolioSchema>;
export type HoldingInterestsSchema = z.infer<typeof holdingInterestsSchema>;
