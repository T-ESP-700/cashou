// src/server/routers/asset.router.ts
import { initTRPC } from "@trpc/server";
import { AssetService } from "../../trpc/services/asset.service.ts";
import {assetCreateSchema, assetUpdateSchema, assetIdSchema} from "../schemas-zod/asset-schema.ts";
import { z } from "zod";

// Initialisation de tRPC pour ce router spécifique
const t = initTRPC.create();

// Instance unique du service métier pour ce router
const assetService = new AssetService();

export const assetRouter = t.router({

    /**
     * Récupère tous les actifs
     * Endpoint: GET http://localhost:3000/trpc/asset.getAll
     * Pas de paramètre d'entrée requis
     */
    getAll: t.procedure.query(async () => {
        return await assetService.findAll();
    }),

    /**
     * Récupère les actifs annotés de leur disponibilité dans une partie donnée.
     * Chaque actif porte `available` (false si encore verrouillé) et `unlock`
     * (jour de déblocage + event qui le débloque), pour l'affichage grisé côté front.
     * Endpoint: GET /trpc/asset.getForGame?input={"gameInstanceId":1}
     */
    getForGame: t.procedure
        .input(z.object({
            gameInstanceId: z.number().min(1, "L'ID de la partie doit être un nombre > 0")
        }))
        .query(async ({ input }) => {
            return await assetService.findForGame(input.gameInstanceId);
        }),

    /**
     * Récupère un actif par son ID
     * Endpoint: GET http://localhost:3000/trpc/asset.getById?input={"id":1}
     * @input {id: number} - ID de l'actif recherché, validé par assetIdSchema
     */
    getById: t.procedure
        .input(assetIdSchema) // Validation automatique de l'entrée
        .query(async ({ input }) => {
            return await assetService.findOne(input.id);
        }),

    /**
     * Récupère tous les actifs d'un marché spécifique
     * Endpoint: GET http://localhost:3000/trpc/asset.getByMarketId?input={"marketId":1}
     * @input {marketId: number} - ID du marché parent
     */
    getByMarketId: t.procedure
        .input(z.object({
            marketId: z.number().min(1, "L'ID du marché doit être un nombre > 0")
        }))
        .query(async ({ input }) => {
            return await assetService.findByMarketId(input.marketId);
        }),

    /**
     * Récupère tous les actifs d'un sous-marché spécifique
     * Endpoint: GET http://localhost:3000/trpc/asset.getBySubmarketId?input={"submarketId":1}
     * @input {submarketId: number} - ID du sous-marché parent
     */
    getBySubmarketId: t.procedure
        .input(z.object({
            submarketId: z.number().min(1, "L'ID du sous-marché doit être un nombre > 0")
        }))
        .query(async ({ input }) => {
            return await assetService.findBySubmarketId(input.submarketId);
        }),

    /**
     * Récupère uniquement les actifs actuellement DÉBLOQUÉS pour une partie.
     * Contrairement à getForGame (qui renvoie tous les actifs annotés de leur
     * disponibilité), cet endpoint filtre les actifs encore verrouillés : il sert
     * aux écrans qui ne doivent proposer que des actifs achetables.
     * Endpoint: GET http://localhost:3000/trpc/asset.getAvailableForGame?input={"gameInstanceId":1}
     * @input {gameInstanceId: number} - ID de la partie
     */
    getAvailableForGame: t.procedure
        .input(z.object({
            gameInstanceId: z.number().min(1, "L'ID de la partie doit être un nombre > 0")
        }))
        .query(async ({ input }) => {
            const assets = await assetService.findForGame(input.gameInstanceId);
            return assets.filter((asset) => asset.available);
        }),

    /**
     * Crée un nouvel actif
     * Endpoint: POST http://localhost:3000/trpc/asset.create
     * @input AssetCreateSchema - Données de l'actif à créer, validées automatiquement
     */
    create: t.procedure
        .input(assetCreateSchema) // Validation des données avant traitement
        .mutation(async ({ input }) => { // mutation = opération de modification
            return await assetService.create(input);
        }),

    /**
     * Met à jour un actif existant
     * Endpoint: POST http://localhost:3000/trpc/asset.update
     * @input AssetUpdateSchema - ID + données à modifier, validées automatiquement
     */
    update: t.procedure
        .input(assetUpdateSchema) // Validation de l'ID et des données
        .mutation(async ({ input }) => {
            return await assetService.update(input.id, input.data);
        }),

    /**
     * Supprime un actif
     * Endpoint: POST http://localhost:3000/trpc/asset.delete
     * @input {id: number} - ID de l'actif à supprimer, validé par assetIdSchema
     */
    delete: t.procedure
        .input(assetIdSchema) // Validation de l'ID
        .mutation(async ({ input }) => {
            return await assetService.delete(input.id);
        }),
});

// Export du type pour utilisation côté frontend (IntelliSense et type-safety)
export type AssetRouter = typeof assetRouter;
