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

export const transactionCreateSchema = transactionDataSchema;
export const transactionUpdateSchema = transactionDataSchema.partial();

export type TransactionCreateSchema = z.infer<typeof transactionCreateSchema>;
export type TransactionUpdateSchema = z.infer<typeof transactionUpdateSchema>;
