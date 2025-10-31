// Schémas de validation Zod pour les objectifs
// Zod permet de valider et typer les données d'entrée de manière sécurisée
import { z } from "zod";

// Utilisation de .nullish() au lieu de .optional() pour accepter null et undefined
export const goalDataSchema = z.object({
  title: z.string().nullish(),
  description: z.string().nullish(),
});
export type GoalDataSchema = z.infer<typeof goalDataSchema>;

// Schéma pour la création d'un objectif - identique au schéma de base
// Séparé pour clarté conceptuelle et évolutions futures possibles
export const goalCreateSchema = goalDataSchema;
export type GoalCreateSchema = z.infer<typeof goalCreateSchema>;

// Schéma pour la mise à jour d'un objectif
// Combine l'ID obligatoire avec les données optionnelles à modifier
export const goalUpdateSchema = z.object({
  id: z.number().min(1, "L'ID doit être un nombre > 0"),
  data: goalDataSchema
});
export type GoalUpdateSchema = z.infer<typeof goalUpdateSchema>;

// Schéma simple pour les opérations nécessitant uniquement un ID
// Utilisé pour les consultations et suppressions
export const goalIdSchema = z.object({
  id: z.number().min(1, "L'ID doit être un nombre > 0")
});
export type GoalIdSchema = z.infer<typeof goalIdSchema>;