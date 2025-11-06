import { z } from "zod";

export const transactionTemplateSchema = z.object({
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

export const transactionCreateSchema = transactionTemplateSchema;
export const transactionUpdateSchema = transactionTemplateSchema.partial();

export type TransactionCreateSchema = z.infer<typeof transactionCreateSchema>;
export type TransactionUpdateSchema = z.infer<typeof transactionUpdateSchema>;
