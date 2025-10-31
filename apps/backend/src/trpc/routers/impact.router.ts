// src/server/routers/impact.router.ts
import { initTRPC } from "@trpc/server";
import { ImpactService } from "../../trpc/services/impact.service.ts";
import {impactCreateSchema, impactUpdateSchema, impactIdSchema} from "../schemas-zod/impact-schema.ts";
import { z } from "zod";

// Initialisation de tRPC pour ce router spécifique
const t = initTRPC.create();

// Instance unique du service métier pour ce router
const impactService = new ImpactService();

export const impactRouter = t.router({

    /**
     * Récupère tous les impacts
     * Endpoint: GET http://localhost:3000/trpc/impact.getAll
     * Pas de paramètre d'entrée requis
     */
    getAll: t.procedure.query(async () => {
        return await impactService.findAll();
    }),

    /**
     * Récupère un impact par son ID
     * Endpoint: GET http://localhost:3000/trpc/impact.getById?input={"id":1}
     * @input {id: number} - ID de l'impact recherché, validé par impactIdSchema
     */
    getById: t.procedure
        .input(impactIdSchema) // Validation automatique de l'entrée
        .query(async ({ input }) => {
            return await impactService.findOne(input.id);
        }),

    /**
     * Récupère tous les impacts d'un événement spécifique
     * Endpoint: GET http://localhost:3000/trpc/impact.getByEventId?input={"eventId":1}
     * @input {eventId: number} - ID de l'événement parent
     */
    getByEventId: t.procedure
        .input(z.object({
            eventId: z.number().min(1, "L'ID de l'événement doit être un nombre > 0")
        }))
        .query(async ({ input }) => {
            return await impactService.findByEventId(input.eventId);
        }),

    /**
     * Récupère tous les impacts d'un champ spécifique
     * Endpoint: GET http://localhost:3000/trpc/impact.getByFieldId?input={"fieldId":1}
     * @input {fieldId: number} - ID du champ parent
     */
    getByFieldId: t.procedure
        .input(z.object({
            fieldId: z.number().min(1, "L'ID du champ doit être un nombre > 0")
        }))
        .query(async ({ input }) => {
            return await impactService.findByFieldId(input.fieldId);
        }),

    /**
     * Récupère tous les impacts d'un sous-marché spécifique
     * Endpoint: GET http://localhost:3000/trpc/impact.getBySubmarketId?input={"submarketId":1}
     * @input {submarketId: number} - ID du sous-marché parent
     */
    getBySubmarketId: t.procedure
        .input(z.object({
            submarketId: z.number().min(1, "L'ID du sous-marché doit être un nombre > 0")
        }))
        .query(async ({ input }) => {
            return await impactService.findBySubmarketId(input.submarketId);
        }),

    /**
     * Récupère les impacts avec un coefficient supérieur à une valeur donnée
     * Endpoint: GET http://localhost:3000/trpc/impact.getByMinCoefficient?input={"minCoef":5}
     * @input {minCoef: number} - Coefficient minimum
     */
    getByMinCoefficient: t.procedure
        .input(z.object({
            minCoef: z.number().min(0, "Le coefficient minimum doit être >= 0")
        }))
        .query(async ({ input }) => {
            return await impactService.findByMinCoefficient(input.minCoef);
        }),

    /**
     * Crée un nouvel impact
     * Endpoint: POST http://localhost:3000/trpc/impact.create
     * @input ImpactCreateSchema - Données de l'impact à créer, validées automatiquement
     */
    create: t.procedure
        .input(impactCreateSchema) // Validation des données avant traitement
        .mutation(async ({ input }) => { // mutation = opération de modification
            return await impactService.create(input);
        }),

    /**
     * Met à jour un impact existant
     * Endpoint: POST http://localhost:3000/trpc/impact.update
     * @input ImpactUpdateSchema - ID + données à modifier, validées automatiquement
     */
    update: t.procedure
        .input(impactUpdateSchema) // Validation de l'ID et des données
        .mutation(async ({ input }) => {
            return await impactService.update(input.id, input.data);
        }),

    /**
     * Supprime un impact
     * Endpoint: POST http://localhost:3000/trpc/impact.delete
     * @input {id: number} - ID de l'impact à supprimer, validé par impactIdSchema
     */
    delete: t.procedure
        .input(impactIdSchema) // Validation de l'ID
        .mutation(async ({ input }) => {
            return await impactService.delete(input.id);
        }),
});

// Export du type pour utilisation côté frontend (IntelliSense et type-safety)
export type ImpactRouter = typeof impactRouter;
