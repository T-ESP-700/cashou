import { z } from "zod";

export const transactionDataSchema = z.object({
  walletId: z.number().int().nullable().optional(),
  assetId: z.number().int().nullable().optional(),
  gameInstanceId: z.number().int().nullable().optional(),
  type: z.string().nullable().optional(),
  quantity: z.number().int().nullable().optional(),
  unitPrice: z.string().nullable().optional(),
  totalValue: z.string().nullable().optional(),
  transactionDate: z.coerce.date().nullable().optional(),
  source: z.string().nullable().optional(),
});

export const transactionIdSchema = z.object({
  id: z.number().int().min(1, "L'ID de la transaction doit être positif"),
});

export const walletIdSchema = z.object({
  walletId: z.number().int().min(1, "L'ID du portefeuille est requis"),
});

export const assetIdSchema = z.object({
  assetId: z.number().int().min(1, "L'ID de l'actif est requis"),
});

export const transactionTypeSchema = z.object({
  type: z.string().min(1, "Le type de transaction est requis"),
});

export const transactionCreateSchema = transactionDataSchema;
export const transactionUpdateSchema = transactionDataSchema.partial();

export type TransactionCreateSchema = z.infer<typeof transactionCreateSchema>;
export type TransactionUpdateSchema = z.infer<typeof transactionUpdateSchema>;
