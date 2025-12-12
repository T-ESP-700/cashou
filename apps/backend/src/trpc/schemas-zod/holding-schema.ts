import { z } from "zod";

export const holdingDataSchema = z.object({
  walletId: z.number().int().positive("L'ID du portefeuille est requis"),
  assetId: z.number().int().positive("L'ID de l'asset est requis"),
  gameInstanceId: z.number().int().positive("L'ID de l'instance de jeu est requis"),
  quantity: z.number().positive("La quantité doit être positive"),
  acquiredAt: z.coerce.date().optional(),
  lastInterestAt: z.coerce.date().nullable().optional(),
});

export const holdingIdSchema = z.object({
  id: z.number().int().positive("L'ID du holding doit être positif"),
});

export const holdingCreateSchema = holdingDataSchema;
export const holdingUpdateSchema = holdingDataSchema.partial();

export type HoldingCreateSchema = z.infer<typeof holdingCreateSchema>;
export type HoldingUpdateSchema = z.infer<typeof holdingUpdateSchema>;
