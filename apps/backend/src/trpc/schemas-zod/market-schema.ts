// Schémas de validation Zod pour les marchés
// Zod permet de valider et typer les données d'entrée de manière sécurisée
import { z } from "zod";

// Schéma de base contenant toutes les propriétés d'un marché (sans l'ID auto-généré)
// Utilisation de .nullish() au lieu de .optional() pour accepter null et undefined
export const marketDataSchema = z.object({
    title: z.string().min(1, "Le titre est requis").nullish(),
    description: z.string().nullish(),
});
export type MarketDataSchema = z.infer<typeof marketDataSchema>;

// Schéma pour la création d'un marché - identique au schéma de base
// Séparé pour clarté conceptuelle et évolutions futures possibles
export const marketCreateSchema = marketDataSchema;
export type MarketCreateSchema = z.infer<typeof marketCreateSchema>;

// Schéma pour la mise à jour d'un marché
// Combine l'ID obligatoire avec les données optionnelles à modifier
export const marketUpdateSchema = z.object({
    id: z.number().min(1, "L'ID doit être un nombre > 0"),
    data: marketDataSchema
});
export type MarketUpdateSchema = z.infer<typeof marketUpdateSchema>;

// Schéma simple pour les opérations nécessitant uniquement un ID
// Utilisé pour les consultations et suppressions
export const marketIdSchema = z.object({
    id: z.number().min(1, "L'ID doit être un nombre > 0")
});
export type MarketIdSchema = z.infer<typeof marketIdSchema>;
