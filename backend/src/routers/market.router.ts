// src/server/routers/market.router.ts
import { initTRPC } from "@trpc/server";
import { MarketService } from "../services/market.service";
import {marketCreateSchema, marketUpdateSchema, marketIdSchema} from "../schemas-zod/market-schema.ts";
import {paginationSchema, marketSearchSchema, marketIdSchema as marketBusinessIdSchema} from "../schemas-zod/market-business-schema.ts";

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

    // ===== ROUTES MÉTIERS =====

    /**
     * Liste paginée des marchés avec compteurs
     * Endpoint: GET http://localhost:3000/trpc/market.list?input={"limit":20,"offset":0}
     * @input PaginationSchema - Paramètres de pagination
     * @returns Liste paginée des marchés avec compteurs d'actifs et sous-marchés
     */
    list: t.procedure
        .input(paginationSchema)
        .query(async ({ input }) => {
            return await marketService.list(input.limit, input.offset);
        }),

    /**
     * Recherche de marchés par mots-clés et tendances
     * Endpoint: GET http://localhost:3000/trpc/market.search?input={"query":"tech","tag":"innovation","trend":"hausse"}
     * @input MarketSearchSchema - Critères de recherche
     * @returns Liste des marchés correspondants avec score de pertinence
     */
    search: t.procedure
        .input(marketSearchSchema)
        .query(async ({ input }) => {
            return await marketService.search(input.query, input.tag, input.trend);
        }),

    /**
     * Arbre complet d'un marché (marché + sous-marchés + compteurs d'actifs)
     * Endpoint: GET http://localhost:3000/trpc/market.getTree?input={"marketId":1}
     * @input MarketIdSchema - ID du marché
     * @returns Arbre hiérarchique du marché avec compteurs
     */
    getTree: t.procedure
        .input(marketBusinessIdSchema)
        .query(async ({ input }) => {
            return await marketService.getTree(input.marketId);
        }),

    /**
     * Vue d'ensemble complète d'un marché
     * Endpoint: GET http://localhost:3000/trpc/market.getOverview?input={"marketId":1}
     * @input MarketIdSchema - ID du marché
     * @returns Vue d'ensemble avec KPIs, top actifs et sous-marchés
     */
    getOverview: t.procedure
        .input(marketBusinessIdSchema)
        .query(async ({ input }) => {
            return await marketService.getOverview(input.marketId);
        }),
});

// Export du type pour utilisation côté frontend (IntelliSense et type-safety)
export type MarketRouter = typeof marketRouter;
