// Schémas de validation Zod pour l'historique des actifs
// Zod permet de valider et typer les données d'entrée de manière sécurisée
import { z } from "zod";

// Schéma de base contenant toutes les propriétés d'un historique d'actif (sans l'ID auto-généré)
// Utilisation de .nullish() au lieu de .optional() pour accepter null et undefined
export const assetHistoryDataSchema = z.object({
    assetId: z.number().int().positive("L'ID de l'actif doit être un nombre positif").nullish(),
    timestamp: z.string().transform((val) => val ? new Date(val) : null).nullish(),
});
export type AssetHistoryDataSchema = z.infer<typeof assetHistoryDataSchema>;

// Schéma pour la création d'un historique d'actif - identique au schéma de base
// Séparé pour clarté conceptuelle et évolutions futures possibles
export const assetHistoryCreateSchema = assetHistoryDataSchema;
export type AssetHistoryCreateSchema = z.infer<typeof assetHistoryCreateSchema>;

// Schéma pour la mise à jour d'un historique d'actif
// Combine l'ID obligatoire avec les données optionnelles à modifier
export const assetHistoryUpdateSchema = z.object({
    id: z.number().min(1, "L'ID doit être un nombre > 0"),
    data: assetHistoryDataSchema
});
export type AssetHistoryUpdateSchema = z.infer<typeof assetHistoryUpdateSchema>;

// Schéma simple pour les opérations nécessitant uniquement un ID
// Utilisé pour les consultations et suppressions
export const assetHistoryIdSchema = z.object({
    id: z.number().min(1, "L'ID doit être un nombre > 0")
});
export type AssetHistoryIdSchema = z.infer<typeof assetHistoryIdSchema>;
