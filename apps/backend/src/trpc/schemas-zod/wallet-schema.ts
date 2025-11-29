import { z } from "zod";

export const walletDataSchema = z.object({
  userId: z.string().nullable().optional(),
  amount: z.number().nullable().optional(),
  gameInstanceId: z.number().int().nullable().optional(),
});

export const walletIdSchema = z.object({
  id: z.number().int().positive("L'ID du portefeuille doit être positif"),
});

export const walletCreateSchema = walletDataSchema;
export const walletUpdateSchema = walletDataSchema.partial();

export type WalletCreateSchema = z.infer<typeof walletCreateSchema>;
export type WalletUpdateSchema = z.infer<typeof walletUpdateSchema>;
