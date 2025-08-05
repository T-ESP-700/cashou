// Schémas de validation Zod pour les niveaux
// Zod permet de valider et typer les données d'entrée de manière sécurisée
import { z } from "zod";

// Schéma de base contenant toutes les propriétés d'un niveau (sans l'ID auto-généré)
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

// Schéma pour la création d'un niveau - identique au schéma de base
// Séparé pour clarté conceptuelle et évolutions futures possibles
export const levelCreateSchema = levelDataSchema;
export type LevelCreateSchema = z.infer<typeof levelCreateSchema>;

// Schéma pour la mise à jour d'un niveau
// Combine l'ID obligatoire avec les données optionnelles à modifier
export const levelUpdateSchema = z.object({
    id: z.number().min(1, "L'ID doit être un nombre > 0"),
    data: levelDataSchema
});
export type LevelUpdateSchema = z.infer<typeof levelUpdateSchema>;

// Schéma simple pour les opérations nécessitant uniquement un ID
// Utilisé pour les consultations et suppressions
export const levelIdSchema = z.object({
    id: z.number().min(1, "L'ID doit être un nombre > 0")
});
export type LevelIdSchema = z.infer<typeof levelIdSchema>;