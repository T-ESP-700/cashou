// src/server/routers/level-goal.router.ts
import { initTRPC } from "@trpc/server";
import { LevelGoalService } from "../services/level-goal.service";

import { z } from "zod";
import {levelGoalCreateSchema, levelGoalIdSchema, levelGoalUpdateSchema}
    from "../schemas-zod/level-goal-schema.ts";

// Initialisation de tRPC pour ce router spécifique
const t = initTRPC.create();

// Instance unique du service métier pour ce router
const levelGoalService = new LevelGoalService();

export const levelGoalRouter = t.router({

    /**
     * Récupère toutes les associations niveau-objectif
     * Endpoint: GET http://localhost:3000/trpc/levelGoal.getAll
     * Pas de paramètre d'entrée requis
     */
    getAll: t.procedure.query(async () => {
        return await levelGoalService.findAll();
    }),

    /**
     * Récupère une association par son ID
     * Endpoint: GET http://localhost:3000/trpc/levelGoal.getById?input={"id":1}
     * @input {id: number} - ID de l'association recherchée, validé par levelGoalIdSchema
     */
    getById: t.procedure
        .input(levelGoalIdSchema) // Validation automatique de l'entrée
        .query(async ({ input }) => {
            return await levelGoalService.findOne(input.id);
        }),

    /**
     * Récupère toutes les associations pour un niveau donné
     * Endpoint: GET http://localhost:3000/trpc/levelGoal.getByLevelId?input={"levelId":1}
     * @input {levelId: number} - ID du niveau
     */
    getByLevelId: t.procedure
        .input(z.object({ levelId: z.number().min(1) }))
        .query(async ({ input }) => {
            return await levelGoalService.findByLevelId(input.levelId);
        }),

    /**
     * Récupère toutes les associations pour un objectif donné
     * Endpoint: GET http://localhost:3000/trpc/levelGoal.getByGoalId?input={"goalId":1}
     * @input {goalId: number} - ID de l'objectif
     */
    getByGoalId: t.procedure
        .input(z.object({ goalId: z.number().min(1) }))
        .query(async ({ input }) => {
            return await levelGoalService.findByGoalId(input.goalId);
        }),

    /**
     * Crée une nouvelle association niveau-objectif
     * Endpoint: POST http://localhost:3000/trpc/levelGoal.create
     * @input LevelGoalCreateSchema - Données de l'association à créer, validées automatiquement
     */
    create: t.procedure
        .input(levelGoalCreateSchema) // Validation des données avant traitement
        .mutation(async ({ input }) => { // mutation = opération de modification
            return await levelGoalService.create(input);
        }),

    /**
     * Met à jour une association existante
     * Endpoint: POST http://localhost:3000/trpc/levelGoal.update
     * @input LevelGoalUpdateSchema - ID + données à modifier, validées automatiquement
     */
    update: t.procedure
        .input(levelGoalUpdateSchema) // Validation de l'ID et des données
        .mutation(async ({ input }) => {
            return await levelGoalService.update(input.id, input.data);
        }),

    /**
     * Supprime une association
     * Endpoint: POST http://localhost:3000/trpc/levelGoal.delete
     * @input {id: number} - ID de l'association à supprimer, validé par levelGoalIdSchema
     */
    delete: t.procedure
        .input(levelGoalIdSchema) // Validation de l'ID
        .mutation(async ({ input }) => {
            return await levelGoalService.delete(input.id);
        }),
});

// Export du type pour utilisation côté frontend (IntelliSense et type-safety)
export type LevelGoalRouter = typeof levelGoalRouter;
