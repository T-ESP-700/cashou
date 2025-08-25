
// Schémas de validation Zod pour les événements
// Zod permet de valider et typer les données d'entrée de manière sécurisée
import { z } from "zod";

// Schéma de base contenant toutes les propriétés d'un événement (sans l'ID auto-généré)
// Utilisation de .nullish() au lieu de .optional() pour accepter null et undefined
export const eventDataSchema = z.object({
    title: z.string().min(1, "Le titre est requis").nullish(),
    description: z.string().nullish(),
    hasImpact: z.boolean().nullish(),
});
export type EventDataSchema = z.infer<typeof eventDataSchema>;

// Schéma pour la création d'un événement - identique au schéma de base
// Séparé pour clarté conceptuelle et évolutions futures possibles
export const eventCreateSchema = eventDataSchema;
export type EventCreateSchema = z.infer<typeof eventCreateSchema>;

// Schéma pour la mise à jour d'un événement
// Combine l'ID obligatoire avec les données optionnelles à modifier
export const eventUpdateSchema = z.object({
    id: z.number().min(1, "L'ID doit être un nombre > 0"),
    data: eventDataSchema
});
export type EventUpdateSchema = z.infer<typeof eventUpdateSchema>;

// Schéma simple pour les opérations nécessitant uniquement un ID
// Utilisé pour les consultations et suppressions
export const eventIdSchema = z.object({
    id: z.number().min(1, "L'ID doit être un nombre > 0")
});
export type EventIdSchema = z.infer<typeof eventIdSchema>;
