// Schémas de validation Zod pour les réponses
// Zod permet de valider et typer les données d'entrée de manière sécurisée
import { z } from "zod";

// Schéma de base contenant toutes les propriétés d'une réponse (sans l'ID auto-généré)
// Utilisation de .nullish() au lieu de .optional() pour accepter null et undefined
export const answerDataSchema = z.object({
    questionId: z.number().int().positive("L'ID de la question doit être un nombre positif").nullish(),
    text: z.string().min(1, "Le texte de la réponse est requis").nullish(),
    isCorrect: z.boolean().nullish(),
});
export type AnswerDataSchema = z.infer<typeof answerDataSchema>;

// Schéma pour la création d'une réponse - identique au schéma de base
// Séparé pour clarté conceptuelle et évolutions futures possibles
export const answerCreateSchema = answerDataSchema;
export type AnswerCreateSchema = z.infer<typeof answerCreateSchema>;

// Schéma pour la mise à jour d'une réponse
// Combine l'ID obligatoire avec les données optionnelles à modifier
export const answerUpdateSchema = z.object({
    id: z.number().min(1, "L'ID doit être un nombre > 0"),
    data: answerDataSchema
});
export type AnswerUpdateSchema = z.infer<typeof answerUpdateSchema>;

// Schéma simple pour les opérations nécessitant uniquement un ID
// Utilisé pour les consultations et suppressions
export const answerIdSchema = z.object({
    id: z.number().min(1, "L'ID doit être un nombre > 0")
});
export type AnswerIdSchema = z.infer<typeof answerIdSchema>;

// Schéma spécifique pour récupérer les réponses d'une question
export const answerByQuestionSchema = z.object({
    questionId: z.number().min(1, "L'ID de la question doit être un nombre > 0")
});
export type AnswerByQuestionSchema = z.infer<typeof answerByQuestionSchema>;
