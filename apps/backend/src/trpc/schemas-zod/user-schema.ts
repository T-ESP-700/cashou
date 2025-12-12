import { z } from "zod";

export const userDataSchema = z.object({
    username: z.string().min(1, "Le nom d'utilisateur est requis").max(50, "Le nom d'utilisateur ne peut pas dépasser 50 caractères").nullish(),
    discriminator: z.string().max(10, "Le discriminateur ne peut pas dépasser 10 caractères").nullish(),
    email: z.string().email("Format d'email invalide").nullish(),
    lastActivity: z.string().refine(
        (dateStr) => {
            // Accepte les formats: YYYY-MM-DD ou ISO 8601 complet
            const dateRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/;
            return dateRegex.test(dateStr) && !isNaN(Date.parse(dateStr));
        },
        { message: "Format de date invalide. Utilisez YYYY-MM-DD ou ISO 8601 complet" }
    ).transform((str) => new Date(str)).nullish(),
    levelId: z.number().int().positive("L'ID du niveau doit être un nombre positif"),
    points: z.number().int().min(0, "Les points ne peuvent pas être négatifs").nullish(),
    currentStreak: z.number().int().min(0, "Le streak actuel ne peut pas être négatif").nullish(),
    maxStreak: z.number().int().min(0, "Le streak maximum ne peut pas être négatif").nullish(),
    badges: z.string().nullish(),
});
export type UserDataSchema = z.infer<typeof userDataSchema>;

// Schéma pour la création d'un utilisateur - identique au schéma de base
// Séparé pour clarté conceptuelle et évolutions futures possibles
export const userCreateSchema = userDataSchema;
export type UserCreateSchema = z.infer<typeof userCreateSchema>;

// Schéma pour la mise à jour d'un utilisateur
// Combine l'ID obligatoire avec les données optionnelles à modifier
export const userUpdateSchema = z.object({
    id: z.number().min(1, "L'ID doit être un nombre > 0"),
    data: userDataSchema.partial() // Tous les champs deviennent optionnels pour l'update
});
export type UserUpdateSchema = z.infer<typeof userUpdateSchema>;

// Schéma simple pour les opérations nécessitant uniquement un ID
// Utilisé pour les consultations et suppressions
export const userIdSchema = z.object({
    id: z.number().min(1, "L'ID doit être un nombre > 0")
});
export type UserIdSchema = z.infer<typeof userIdSchema>;

// Schéma pour rechercher des utilisateurs par niveau
export const userLevelSchema = z.object({
    levelId: z.number().min(1, "L'ID du niveau doit être un nombre > 0")
});
export type UserLevelSchema = z.infer<typeof userLevelSchema>;

// Schéma pour rechercher des utilisateurs par email
export const userEmailSchema = z.object({
    email: z.string().email("Format d'email invalide")
});
export type UserEmailSchema = z.infer<typeof userEmailSchema>;
