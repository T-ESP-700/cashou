// Schémas de validation Zod pour les participations aux quiz (UserQuiz)
// Zod permet de valider et typer les données d'entrée de manière sécurisée
import { z } from "zod";

// Schéma de base contenant toutes les propriétés d'une participation quiz (sans l'ID auto-généré)
// Utilisation de .nullish() au lieu de .optional() pour accepter null et undefined
export const userQuizDataSchema = z.object({
    quizId: z.number().int().positive("L'ID du quiz doit être un nombre positif").nullish(),
    userId: z.number().int().positive("L'ID de l'utilisateur doit être un nombre positif").nullish(),
    completedAt: z.string().refine(
        (dateStr) => {
            // Accepte les formats: YYYY-MM-DD ou ISO 8601 complet
            const dateRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/;
            return dateRegex.test(dateStr) && !isNaN(Date.parse(dateStr));
        },
        { message: "Format de date invalide. Utilisez YYYY-MM-DD ou ISO 8601 complet" }
    ).transform((str) => new Date(str)).nullish(),
    isCorrect: z.boolean().nullish(),
});
export type UserQuizDataSchema = z.infer<typeof userQuizDataSchema>;

// Schéma pour la création d'une participation quiz - identique au schéma de base
// Séparé pour clarté conceptuelle et évolutions futures possibles
export const userQuizCreateSchema = userQuizDataSchema;
export type UserQuizCreateSchema = z.infer<typeof userQuizCreateSchema>;

// Schéma pour la mise à jour d'une participation quiz
// Combine l'ID obligatoire avec les données optionnelles à modifier
export const userQuizUpdateSchema = z.object({
    id: z.number().min(1, "L'ID doit être un nombre > 0"),
    data: userQuizDataSchema.partial() // Tous les champs deviennent optionnels pour l'update
});
export type UserQuizUpdateSchema = z.infer<typeof userQuizUpdateSchema>;

// Schéma simple pour les opérations nécessitant uniquement un ID
// Utilisé pour les consultations et suppressions
export const userQuizIdSchema = z.object({
    id: z.number().min(1, "L'ID doit être un nombre > 0")
});
export type UserQuizIdSchema = z.infer<typeof userQuizIdSchema>;

// Schéma pour rechercher les participations d'un utilisateur
export const userQuizByUserSchema = z.object({
    userId: z.number().min(1, "L'ID de l'utilisateur doit être un nombre > 0")
});
export type UserQuizByUserSchema = z.infer<typeof userQuizByUserSchema>;

// Schéma pour rechercher les participations d'un quiz
export const userQuizByQuizSchema = z.object({
    quizId: z.number().min(1, "L'ID du quiz doit être un nombre > 0")
});
export type UserQuizByQuizSchema = z.infer<typeof userQuizByQuizSchema>;

// Schéma pour démarrer un quiz (créer une participation)
export const startQuizSchema = z.object({
    quizId: z.number().min(1, "L'ID du quiz doit être un nombre > 0"),
    userId: z.number().min(1, "L'ID de l'utilisateur doit être un nombre > 0")
});
export type StartQuizSchema = z.infer<typeof startQuizSchema>;

// Schéma pour terminer un quiz (mettre à jour avec résultat)
export const completeQuizSchema = z.object({
    id: z.number().min(1, "L'ID doit être un nombre > 0"),
    isCorrect: z.boolean("Le résultat doit être un booléen")
});
export type CompleteQuizSchema = z.infer<typeof completeQuizSchema>;

// Schéma pour rechercher les participations par résultat
export const userQuizByResultSchema = z.object({
    isCorrect: z.boolean()
});
export type UserQuizByResultSchema = z.infer<typeof userQuizByResultSchema>;
