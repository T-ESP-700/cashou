// Schémas de validation Zod pour les associations niveau-événement
// Zod permet de valider et typer les données d'entrée de manière sécurisée
import { z } from "zod";

// Schéma de base contenant toutes les propriétés d'une association (sans l'ID auto-généré)
// Les IDs de niveau et événement sont requis car ce sont des clés étrangères obligatoires
export const levelEventDataSchema = z.object({
    levelId: z.number().int().positive("L'ID du niveau doit être un nombre entier positif"),
    eventId: z.number().int().positive("L'ID de l'événement doit être un nombre entier positif"),
});
export type LevelEventDataSchema = z.infer<typeof levelEventDataSchema>;

// Schéma pour la création d'une association - identique au schéma de base
// Séparé pour clarté conceptuelle et évolutions futures possibles
export const levelEventCreateSchema = levelEventDataSchema;
export type LevelEventCreateSchema = z.infer<typeof levelEventCreateSchema>;

// Schéma pour la mise à jour d'une association
// Combine l'ID obligatoire avec les données optionnelles à modifier
export const levelEventUpdateSchema = z.object({
    id: z.number().min(1, "L'ID doit être un nombre > 0"),
    data: levelEventDataSchema
});
export type LevelEventUpdateSchema = z.infer<typeof levelEventUpdateSchema>;

// Schéma simple pour les opérations nécessitant uniquement un ID
// Utilisé pour les consultations et suppressions
export const levelEventIdSchema = z.object({
    id: z.number().min(1, "L'ID doit être un nombre > 0")
});
export type LevelEventIdSchema = z.infer<typeof levelEventIdSchema>;
