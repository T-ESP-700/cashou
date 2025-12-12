// src/server/routers/submarket.router.ts
import { initTRPC } from "@trpc/server";
import { SubmarketService } from "../../trpc/services/submarket.service.ts";
import {submarketCreateSchema, submarketUpdateSchema, submarketIdSchema} from "../schemas-zod/submarket-schema.ts";
import { z } from "zod";

// Initialisation de tRPC pour ce router spécifique
const t = initTRPC.create();

// Instance unique du service métier pour ce router
const submarketService = new SubmarketService();

export const submarketRouter = t.router({

    /**
     * Récupère tous les sous-marchés
     * Endpoint: GET http://localhost:3000/trpc/submarket.getAll
     * Pas de paramètre d'entrée requis
     */
    getAll: t.procedure.query(async () => {
        return await submarketService.findAll();
    }),

    /**
     * Récupère un sous-marché par son ID
     * Endpoint: GET http://localhost:3000/trpc/submarket.getById?input={"id":1}
     * @input {id: number} - ID du sous-marché recherché, validé par submarketIdSchema
     */
    getById: t.procedure
        .input(submarketIdSchema) // Validation automatique de l'entrée
        .query(async ({ input }) => {
            return await submarketService.findOne(input.id);
        }),

    /**
     * Récupère tous les sous-marchés d'un marché spécifique
     * Endpoint: GET http://localhost:3000/trpc/submarket.getByMarketId?input={"marketId":1}
     * @input {marketId: number} - ID du marché parent
     */
    getByMarketId: t.procedure
        .input(z.object({
            marketId: z.number().min(1, "L'ID du marché doit être un nombre > 0")
        }))
        .query(async ({ input }) => {
            return await submarketService.findByMarketId(input.marketId);
        }),

    /**
     * Crée un nouveau sous-marché
     * Endpoint: POST http://localhost:3000/trpc/submarket.create
     * @input SubmarketCreateSchema - Données du sous-marché à créer, validées automatiquement
     */
    create: t.procedure
        .input(submarketCreateSchema) // Validation des données avant traitement
        .mutation(async ({ input }) => { // mutation = opération de modification
            return await submarketService.create(input);
        }),

    /**
     * Met à jour un sous-marché existant
     * Endpoint: POST http://localhost:3000/trpc/submarket.update
     * @input SubmarketUpdateSchema - ID + données à modifier, validées automatiquement
     */
    update: t.procedure
        .input(submarketUpdateSchema) // Validation de l'ID et des données
        .mutation(async ({ input }) => {
            return await submarketService.update(input.id, input.data);
        }),

    /**
     * Supprime un sous-marché
     * Endpoint: POST http://localhost:3000/trpc/submarket.delete
     * @input {id: number} - ID du sous-marché à supprimer, validé par submarketIdSchema
     */
    delete: t.procedure
        .input(submarketIdSchema) // Validation de l'ID
        .mutation(async ({ input }) => {
            return await submarketService.delete(input.id);
        }),
});

// Export du type pour utilisation côté frontend (IntelliSense et type-safety)
export type SubmarketRouter = typeof submarketRouter;
