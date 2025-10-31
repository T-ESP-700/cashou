// Schémas de validation Zod pour les niveaux
// Zod permet de valider et typer les données d'entrée de manière sécurisée
import { z } from "zod";

// Schéma de base contenant toutes les propriétés d'un niveau (sans l'ID auto-généré)
// Utilisation de .nullish() au lieu de .optional() pour accepter null et undefined
export const levelDataSchema = z.object({
    title: z.string().min(1, "Le titre est requis").nullish(),
    number: z.number().int().positive().nullish(),
    duration: z.number().int().positive().nullish(),
    speed: z.number().int().positive().nullish(),
    startBalance: z.number().int().min(0).nullish(),
    pointsRequired: z.number().int().min(0).nullish(),
    description: z.string().nullish(),
});
export type LevelDataSchema = z.infer<typeof levelDataSchema>;

// Schéma pour la création d'un niveau - identique au schéma de base
// Séparé pour clarté conceptuelle et évolutions futures possibles
export const levelCreateSchema = levelDataSchema;
export type LevelCreateSchema = z.infer<typeof levelCreateSchema>;

// Schéma pour la mise à jour d'un niveau
// Combine l'ID obligatoire avec les données optionnelles à modifier
export const levelUpdateSchema = z.object({
    id: z.number().min(1, "L'ID doit être un nombre > 0"),
    data: levelDataSchema
});
export type LevelUpdateSchema = z.infer<typeof levelUpdateSchema>;

// Schéma simple pour les opérations nécessitant uniquement un ID
// Utilisé pour les consultations et suppressions
export const levelIdSchema = z.object({
    id: z.number().min(1, "L'ID doit être un nombre > 0")
});
export type LevelIdSchema = z.infer<typeof levelIdSchema>;

// Schéma pour les routes nécessitant uniquement un userId
export const userIdSchema = z.object({
    userId: z.number().min(1, "L'ID utilisateur doit être > 0")
});
export type UserIdSchema = z.infer<typeof userIdSchema>;

// Schéma pour vérifier la disponibilité (déverrouillage) d'un niveau par un utilisateur
export const availabilitySchema = z.object({
    userId: z.number().min(1, "L'ID utilisateur doit être > 0"),
    levelId: z.number().min(1, "L'ID du niveau doit être > 0"),
});
export type AvailabilitySchema = z.infer<typeof availabilitySchema>;

// Schéma pour associer/remplacer des objectifs à un niveau
export const setGoalsSchema = z.object({
    levelId: z.number().min(1, "L'ID du niveau doit être > 0"),
    goalIds: z.array(z.number().min(1, "Chaque ID d'objectif doit être > 0")).default([])
});
export type SetGoalsSchema = z.infer<typeof setGoalsSchema>;

// Schéma pour associer/remplacer des événements à un niveau
export const setEventsSchema = z.object({
    levelId: z.number().min(1, "L'ID du niveau doit être > 0"),
    eventIds: z.array(z.number().min(1, "Chaque ID d'événement doit être > 0")).default([])
});
export type SetEventsSchema = z.infer<typeof setEventsSchema>;