// Schémas de validation Zod pour les quiz
// Zod permet de valider et typer les données d'entrée de manière sécurisée
import { z } from "zod";

// Énumération pour les types de quiz
export const QuizTypeEnum = z.enum(["DAILY", "MCQ"]);
export type QuizTypeEnum = z.infer<typeof QuizTypeEnum>;

// Schéma de base contenant toutes les propriétés d'un quiz (sans l'ID auto-généré)
// Utilisation de .nullish() au lieu de .optional() pour accepter null et undefined
export const quizDataSchema = z.object({
    type: QuizTypeEnum.nullish(),
    title: z.string().min(1, "Le titre est requis").nullish(),
    date: z.string().refine(
        (dateStr) => {
            // Accepte les formats: YYYY-MM-DD ou ISO 8601 complet
            const dateRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/;
            return dateRegex.test(dateStr) && !isNaN(Date.parse(dateStr));
        },
        { message: "Format de date invalide. Utilisez YYYY-MM-DD ou ISO 8601 complet" }
    ).transform((str) => new Date(str)).nullish(),
    levelId: z.number().int().positive().nullish(),
    description: z.string().nullish(),
});
export type QuizDataSchema = z.infer<typeof quizDataSchema>;

// Schéma pour la création d'un quiz - identique au schéma de base
// Séparé pour clarté conceptuelle et évolutions futures possibles
export const quizCreateSchema = quizDataSchema;
export type QuizCreateSchema = z.infer<typeof quizCreateSchema>;

// Schéma pour la mise à jour d'un quiz
// Combine l'ID obligatoire avec les données optionnelles à modifier
export const quizUpdateSchema = z.object({
    id: z.number().min(1, "L'ID doit être un nombre > 0"),
    data: quizDataSchema
});
export type QuizUpdateSchema = z.infer<typeof quizUpdateSchema>;

// Schéma simple pour les opérations nécessitant uniquement un ID
// Utilisé pour les consultations et suppressions
export const quizIdSchema = z.object({
    id: z.number().min(1, "L'ID doit être un nombre > 0")
});
export type QuizIdSchema = z.infer<typeof quizIdSchema>;

// Schéma pour vérifier l'existence d'un Daily Quiz à une date
export const quizDateCheckSchema = z.object({
    date: z.string().refine(
        (dateStr) => {
            const dateRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/;
            return dateRegex.test(dateStr) && !isNaN(Date.parse(dateStr));
        },
        { message: "Format de date invalide. Utilisez YYYY-MM-DD ou ISO 8601 complet" }
    )
});
export type QuizDateCheckSchema = z.infer<typeof quizDateCheckSchema>;

// Schéma pour récupérer l'historique des Daily Quiz
export const quizHistorySchema = z.object({
    limit: z.number().min(1).max(100).optional().default(30)
});
export type QuizHistorySchema = z.infer<typeof quizHistorySchema>;


