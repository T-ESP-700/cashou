// Schémas de validation Zod pour les associations niveau-objectif
// Zod permet de valider et typer les données d'entrée de manière sécurisée
import { z } from "zod";

// Schéma de base contenant toutes les propriétés d'une association (sans l'ID auto-généré)
// Les IDs de niveau et objectif sont requis car ce sont des clés étrangères obligatoires
export const levelGoalDataSchema = z.object({
    levelId: z.number().int().positive("L'ID du niveau doit être un nombre entier positif"),
    goalId: z.number().int().positive("L'ID de l'objectif doit être un nombre entier positif"),
});
export type LevelGoalDataSchema = z.infer<typeof levelGoalDataSchema>;

// Schéma pour la création d'une association - identique au schéma de base
// Séparé pour clarté conceptuelle et évolutions futures possibles
export const levelGoalCreateSchema = levelGoalDataSchema;
export type LevelGoalCreateSchema = z.infer<typeof levelGoalCreateSchema>;

// Schéma pour la mise à jour d'une association
// Combine l'ID obligatoire avec les données optionnelles à modifier
export const levelGoalUpdateSchema = z.object({
    id: z.number().min(1, "L'ID doit être un nombre > 0"),
    data: levelGoalDataSchema
});
export type LevelGoalUpdateSchema = z.infer<typeof levelGoalUpdateSchema>;

// Schéma simple pour les opérations nécessitant uniquement un ID
// Utilisé pour les consultations et suppressions
export const levelGoalIdSchema = z.object({
    id: z.number().min(1, "L'ID doit être un nombre > 0")
});
export type LevelGoalIdSchema = z.infer<typeof levelGoalIdSchema>;
