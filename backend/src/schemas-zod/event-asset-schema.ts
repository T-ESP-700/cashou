// Schémas de validation Zod pour les événements d'actifs
// Zod permet de valider et typer les données d'entrée de manière sécurisée
import { z } from "zod";

// Schéma de base contenant toutes les propriétés d'un événement d'actif (sans l'ID auto-généré)
// Utilisation de .nullish() au lieu de .optional() pour accepter null et undefined
export const eventAssetDataSchema = z.object({
    assetId: z.number().int().positive("L'ID de l'actif doit être un nombre positif").nullish(),
    eventId: z.number().int().positive("L'ID de l'événement doit être un nombre positif").nullish(),
    date: z.string().transform((val) => val ? new Date(val) : null).nullish(),
    value: z.number().int().nullish(),
    volume: z.number().int().nullish(),
});
export type EventAssetDataSchema = z.infer<typeof eventAssetDataSchema>;

// Schéma pour la création d'un événement d'actif - identique au schéma de base
// Séparé pour clarté conceptuelle et évolutions futures possibles
export const eventAssetCreateSchema = eventAssetDataSchema;
export type EventAssetCreateSchema = z.infer<typeof eventAssetCreateSchema>;

// Schéma pour la mise à jour d'un événement d'actif
// Combine l'ID obligatoire avec les données optionnelles à modifier
export const eventAssetUpdateSchema = z.object({
    id: z.number().min(1, "L'ID doit être un nombre > 0"),
    data: eventAssetDataSchema
});
export type EventAssetUpdateSchema = z.infer<typeof eventAssetUpdateSchema>;

// Schéma simple pour les opérations nécessitant uniquement un ID
// Utilisé pour les consultations et suppressions
export const eventAssetIdSchema = z.object({
    id: z.number().min(1, "L'ID doit être un nombre > 0")
});
export type EventAssetIdSchema = z.infer<typeof eventAssetIdSchema>;
