// Schémas de validation Zod pour les actifs
// Zod permet de valider et typer les données d'entrée de manière sécurisée
import { z } from "zod";

// Schéma de base contenant toutes les propriétés d'un actif (sans l'ID auto-généré)
// Utilisation de .nullish() au lieu de .optional() pour accepter null et undefined
export const assetDataSchema = z.object({
    title: z.string().min(1, "Le titre est requis").nullish(),
    symbol: z.string().nullish(),
    fieldId: z.number().int().positive("L'ID du champ doit être un nombre positif").nullish(),
    description: z.string().nullish(),
    marketId: z.number().int().positive("L'ID du marché doit être un nombre positif").nullish(),
    submarketId: z.number().int().positive("L'ID du sous-marché doit être un nombre positif").nullish(),
    taux: z.number().nullish(),
});
export type AssetDataSchema = z.infer<typeof assetDataSchema>;

// Schéma pour la création d'un actif - identique au schéma de base
// Séparé pour clarté conceptuelle et évolutions futures possibles
export const assetCreateSchema = assetDataSchema;
export type AssetCreateSchema = z.infer<typeof assetCreateSchema>;

// Schéma pour la mise à jour d'un actif
// Combine l'ID obligatoire avec les données optionnelles à modifier
export const assetUpdateSchema = z.object({
    id: z.number().min(1, "L'ID doit être un nombre > 0"),
    data: assetDataSchema
});
export type AssetUpdateSchema = z.infer<typeof assetUpdateSchema>;

// Schéma simple pour les opérations nécessitant uniquement un ID
// Utilisé pour les consultations et suppressions
export const assetIdSchema = z.object({
    id: z.number().min(1, "L'ID doit être un nombre > 0")
});
export type AssetIdSchema = z.infer<typeof assetIdSchema>;
