// Schémas de validation Zod pour les champs de marché
// Zod permet de valider et typer les données d'entrée de manière sécurisée
import { z } from "zod";

// Schéma de base contenant toutes les propriétés d'un champ (sans l'ID auto-généré)
// Utilisation de .nullish() au lieu de .optional() pour accepter null et undefined
export const fieldDataSchema = z.object({
    name: z.string().min(1, "Le nom est requis").nullish(),
    marketId: z.number().int().positive("L'ID du marché doit être un nombre positif").nullish(),
});
export type FieldDataSchema = z.infer<typeof fieldDataSchema>;

// Schéma pour la création d'un champ - identique au schéma de base
// Séparé pour clarté conceptuelle et évolutions futures possibles
export const fieldCreateSchema = fieldDataSchema;
export type FieldCreateSchema = z.infer<typeof fieldCreateSchema>;

// Schéma pour la mise à jour d'un champ
// Combine l'ID obligatoire avec les données optionnelles à modifier
export const fieldUpdateSchema = z.object({
    id: z.number().min(1, "L'ID doit être un nombre > 0"),
    data: fieldDataSchema
});
export type FieldUpdateSchema = z.infer<typeof fieldUpdateSchema>;

// Schéma simple pour les opérations nécessitant uniquement un ID
// Utilisé pour les consultations et suppressions
export const fieldIdSchema = z.object({
    id: z.number().min(1, "L'ID doit être un nombre > 0")
});
export type FieldIdSchema = z.infer<typeof fieldIdSchema>;
