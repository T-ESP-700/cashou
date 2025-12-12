// Router tRPC pour la gestion des entrées du dictionnaire (Dico)
import { initTRPC } from "@trpc/server";
import { DicoEntryService } from "../services/dico-entry.service.ts";
import {
    dicoEntryCreateSchema,
    dicoEntryUpdateSchema,
    dicoEntryIdSchema,
    dicoEntrySearchSchema,
    dicoEntryPaginationSchema,
} from "../schemas-zod/dico-entry-schema.ts";
import { z } from "zod";

// Initialisation de tRPC pour ce router spécifique
const t = initTRPC.create();

// Instance unique du service métier pour ce router
const dicoEntryService = new DicoEntryService();

export const dicoEntryRouter = t.router({

    /**
     * Récupère toutes les entrées du dictionnaire
     * Endpoint: GET http://localhost:3000/trpc/dicoEntry.getAll
     * Pas de paramètre d'entrée requis
     */
    getAll: t.procedure.query(async () => {
        return await dicoEntryService.findAll();
    }),

    /**
     * Récupère toutes les entrées avec pagination
     * Endpoint: GET http://localhost:3000/trpc/dicoEntry.getAllPaginated?input={"page":1,"limit":50}
     * @input {page?: number, limit?: number} - Paramètres de pagination
     */
    getAllPaginated: t.procedure
        .input(dicoEntryPaginationSchema)
        .query(async ({ input }) => {
            return await dicoEntryService.findAllPaginated(input.page, input.limit);
        }),

    /**
     * Récupère une entrée par son ID
     * Endpoint: GET http://localhost:3000/trpc/dicoEntry.getById?input={"id":1}
     * @input {id: number} - ID de l'entrée recherchée
     */
    getById: t.procedure
        .input(dicoEntryIdSchema)
        .query(async ({ input }) => {
            return await dicoEntryService.findOne(input.id);
        }),

    /**
     * Récupère une entrée par son terme exact
     * Endpoint: GET http://localhost:3000/trpc/dicoEntry.getByTerm?input={"term":"Action"}
     * @input {term: string} - Terme exact recherché
     */
    getByTerm: t.procedure
        .input(z.object({ term: z.string().min(1) }))
        .query(async ({ input }) => {
            return await dicoEntryService.findByTerm(input.term);
        }),

    /**
     * Recherche des entrées par terme ou définition (recherche partielle)
     * Endpoint: GET http://localhost:3000/trpc/dicoEntry.search?input={"query":"action"}
     * @input {query: string} - Terme de recherche
     */
    search: t.procedure
        .input(dicoEntrySearchSchema)
        .query(async ({ input }) => {
            return await dicoEntryService.search(input.query);
        }),

    /**
     * Crée une nouvelle entrée
     * Endpoint: POST http://localhost:3000/trpc/dicoEntry.create
     * @input DicoEntryCreateSchema - Données de l'entrée à créer
     */
    create: t.procedure
        .input(dicoEntryCreateSchema)
        .mutation(async ({ input }) => {
            return await dicoEntryService.create(input);
        }),

    /**
     * Crée plusieurs entrées en une seule opération
     * Endpoint: POST http://localhost:3000/trpc/dicoEntry.createMany
     * @input {entries: DicoEntryCreateSchema[]} - Liste des entrées à créer
     */
    createMany: t.procedure
        .input(z.object({ entries: z.array(dicoEntryCreateSchema) }))
        .mutation(async ({ input }) => {
            return await dicoEntryService.createMany(input.entries);
        }),

    /**
     * Met à jour une entrée existante
     * Endpoint: POST http://localhost:3000/trpc/dicoEntry.update
     * @input DicoEntryUpdateSchema - ID + données à modifier
     */
    update: t.procedure
        .input(dicoEntryUpdateSchema)
        .mutation(async ({ input }) => {
            return await dicoEntryService.update(input.id, input.data);
        }),

    /**
     * Supprime une entrée
     * Endpoint: POST http://localhost:3000/trpc/dicoEntry.delete
     * @input {id: number} - ID de l'entrée à supprimer
     */
    delete: t.procedure
        .input(dicoEntryIdSchema)
        .mutation(async ({ input }) => {
            return await dicoEntryService.delete(input.id);
        }),

    /**
     * Compte le nombre total d'entrées
     * Endpoint: GET http://localhost:3000/trpc/dicoEntry.count
     * Pas de paramètre d'entrée requis
     */
    count: t.procedure.query(async () => {
        return await dicoEntryService.count();
    }),
});

// Export du type pour utilisation côté frontend (IntelliSense et type-safety)
export type DicoEntryRouter = typeof dicoEntryRouter;
