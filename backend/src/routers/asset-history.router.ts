// src/server/routers/asset-history.router.ts
import { initTRPC } from "@trpc/server";
import { AssetHistoryService } from "../services/asset-history.service";
import {assetHistoryCreateSchema, assetHistoryUpdateSchema, assetHistoryIdSchema} from "../schemas-zod/asset-history-schema.ts";
import { z } from "zod";

// Initialisation de tRPC pour ce router spécifique
const t = initTRPC.create();

// Instance unique du service métier pour ce router
const assetHistoryService = new AssetHistoryService();

export const assetHistoryRouter = t.router({

    /**
     * Récupère tout l'historique des actifs
     * Endpoint: GET http://localhost:3000/trpc/assetHistory.getAll
     * Pas de paramètre d'entrée requis
     */
    getAll: t.procedure.query(async () => {
        return await assetHistoryService.findAll();
    }),

    /**
     * Récupère un historique d'actif par son ID
     * Endpoint: GET http://localhost:3000/trpc/assetHistory.getById?input={"id":1}
     * @input {id: number} - ID de l'historique recherché, validé par assetHistoryIdSchema
     */
    getById: t.procedure
        .input(assetHistoryIdSchema) // Validation automatique de l'entrée
        .query(async ({ input }) => {
            return await assetHistoryService.findOne(input.id);
        }),

    /**
     * Récupère tout l'historique d'un actif spécifique
     * Endpoint: GET http://localhost:3000/trpc/assetHistory.getByAssetId?input={"assetId":1}
     * @input {assetId: number} - ID de l'actif parent
     */
    getByAssetId: t.procedure
        .input(z.object({
            assetId: z.number().min(1, "L'ID de l'actif doit être un nombre > 0")
        }))
        .query(async ({ input }) => {
            return await assetHistoryService.findByAssetId(input.assetId);
        }),

    /**
     * Récupère l'historique d'un actif dans une période donnée
     * Endpoint: GET http://localhost:3000/trpc/assetHistory.getByAssetIdAndPeriod?input={"assetId":1,"startDate":"2024-01-01","endDate":"2024-12-31"}
     * @input {assetId: number, startDate: string, endDate: string} - ID de l'actif et période
     */
    getByAssetIdAndPeriod: t.procedure
        .input(z.object({
            assetId: z.number().min(1, "L'ID de l'actif doit être un nombre > 0"),
            startDate: z.string(),
            endDate: z.string()
        }))
        .query(async ({ input }) => {
            const startDate = new Date(input.startDate);
            const endDate = new Date(input.endDate);
            return await assetHistoryService.findByAssetIdAndPeriod(input.assetId, startDate, endDate);
        }),

    /**
     * Récupère la valeur la plus récente d'un actif
     * Endpoint: GET http://localhost:3000/trpc/assetHistory.getLatestByAssetId?input={"assetId":1}
     * @input {assetId: number} - ID de l'actif
     */
    getLatestByAssetId: t.procedure
        .input(z.object({
            assetId: z.number().min(1, "L'ID de l'actif doit être un nombre > 0")
        }))
        .query(async ({ input }) => {
            return await assetHistoryService.findLatestByAssetId(input.assetId);
        }),

    /**
     * Crée un nouvel historique d'actif
     * Endpoint: POST http://localhost:3000/trpc/assetHistory.create
     * @input AssetHistoryCreateSchema - Données de l'historique à créer, validées automatiquement
     */
    create: t.procedure
        .input(assetHistoryCreateSchema) // Validation des données avant traitement
        .mutation(async ({ input }) => { // mutation = opération de modification
            return await assetHistoryService.create(input);
        }),

    /**
     * Met à jour un historique d'actif existant
     * Endpoint: POST http://localhost:3000/trpc/assetHistory.update
     * @input AssetHistoryUpdateSchema - ID + données à modifier, validées automatiquement
     */
    update: t.procedure
        .input(assetHistoryUpdateSchema) // Validation de l'ID et des données
        .mutation(async ({ input }) => {
            return await assetHistoryService.update(input.id, input.data);
        }),

    /**
     * Supprime un historique d'actif
     * Endpoint: POST http://localhost:3000/trpc/assetHistory.delete
     * @input {id: number} - ID de l'historique à supprimer, validé par assetHistoryIdSchema
     */
    delete: t.procedure
        .input(assetHistoryIdSchema) // Validation de l'ID
        .mutation(async ({ input }) => {
            return await assetHistoryService.delete(input.id);
        }),
});

// Export du type pour utilisation côté frontend (IntelliSense et type-safety)
export type AssetHistoryRouter = typeof assetHistoryRouter;
