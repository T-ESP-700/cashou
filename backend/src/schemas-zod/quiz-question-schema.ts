// Schémas de validation Zod pour les quiz-questions
// Zod permet de valider et typer les données d'entrée de manière sécurisée
import { z } from "zod";

// Schéma de base contenant toutes les propriétés d'une quiz-question (sans l'ID auto-généré)
// Utilisation de .nullish() au lieu de .optional() pour accepter null et undefined
export const quizQuestionDataSchema = z.object({
    quizId: z.number().int().positive("L'ID du quiz doit être un nombre positif").nullish(),
    questionId: z.number().int().positive("L'ID de la question doit être un nombre positif").nullish(),
    position: z.number().int().min(1, "La position doit être un nombre ≥ 1").nullish(),
});
export type QuizQuestionDataSchema = z.infer<typeof quizQuestionDataSchema>;

// Schéma pour la création d'une quiz-question - identique au schéma de base
// Séparé pour clarté conceptuelle et évolutions futures possibles
export const quizQuestionCreateSchema = quizQuestionDataSchema;
export type QuizQuestionCreateSchema = z.infer<typeof quizQuestionCreateSchema>;

// Schéma pour la mise à jour d'une quiz-question
// Combine l'ID obligatoire avec les données optionnelles à modifier
export const quizQuestionUpdateSchema = z.object({
    id: z.number().min(1, "L'ID doit être un nombre > 0"),
    data: quizQuestionDataSchema
});
export type QuizQuestionUpdateSchema = z.infer<typeof quizQuestionUpdateSchema>;

// Schéma simple pour les opérations nécessitant uniquement un ID
// Utilisé pour les consultations et suppressions
export const quizQuestionIdSchema = z.object({
    id: z.number().min(1, "L'ID doit être un nombre > 0")
});
export type QuizQuestionIdSchema = z.infer<typeof quizQuestionIdSchema>;

// Schéma spécifique pour récupérer les questions d'un quiz
export const quizQuestionByQuizSchema = z.object({
    quizId: z.number().min(1, "L'ID du quiz doit être un nombre > 0")
});
export type QuizQuestionByQuizSchema = z.infer<typeof quizQuestionByQuizSchema>;

// Schéma spécifique pour récupérer les quiz contenant une question
export const quizQuestionByQuestionSchema = z.object({
    questionId: z.number().min(1, "L'ID de la question doit être un nombre > 0")
});
export type QuizQuestionByQuestionSchema = z.infer<typeof quizQuestionByQuestionSchema>;
