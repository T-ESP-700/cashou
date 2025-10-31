
// src/server/routers/goal.router.ts
import { initTRPC } from "@trpc/server";
import { GoalService } from "../../trpc/services/goal.service.ts";
import { goalCreateSchema, goalIdSchema, goalUpdateSchema } from "../schemas-zod/goal-schema.ts";

// Initialisation de tRPC pour ce router spécifique
const t = initTRPC.create();

// Instance unique du service métier pour ce router
const goalService = new GoalService();

export const goalRouter = t.router({

    /**
     * Récupère tous les objectifs
     * Endpoint: GET http://localhost:3000/trpc/goal.getAll
     * Pas de paramètre d'entrée requis
     */
    getAll: t.procedure.query(async () => {
        return await goalService.findAll();
    }),

    /**
     * Récupère un objectif par son ID
     * Endpoint: GET http://localhost:3000/trpc/goal.getById?input={"id":1}
     * @input {id: number} - ID de l'objectif recherché, validé par goalIdSchema
     */
    getById: t.procedure
        .input(goalIdSchema) // Validation automatique de l'entrée
        .query(async ({ input }) => {
            return await goalService.findOne(input.id);
        }),

    /**
     * Crée un nouvel Goal
     * Endpoint: POST http://localhost:3000/trpc/goal.create
     * @input GoalCreateSchema - Données de l'objectif à créer, validées automatiquement
     */
    create: t.procedure
        .input(goalCreateSchema) // Validation des données avant traitement
        .mutation(async ({ input }) => { // mutation = opération de modification
            return await goalService.create(input);
        }),

    /**
     * Met à jour un Goal existant
     * Endpoint: POST http://localhost:3000/trpc/goal.update
     * @input GoalUpdateSchema - ID + données à modifier, validées automatiquement
     */
    update: t.procedure
        .input(goalUpdateSchema) // Validation de l'ID et des données
        .mutation(async ({ input }) => {
            return await goalService.update(input.id, input.data);
        }),

    /**
     * Supprime un objectif
     * Endpoint: POST http://localhost:3000/trpc/goal.delete
     * @input {id: number} - ID de l'objectif à supprimer, validé par goalIdSchema
     */
    delete: t.procedure
        .input(goalIdSchema) // Validation de l'ID
        .mutation(async ({ input }) => {
            return await goalService.delete(input.id);
        }),
});

// Export du type pour utilisation côté frontend (IntelliSense et type-safety)
export type GoalRouter = typeof goalRouter;
