import { z } from "zod";

export const gameInstanceBaseSchema = z.object({
  type: z.string().nullable().optional(),
  userId: z.number().int().nullable().optional(),
  levelId: z.number().int().nullable().optional(),
  startBalance: z.number().int().nullable().optional(),
  isPaused: z.boolean().nullable().optional(),
  actionRequired: z.boolean().nullable().optional(),
  pausedAt: z.coerce.date().nullable().optional(),
});
export const gameInstanceIdSchema = z.object({
  id: z.number().int().positive("L'ID de l'instance de jeu doit être positif"),
});
export const gameInstanceBaseActionSchema = z.object({
  id: z.number().positive(),
  actionRequired: z.boolean()
});

export const gameInstanceCreateSchema = gameInstanceBaseSchema;
export const gameInstanceUpdateSchema = gameInstanceBaseSchema.partial();
export const gameInstanceActionSchema = gameInstanceBaseActionSchema;


export type GameInstanceCreateSchema = z.infer<typeof gameInstanceCreateSchema>;
export type GameInstanceUpdateSchema = z.infer<typeof gameInstanceUpdateSchema>;
export type GameInstanceActionSchema = z.Infer<typeof gameInstanceBaseSchema>;
