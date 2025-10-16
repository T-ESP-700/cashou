// src/server/routers/level.router.ts
import { initTRPC } from "@trpc/server";
import { LevelService } from "../services/level.service";
import { levelCreateSchema, levelUpdateSchema, levelIdSchema, userIdSchema, availabilitySchema, setGoalsSchema, setEventsSchema } from "../schemas-zod/level-schema.ts";

// Initialisation de tRPC pour ce router spécifique
const t = initTRPC.create();

// Instance unique du service métier pour ce router
const levelService = new LevelService();

export const levelRouter = t.router({

    /**
     * Récupère tous les niveaux
     * Endpoint: GET http://localhost:3000/trpc/level.getAll
     * Pas de paramètre d'entrée requis
     */
    getAll: t.procedure.query(async () => {
        return await levelService.findAll();
    }),

    /**
     * Récupère un niveau par son ID
     * Endpoint: GET http://localhost:3000/trpc/level.getById?input={"id":1}
     * @input {id: number} - ID du niveau recherché, validé par levelIdSchema
     */
    getById: t.procedure
        .input(levelIdSchema) // Validation automatique de l'entrée
        .query(async ({ input }) => {
            return await levelService.findOne(input.id);
        }),

    /**
     * Récupère la liste des objectifs (goals) associés à un niveau
     * Endpoint: GET http://localhost:3000/trpc/level.getGoals?input={"levelId":1}
     * @input {levelId: number} - ID du niveau
     */
    getGoals: t.procedure
        .input(levelIdSchema)
        .query(async ({ input }) => {
            return await levelService.findGoals(input.id);
        }),

    /**
     * Récupère la liste des événements associés à un niveau
     * Endpoint: GET http://localhost:3000/trpc/level.getEvents?input={"id":1}
     * @input {id: number} - ID du niveau
     */
    getEvents: t.procedure
        .input(levelIdSchema)
        .query(async ({ input }) => {
            return await levelService.findEvents(input.id);
        }),

    /**
     * Récupère un résumé: niveau + objectifs + événements
     * Endpoint: GET http://localhost:3000/trpc/level.getSummary?input={"id":1}
     * @input {id: number}
     */
    getSummary: t.procedure
        .input(levelIdSchema)
        .query(async ({ input }) => {
            return await levelService.getSummary(input.id);
        }),

    /**
     * Liste des niveaux avec progression utilisateur (étoiles, points, status)
     * Endpoint: GET http://localhost:3000/trpc/level.getUserLevels?input={"userId":1}
     * @input {userId: number}
     */
    getUserLevels: t.procedure
        .input(userIdSchema)
        .query(async ({ input }) => {
            return await levelService.getUserLevels(input.userId);
        }),

    /**
     * Savoir si l’utilisateur peut déverrouiller un niveau
     * Endpoint: GET http://localhost:3000/trpc/level.getAvailability?input={"userId":1,"levelId":2}
     * @input {userId: number, levelId: number}
     */
    getAvailability: t.procedure
        .input(availabilitySchema)
        .query(async ({ input }) => {
            return await levelService.getAvailability(input.userId, input.levelId);
        }),

    /**
     * Associer/remplacer les objectifs d'un niveau
     * Endpoint: POST http://localhost:3000/trpc/level.setGoals
     * @input {levelId: number, goalIds: number[]}
     */
    setGoals: t.procedure
        .input(setGoalsSchema)
        .mutation(async ({ input }) => {
            return await levelService.setGoals(input.levelId, input.goalIds);
        }),

    /**
     * Associer/remplacer les événements d'un niveau
     * Endpoint: POST http://localhost:3000/trpc/level.setEvents
     * @input {levelId: number, eventIds: number[]}
     */
    setEvents: t.procedure
        .input(setEventsSchema)
        .mutation(async ({ input }) => {
            return await levelService.setEvents(input.levelId, input.eventIds);
        }),

    /**
     * Dupliquer un niveau existant
     * Endpoint: POST http://localhost:3000/trpc/level.duplicate
     * @input {id: number}
     */
    duplicate: t.procedure
        .input(levelIdSchema)
        .mutation(async ({ input }) => {
            return await levelService.duplicate(input.id);
        }),

    /**
     * Crée un nouveau Level
     * Endpoint: POST http://localhost:3000/trpc/level.create
     * @input LevelCreateSchema - Données du niveau à créer, validées automatiquement
     */
    create: t.procedure
        .input(levelCreateSchema) // Validation des données avant traitement
        .mutation(async ({ input }) => { // mutation = opération de modification
            return await levelService.create(input);
        }),

    /**
     * Met à jour un Level existant
     * Endpoint: POST http://localhost:3000/trpc/level.update
     * @input LevelUpdateSchema - ID + données à modifier, validées automatiquement
     */
    update: t.procedure
        .input(levelUpdateSchema) // Validation de l'ID et des données
        .mutation(async ({ input }) => {
            return await levelService.update(input.id, input.data);
        }),

    /**
     * Supprime un niveau
     * Endpoint: POST http://localhost:3000/trpc/level.delete
     * @input {id: number} - ID du niveau à supprimer, validé par levelIdSchema
     */
    delete: t.procedure
        .input(levelIdSchema) // Validation de l'ID
        .mutation(async ({ input }) => {
            return await levelService.delete(input.id);
        }),
});

// Export du type pour utilisation côté frontend (IntelliSense et type-safety)
export type LevelRouter = typeof levelRouter;