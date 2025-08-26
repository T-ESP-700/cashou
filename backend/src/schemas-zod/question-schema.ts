// Schémas de validation Zod pour les questions
// Zod permet de valider et typer les données d'entrée de manière sécurisée
import { z } from "zod";

// Schéma de base contenant toutes les propriétés d'une question (sans l'ID auto-généré)
// Utilisation de .nullish() au lieu de .optional() pour accepter null et undefined
export const questionDataSchema = z.object({
    text: z.string().min(1, "Le texte de la question est requis").nullish(),
});
export type QuestionDataSchema = z.infer<typeof questionDataSchema>;

// Schéma pour la création d'une question - identique au schéma de base
// Séparé pour clarté conceptuelle et évolutions futures possibles
export const questionCreateSchema = questionDataSchema;
export type QuestionCreateSchema = z.infer<typeof questionCreateSchema>;

// Schéma pour la mise à jour d'une question
// Combine l'ID obligatoire avec les données optionnelles à modifier
export const questionUpdateSchema = z.object({
    id: z.number().min(1, "L'ID doit être un nombre > 0"),
    data: questionDataSchema
});
export type QuestionUpdateSchema = z.infer<typeof questionUpdateSchema>;

// Schéma simple pour les opérations nécessitant uniquement un ID
// Utilisé pour les consultations et suppressions
export const questionIdSchema = z.object({
    id: z.number().min(1, "L'ID doit être un nombre > 0")
});
export type QuestionIdSchema = z.infer<typeof questionIdSchema>;
