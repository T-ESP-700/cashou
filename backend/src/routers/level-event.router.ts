// src/server/routers/level-event.router.ts
import { initTRPC } from "@trpc/server";
import { LevelEventService } from "../services/level-event.service";
import { 
    levelEventCreateSchema, 
    levelEventIdSchema, 
    levelEventUpdateSchema 
} from "../schemas-zod/level-event-schema.ts";
import { z } from "zod";

// Initialisation de tRPC pour ce router spécifique
const t = initTRPC.create();

// Instance unique du service métier pour ce router
const levelEventService = new LevelEventService();

export const levelEventRouter = t.router({

    /**
     * Récupère toutes les associations niveau-événement
     * Endpoint: GET http://localhost:3000/trpc/levelEvent.getAll
     * Pas de paramètre d'entrée requis
     */
    getAll: t.procedure.query(async () => {
        return await levelEventService.findAll();
    }),

    /**
     * Récupère une association par son ID
     * Endpoint: GET http://localhost:3000/trpc/levelEvent.getById?input={"id":1}
     * @input {id: number} - ID de l'association recherchée, validé par levelEventIdSchema
     */
    getById: t.procedure
        .input(levelEventIdSchema) // Validation automatique de l'entrée
        .query(async ({ input }) => {
            return await levelEventService.findOne(input.id);
        }),

    /**
     * Récupère toutes les associations pour un niveau donné
     * Endpoint: GET http://localhost:3000/trpc/levelEvent.getByLevelId?input={"levelId":1}
     * @input {levelId: number} - ID du niveau
     */
    getByLevelId: t.procedure
        .input(z.object({ levelId: z.number().min(1) }))
        .query(async ({ input }) => {
            return await levelEventService.findByLevelId(input.levelId);
        }),

    /**
     * Récupère toutes les associations pour un événement donné
     * Endpoint: GET http://localhost:3000/trpc/levelEvent.getByEventId?input={"eventId":1}
     * @input {eventId: number} - ID de l'événement
     */
    getByEventId: t.procedure
        .input(z.object({ eventId: z.number().min(1) }))
        .query(async ({ input }) => {
            return await levelEventService.findByEventId(input.eventId);
        }),

    /**
     * Crée une nouvelle association niveau-événement
     * Endpoint: POST http://localhost:3000/trpc/levelEvent.create
     * @input LevelEventCreateSchema - Données de l'association à créer, validées automatiquement
     */
    create: t.procedure
        .input(levelEventCreateSchema) // Validation des données avant traitement
        .mutation(async ({ input }) => { // mutation = opération de modification
            return await levelEventService.create(input);
        }),

    /**
     * Met à jour une association existante
     * Endpoint: POST http://localhost:3000/trpc/levelEvent.update
     * @input LevelEventUpdateSchema - ID + données à modifier, validées automatiquement
     */
    update: t.procedure
        .input(levelEventUpdateSchema) // Validation de l'ID et des données
        .mutation(async ({ input }) => {
            return await levelEventService.update(input.id, input.data);
        }),

    /**
     * Supprime une association
     * Endpoint: POST http://localhost:3000/trpc/levelEvent.delete
     * @input {id: number} - ID de l'association à supprimer, validé par levelEventIdSchema
     */
    delete: t.procedure
        .input(levelEventIdSchema) // Validation de l'ID
        .mutation(async ({ input }) => {
            return await levelEventService.delete(input.id);
        }),
});

// Export du type pour utilisation côté frontend (IntelliSense et type-safety)
export type LevelEventRouter = typeof levelEventRouter;
