// Schémas de validation Zod pour les réponses des utilisateurs (UserAnswer)
// Zod permet de valider et typer les données d'entrée de manière sécurisée
import { z } from "zod";

// Schéma de base contenant toutes les propriétés d'une réponse utilisateur (sans l'ID auto-généré)
// Utilisation de .nullish() au lieu de .optional() pour accepter null et undefined
export const userAnswerDataSchema = z.object({
    userId: z.number().int().positive("L'ID de l'utilisateur doit être un nombre positif").nullish(),
    questionId: z.number().int().positive("L'ID de la question doit être un nombre positif").nullish(),
    answerId: z.number().int().positive("L'ID de la réponse doit être un nombre positif").nullish(),
    accurate: z.boolean().nullish(),
});
export type UserAnswerDataSchema = z.infer<typeof userAnswerDataSchema>;

// Schéma pour la création d'une réponse utilisateur - identique au schéma de base
// Séparé pour clarté conceptuelle et évolutions futures possibles
export const userAnswerCreateSchema = userAnswerDataSchema;
export type UserAnswerCreateSchema = z.infer<typeof userAnswerCreateSchema>;

// Schéma pour la mise à jour d'une réponse utilisateur
// Combine l'ID obligatoire avec les données optionnelles à modifier
export const userAnswerUpdateSchema = z.object({
    id: z.number().min(1, "L'ID doit être un nombre > 0"),
    data: userAnswerDataSchema.partial() // Tous les champs deviennent optionnels pour l'update
});
export type UserAnswerUpdateSchema = z.infer<typeof userAnswerUpdateSchema>;

// Schéma simple pour les opérations nécessitant uniquement un ID
// Utilisé pour les consultations et suppressions
export const userAnswerIdSchema = z.object({
    id: z.number().min(1, "L'ID doit être un nombre > 0")
});
export type UserAnswerIdSchema = z.infer<typeof userAnswerIdSchema>;

// Schéma pour rechercher les réponses d'un utilisateur
export const userAnswerByUserSchema = z.object({
    userId: z.number().min(1, "L'ID de l'utilisateur doit être un nombre > 0")
});
export type UserAnswerByUserSchema = z.infer<typeof userAnswerByUserSchema>;

// Schéma pour rechercher les réponses à une question
export const userAnswerByQuestionSchema = z.object({
    questionId: z.number().min(1, "L'ID de la question doit être un nombre > 0")
});
export type UserAnswerByQuestionSchema = z.infer<typeof userAnswerByQuestionSchema>;

// Schéma pour rechercher par réponse spécifique
export const userAnswerByAnswerSchema = z.object({
    answerId: z.number().min(1, "L'ID de la réponse doit être un nombre > 0")
});
export type UserAnswerByAnswerSchema = z.infer<typeof userAnswerByAnswerSchema>;

// Schéma pour enregistrer une réponse (action complète)
export const submitAnswerSchema = z.object({
    userId: z.number().min(1, "L'ID de l'utilisateur doit être un nombre > 0"),
    questionId: z.number().min(1, "L'ID de la question doit être un nombre > 0"),
    answerId: z.number().min(1, "L'ID de la réponse doit être un nombre > 0")
});
export type SubmitAnswerSchema = z.infer<typeof submitAnswerSchema>;

// Schéma pour rechercher les réponses par exactitude
export const userAnswerByAccuracySchema = z.object({
    accurate: z.boolean()
});
export type UserAnswerByAccuracySchema = z.infer<typeof userAnswerByAccuracySchema>;

// Schéma pour rechercher les réponses d'un utilisateur à une question spécifique
export const userAnswerByUserAndQuestionSchema = z.object({
    userId: z.number().min(1, "L'ID de l'utilisateur doit être un nombre > 0"),
    questionId: z.number().min(1, "L'ID de la question doit être un nombre > 0")
});
export type UserAnswerByUserAndQuestionSchema = z.infer<typeof userAnswerByUserAndQuestionSchema>;
