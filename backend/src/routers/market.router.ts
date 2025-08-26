// src/server/routers/market.router.ts
import { initTRPC } from "@trpc/server";
import { MarketService } from "../services/market.service";
import {marketCreateSchema, marketUpdateSchema, marketIdSchema} from "../schemas-zod/market-schema.ts";

// Initialisation de tRPC pour ce router spécifique
const t = initTRPC.create();

// Instance unique du service métier pour ce router
const marketService = new MarketService();

export const marketRouter = t.router({

    /**
     * Récupère tous les marchés
     * Endpoint: GET http://localhost:3000/trpc/market.getAll
     * Pas de paramètre d'entrée requis
     */
    getAll: t.procedure.query(async () => {
        return await marketService.findAll();
    }),

    /**
     * Récupère un marché par son ID
     * Endpoint: GET http://localhost:3000/trpc/market.getById?input={"id":1}
     * @input {id: number} - ID du marché recherché, validé par marketIdSchema
     */
    getById: t.procedure
        .input(marketIdSchema) // Validation automatique de l'entrée
        .query(async ({ input }) => {
            return await marketService.findOne(input.id);
        }),

    /**
     * Crée un nouveau marché
     * Endpoint: POST http://localhost:3000/trpc/market.create
     * @input MarketCreateSchema - Données du marché à créer, validées automatiquement
     */
    create: t.procedure
        .input(marketCreateSchema) // Validation des données avant traitement
        .mutation(async ({ input }) => { // mutation = opération de modification
            return await marketService.create(input);
        }),

    /**
     * Met à jour un marché existant
     * Endpoint: POST http://localhost:3000/trpc/market.update
     * @input MarketUpdateSchema - ID + données à modifier, validées automatiquement
     */
    update: t.procedure
        .input(marketUpdateSchema) // Validation de l'ID et des données
        .mutation(async ({ input }) => {
            return await marketService.update(input.id, input.data);
        }),

    /**
     * Supprime un marché
     * Endpoint: POST http://localhost:3000/trpc/market.delete
     * @input {id: number} - ID du marché à supprimer, validé par marketIdSchema
     */
    delete: t.procedure
        .input(marketIdSchema) // Validation de l'ID
        .mutation(async ({ input }) => {
            return await marketService.delete(input.id);
        }),
});

// Export du type pour utilisation côté frontend (IntelliSense et type-safety)
export type MarketRouter = typeof marketRouter;
