// Schémas de validation Zod pour les entrées du dictionnaire (Dico)
// Zod permet de valider et typer les données d'entrée de manière sécurisée
import { z } from "zod";

// Schéma de base contenant toutes les propriétés d'une entrée de dictionnaire (sans l'ID auto-généré)
export const dicoEntryDataSchema = z.object({
    term: z.string().min(1, "Le terme est requis").max(100, "Le terme ne peut pas dépasser 100 caractères"),
    definition: z.string().min(1, "La définition est requise"),
});
export type DicoEntryDataSchema = z.infer<typeof dicoEntryDataSchema>;

// Schéma pour la création d'une entrée - identique au schéma de base
export const dicoEntryCreateSchema = dicoEntryDataSchema;
export type DicoEntryCreateSchema = z.infer<typeof dicoEntryCreateSchema>;

// Schéma pour la mise à jour d'une entrée
// Combine l'ID obligatoire avec les données optionnelles à modifier
export const dicoEntryUpdateSchema = z.object({
    id: z.number().min(1, "L'ID doit être un nombre > 0"),
    data: dicoEntryDataSchema.partial(), // Tous les champs sont optionnels pour la mise à jour
});
export type DicoEntryUpdateSchema = z.infer<typeof dicoEntryUpdateSchema>;

// Schéma simple pour les opérations nécessitant uniquement un ID
// Utilisé pour les consultations et suppressions
export const dicoEntryIdSchema = z.object({
    id: z.number().min(1, "L'ID doit être un nombre > 0")
});
export type DicoEntryIdSchema = z.infer<typeof dicoEntryIdSchema>;

// Schéma pour la recherche par terme
export const dicoEntrySearchSchema = z.object({
    query: z.string().min(1, "Le terme de recherche est requis"),
});
export type DicoEntrySearchSchema = z.infer<typeof dicoEntrySearchSchema>;

// Schéma pour la pagination
// En Zod v4, .default() rend implicitement le champ optionnel à l'input
export const dicoEntryPaginationSchema = z.object({
    page: z.number().min(1).default(1),
    limit: z.number().min(1).max(100).default(50),
});
export type DicoEntryPaginationSchema = z.infer<typeof dicoEntryPaginationSchema>;
