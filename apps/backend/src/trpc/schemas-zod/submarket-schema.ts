// Schémas de validation Zod pour les sous-marchés
// Zod permet de valider et typer les données d'entrée de manière sécurisée
import { z } from "zod";

// Schéma de base contenant toutes les propriétés d'un sous-marché (sans l'ID auto-généré)
// Utilisation de .nullish() au lieu de .optional() pour accepter null et undefined
export const submarketDataSchema = z.object({
    title: z.string().min(1, "Le titre est requis").nullish(),
    description: z.string().nullish(),
    gameInstanceId: z.number().int().positive("L'ID de la game instance doit être un nombre positif").nullish(),
    marketId: z.number().int().positive("L'ID du marché doit être un nombre positif").nullish(),
});
export type SubmarketDataSchema = z.infer<typeof submarketDataSchema>;

// Schéma pour la création d'un sous-marché - identique au schéma de base
// Séparé pour clarté conceptuelle et évolutions futures possibles
export const submarketCreateSchema = submarketDataSchema;
export type SubmarketCreateSchema = z.infer<typeof submarketCreateSchema>;

// Schéma pour la mise à jour d'un sous-marché
// Combine l'ID obligatoire avec les données optionnelles à modifier
export const submarketUpdateSchema = z.object({
    id: z.number().min(1, "L'ID doit être un nombre > 0"),
    data: submarketDataSchema
});
export type SubmarketUpdateSchema = z.infer<typeof submarketUpdateSchema>;

// Schéma simple pour les opérations nécessitant uniquement un ID
// Utilisé pour les consultations et suppressions
export const submarketIdSchema = z.object({
    id: z.number().min(1, "L'ID doit être un nombre > 0")
});
export type SubmarketIdSchema = z.infer<typeof submarketIdSchema>;
