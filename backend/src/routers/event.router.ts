
// src/server/routers/event.router.ts
import { initTRPC } from "@trpc/server";
import { EventService } from "../services/event.service";
import { eventCreateSchema, eventIdSchema, eventUpdateSchema } from "../schemas-zod/event-schemas.ts";

// Initialisation de tRPC pour ce router spécifique
const t = initTRPC.create();

// Instance unique du service métier pour ce router
const eventService = new EventService();

export const eventRouter = t.router({

    /**
     * Récupère tous les événements
     * Endpoint: GET http://localhost:3000/trpc/event.getAll
     * Pas de paramètre d'entrée requis
     */
    getAll: t.procedure.query(async () => {
        return await eventService.findAll();
    }),

    /**
     * Récupère un événement par son ID
     * Endpoint: GET http://localhost:3000/trpc/event.getById?input={"id":1}
     * @input {id: number} - ID de l'événement recherché, validé par eventIdSchema
     */
    getById: t.procedure
        .input(eventIdSchema) // Validation automatique de l'entrée
        .query(async ({ input }) => {
            return await eventService.findOne(input.id);
        }),

    /**
     * Crée un nouvel Event
     * Endpoint: POST http://localhost:3000/trpc/event.create
     * @input EventCreateSchema - Données de l'événement à créer, validées automatiquement
     */
    create: t.procedure
        .input(eventCreateSchema) // Validation des données avant traitement
        .mutation(async ({ input }) => { // mutation = opération de modification
            return await eventService.create(input);
        }),

    /**
     * Met à jour un Event existant
     * Endpoint: POST http://localhost:3000/trpc/event.update
     * @input EventUpdateSchema - ID + données à modifier, validées automatiquement
     */
    update: t.procedure
        .input(eventUpdateSchema) // Validation de l'ID et des données
        .mutation(async ({ input }) => {
            return await eventService.update(input.id, input.data);
        }),

    /**
     * Supprime un événement
     * Endpoint: POST http://localhost:3000/trpc/event.delete
     * @input {id: number} - ID de l'événement à supprimer, validé par eventIdSchema
     */
    delete: t.procedure
        .input(eventIdSchema) // Validation de l'ID
        .mutation(async ({ input }) => {
            return await eventService.delete(input.id);
        }),
});

// Export du type pour utilisation côté frontend (IntelliSense et type-safety)
export type EventRouter = typeof eventRouter;
