import { z } from "zod";

// Schéma de base pour les données du level (sans ID)
export const levelDataSchema = z.object({
    title: z.string().min(1, "Le titre est requis").optional(),
    number: z.number().int().positive().optional(),
    duration: z.number().int().positive().optional(),
    speed: z.number().int().positive().optional(),
    startBalance: z.number().int().min(0).optional(),
    pointsRequired: z.number().int().min(0).optional(),
    description: z.string().optional(),
});
export type LevelDataSchema = z.infer<typeof levelDataSchema>;


export const levelCreateSchema = levelDataSchema;
export type LevelCreateSchema = z.infer<typeof levelCreateSchema>;


export const levelUpdateSchema = z.object({
    id: z.number().min(1, "L'ID doit être un nombre > 0"),
    data: levelDataSchema
});
export type LevelUpdateSchema = z.infer<typeof levelUpdateSchema>;


export const levelIdSchema = z.object({
    id: z.number().min(1, "L'ID doit être un nombre > 0")
});
export type LevelIdSchema = z.infer<typeof levelIdSchema>;