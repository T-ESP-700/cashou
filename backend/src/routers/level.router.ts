// src/server/routers/level.router.ts
import { initTRPC } from "@trpc/server";
import { LevelService } from "../services/level.service";
import {levelCreateSchema, levelUpdateSchema, levelIdSchema} from "../schemas-zod/level-schema.ts";

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