// Schémas de validation Zod pour les impacts
// Zod permet de valider et typer les données d'entrée de manière sécurisée
import { z } from "zod";

// Schéma de base contenant toutes les propriétés d'un impact (sans l'ID auto-généré)
// Utilisation de .nullish() au lieu de .optional() pour accepter null et undefined
export const impactDataSchema = z.object({
    eventId: z.number().int().positive("L'ID de l'événement doit être un nombre positif").nullish(),
    fieldId: z.number().int().positive("L'ID du champ doit être un nombre positif").nullish(),
    submarketId: z.number().int().positive("L'ID du sous-marché doit être un nombre positif").nullish(),
    coef: z.number().int().nullish(),
});
export type ImpactDataSchema = z.infer<typeof impactDataSchema>;

// Schéma pour la création d'un impact - identique au schéma de base
// Séparé pour clarté conceptuelle et évolutions futures possibles
export const impactCreateSchema = impactDataSchema;
export type ImpactCreateSchema = z.infer<typeof impactCreateSchema>;

// Schéma pour la mise à jour d'un impact
// Combine l'ID obligatoire avec les données optionnelles à modifier
export const impactUpdateSchema = z.object({
    id: z.number().min(1, "L'ID doit être un nombre > 0"),
    data: impactDataSchema
});
export type ImpactUpdateSchema = z.infer<typeof impactUpdateSchema>;

// Schéma simple pour les opérations nécessitant uniquement un ID
// Utilisé pour les consultations et suppressions
export const impactIdSchema = z.object({
    id: z.number().min(1, "L'ID doit être un nombre > 0")
});
export type ImpactIdSchema = z.infer<typeof impactIdSchema>;
