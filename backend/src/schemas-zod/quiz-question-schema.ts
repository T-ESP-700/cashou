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

// Schéma pour récupérer toutes les questions d'un quiz avec leurs réponses
export const quizQuestionsWithAnswersSchema = z.object({
    quizId: z.number().min(1, "L'ID du quiz doit être un nombre > 0")
});
export type QuizQuestionsWithAnswersSchema = z.infer<typeof quizQuestionsWithAnswersSchema>;

// === NOUVEAUX SCHÉMAS POUR LES ROUTES PERSONNALISÉES ===

// Schéma pour mélanger l'ordre des questions d'un quiz
export const shuffleQuizOrderSchema = z.object({
    quizId: z.number().min(1, "L'ID du quiz doit être un nombre > 0")
});
export type ShuffleQuizOrderSchema = z.infer<typeof shuffleQuizOrderSchema>;

// Schéma pour rechercher dans les questions d'un quiz
export const searchInQuizSchema = z.object({
    quizId: z.number().min(1, "L'ID du quiz doit être un nombre > 0"),
    keyword: z.string().min(1, "Le mot-clé est requis")
});
export type SearchInQuizSchema = z.infer<typeof searchInQuizSchema>;

// Schéma pour valider la structure d'un quiz
export const validateQuizStructureSchema = z.object({
    quizId: z.number().min(1, "L'ID du quiz doit être un nombre > 0")
});
export type ValidateQuizStructureSchema = z.infer<typeof validateQuizStructureSchema>;

// Schéma pour sélectionner aléatoirement des questions d'un quiz MCQ
export const getRandomQuestionsSchema = z.object({
    quizId: z.number().min(1, "L'ID du quiz doit être un nombre > 0"),
    count: z.number().min(1).max(20).optional().default(3)
});
export type GetRandomQuestionsSchema = z.infer<typeof getRandomQuestionsSchema>;
