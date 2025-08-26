// src/server/routers/event-asset.router.ts
import { initTRPC } from "@trpc/server";
import { EventAssetService } from "../services/event-asset.service";
import {eventAssetCreateSchema, eventAssetUpdateSchema, eventAssetIdSchema} from "../schemas-zod/event-asset-schema.ts";
import { z } from "zod";

// Initialisation de tRPC pour ce router spécifique
const t = initTRPC.create();

// Instance unique du service métier pour ce router
const eventAssetService = new EventAssetService();

export const eventAssetRouter = t.router({

    /**
     * Récupère tous les événements d'actifs
     * Endpoint: GET http://localhost:3000/trpc/eventAsset.getAll
     * Pas de paramètre d'entrée requis
     */
    getAll: t.procedure.query(async () => {
        return await eventAssetService.findAll();
    }),

    /**
     * Récupère un événement d'actif par son ID
     * Endpoint: GET http://localhost:3000/trpc/eventAsset.getById?input={"id":1}
     * @input {id: number} - ID de l'événement d'actif recherché, validé par eventAssetIdSchema
     */
    getById: t.procedure
        .input(eventAssetIdSchema) // Validation automatique de l'entrée
        .query(async ({ input }) => {
            return await eventAssetService.findOne(input.id);
        }),

    /**
     * Récupère tous les événements d'actifs d'un actif spécifique
     * Endpoint: GET http://localhost:3000/trpc/eventAsset.getByAssetId?input={"assetId":1}
     * @input {assetId: number} - ID de l'actif parent
     */
    getByAssetId: t.procedure
        .input(z.object({
            assetId: z.number().min(1, "L'ID de l'actif doit être un nombre > 0")
        }))
        .query(async ({ input }) => {
            return await eventAssetService.findByAssetId(input.assetId);
        }),

    /**
     * Récupère tous les événements d'actifs d'un événement spécifique
     * Endpoint: GET http://localhost:3000/trpc/eventAsset.getByEventId?input={"eventId":1}
     * @input {eventId: number} - ID de l'événement parent
     */
    getByEventId: t.procedure
        .input(z.object({
            eventId: z.number().min(1, "L'ID de l'événement doit être un nombre > 0")
        }))
        .query(async ({ input }) => {
            return await eventAssetService.findByEventId(input.eventId);
        }),

    /**
     * Récupère les événements d'actifs dans une période donnée
     * Endpoint: GET http://localhost:3000/trpc/eventAsset.getByPeriod?input={"startDate":"2024-01-01","endDate":"2024-12-31"}
     * @input {startDate: string, endDate: string} - Période de recherche
     */
    getByPeriod: t.procedure
        .input(z.object({
            startDate: z.string(),
            endDate: z.string()
        }))
        .query(async ({ input }) => {
            const startDate = new Date(input.startDate);
            const endDate = new Date(input.endDate);
            return await eventAssetService.findByPeriod(startDate, endDate);
        }),

    /**
     * Crée un nouvel événement d'actif
     * Endpoint: POST http://localhost:3000/trpc/eventAsset.create
     * @input EventAssetCreateSchema - Données de l'événement d'actif à créer, validées automatiquement
     */
    create: t.procedure
        .input(eventAssetCreateSchema) // Validation des données avant traitement
        .mutation(async ({ input }) => { // mutation = opération de modification
            return await eventAssetService.create(input);
        }),

    /**
     * Met à jour un événement d'actif existant
     * Endpoint: POST http://localhost:3000/trpc/eventAsset.update
     * @input EventAssetUpdateSchema - ID + données à modifier, validées automatiquement
     */
    update: t.procedure
        .input(eventAssetUpdateSchema) // Validation de l'ID et des données
        .mutation(async ({ input }) => {
            return await eventAssetService.update(input.id, input.data);
        }),

    /**
     * Supprime un événement d'actif
     * Endpoint: POST http://localhost:3000/trpc/eventAsset.delete
     * @input {id: number} - ID de l'événement d'actif à supprimer, validé par eventAssetIdSchema
     */
    delete: t.procedure
        .input(eventAssetIdSchema) // Validation de l'ID
        .mutation(async ({ input }) => {
            return await eventAssetService.delete(input.id);
        }),
});

// Export du type pour utilisation côté frontend (IntelliSense et type-safety)
export type EventAssetRouter = typeof eventAssetRouter;
