// src/server/routers/field.router.ts
import { initTRPC } from "@trpc/server";
import { FieldService } from "../services/field.service";
import {fieldCreateSchema, fieldUpdateSchema, fieldIdSchema} from "../schemas-zod/field-schema.ts";
import { z } from "zod";

// Initialisation de tRPC pour ce router spécifique
const t = initTRPC.create();

// Instance unique du service métier pour ce router
const fieldService = new FieldService();

export const fieldRouter = t.router({

    /**
     * Récupère tous les champs
     * Endpoint: GET http://localhost:3000/trpc/field.getAll
     * Pas de paramètre d'entrée requis
     */
    getAll: t.procedure.query(async () => {
        return await fieldService.findAll();
    }),

    /**
     * Récupère un champ par son ID
     * Endpoint: GET http://localhost:3000/trpc/field.getById?input={"id":1}
     * @input {id: number} - ID du champ recherché, validé par fieldIdSchema
     */
    getById: t.procedure
        .input(fieldIdSchema) // Validation automatique de l'entrée
        .query(async ({ input }) => {
            return await fieldService.findOne(input.id);
        }),

    /**
     * Récupère tous les champs d'un marché spécifique
     * Endpoint: GET http://localhost:3000/trpc/field.getByMarketId?input={"marketId":1}
     * @input {marketId: number} - ID du marché parent
     */
    getByMarketId: t.procedure
        .input(z.object({
            marketId: z.number().min(1, "L'ID du marché doit être un nombre > 0")
        }))
        .query(async ({ input }) => {
            return await fieldService.findByMarketId(input.marketId);
        }),

    /**
     * Crée un nouveau champ
     * Endpoint: POST http://localhost:3000/trpc/field.create
     * @input FieldCreateSchema - Données du champ à créer, validées automatiquement
     */
    create: t.procedure
        .input(fieldCreateSchema) // Validation des données avant traitement
        .mutation(async ({ input }) => { // mutation = opération de modification
            return await fieldService.create(input);
        }),

    /**
     * Met à jour un champ existant
     * Endpoint: POST http://localhost:3000/trpc/field.update
     * @input FieldUpdateSchema - ID + données à modifier, validées automatiquement
     */
    update: t.procedure
        .input(fieldUpdateSchema) // Validation de l'ID et des données
        .mutation(async ({ input }) => {
            return await fieldService.update(input.id, input.data);
        }),

    /**
     * Supprime un champ
     * Endpoint: POST http://localhost:3000/trpc/field.delete
     * @input {id: number} - ID du champ à supprimer, validé par fieldIdSchema
     */
    delete: t.procedure
        .input(fieldIdSchema) // Validation de l'ID
        .mutation(async ({ input }) => {
            return await fieldService.delete(input.id);
        }),
});

// Export du type pour utilisation côté frontend (IntelliSense et type-safety)
export type FieldRouter = typeof fieldRouter;
