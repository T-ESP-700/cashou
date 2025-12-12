import { z } from "zod";

export const gameInstanceBaseSchema = z.object({
  type: z.string().nullable().optional(),
  userId: z.string().nullable().optional(),
  levelId: z.number().int().nullable().optional(),
  startBalance: z.number().int().nullable().optional(),
  isPaused: z.boolean().nullable().optional(),
  actionRequired: z.boolean().nullable().optional(),
  pausedAt: z.coerce.date().nullable().optional(),
  // New fields for game time management
  totalPausedDuration: z.number().int().nullable().optional(),
  currentEventIndex: z.number().int().nullable().optional(),
  isEnded: z.boolean().nullable().optional(),
  endedAt: z.coerce.date().nullable().optional(),
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

export const gameInstanceUpdateWithIdSchema = gameInstanceUpdateSchema.extend({
  id: z.number().int().positive("L'ID de l'instance de jeu doit être positif"),
});

export const gameInstanceActionSchema = gameInstanceBaseActionSchema;

// Types
export type GameInstanceCreateSchema = z.infer<typeof gameInstanceCreateSchema>;
export type GameInstanceUpdateSchema = z.infer<typeof gameInstanceUpdateSchema>;
export type GameInstanceUpdateWithIdSchema = z.infer<typeof gameInstanceUpdateWithIdSchema>;
export type GameInstanceActionSchema = z.infer<typeof gameInstanceBaseActionSchema>;
