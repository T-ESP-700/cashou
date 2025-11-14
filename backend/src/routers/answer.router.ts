// src/server/routers/answer.router.ts
import { initTRPC } from "@trpc/server";
import { AnswerService } from "../services/answer.service";
import {
    answerCreateSchema,
    answerUpdateSchema,
    answerIdSchema,
    answerByQuestionSchema
} from "../schemas-zod/answer-schema.ts";

// Initialisation de tRPC pour ce router spécifique
const t = initTRPC.create();

// Instance unique du service métier pour ce router
const answerService = new AnswerService();

export const answerRouter = t.router({

    /**
     * Récupère toutes les réponses
     * Endpoint: GET http://localhost:3000/trpc/answer.getAll
     * Pas de paramètre d'entrée requis
     */
    getAll: t.procedure.query(async () => {
        return await answerService.findAll();
    }),

    /**
     * Récupère une réponse par son ID
     * Endpoint: GET http://localhost:3000/trpc/answer.getById?input={"id":1}
     * @input {id: number} - ID de la réponse recherchée, validé par answerIdSchema
     */
    getById: t.procedure
        .input(answerIdSchema) // Validation automatique de l'entrée
        .query(async ({ input }) => {
            return await answerService.findOne(input.id);
        }),

    /**
     * Crée une nouvelle Réponse
     * Endpoint: POST http://localhost:3000/trpc/answer.create
     * @input AnswerCreateSchema - Données de la réponse à créer, validées automatiquement
     */
    create: t.procedure
        .input(answerCreateSchema) // Validation des données avant traitement
        .mutation(async ({ input }) => { // mutation = opération de modification
            return await answerService.create(input);
        }),

    /**
     * Met à jour une Réponse existante
     * Endpoint: POST http://localhost:3000/trpc/answer.update
     * @input AnswerUpdateSchema - ID + données à modifier, validées automatiquement
     */
    update: t.procedure
        .input(answerUpdateSchema) // Validation de l'ID et des données
        .mutation(async ({ input }) => {
            return await answerService.update(input.id, input.data);
        }),

    /**
     * Supprime une réponse
     * Endpoint: POST http://localhost:3000/trpc/answer.delete
     * @input {id: number} - ID de la réponse à supprimer, validé par answerIdSchema
     */
    delete: t.procedure
        .input(answerIdSchema) // Validation de l'ID
        .mutation(async ({ input }) => {
            return await answerService.delete(input.id);
        }),

    /**
     * Récupère toutes les réponses d'une question spécifique
     * Endpoint: GET http://localhost:3000/trpc/answer.getByQuestion?input={"questionId":1}
     * @input {questionId: number} - ID de la question, validé
     */
    getByQuestion: t.procedure
        .input(answerByQuestionSchema)
        .query(async ({ input }) => {
            return await answerService.findByQuestion(input.questionId);
        }),
});

// Export du type pour utilisation côté frontend (IntelliSense et type-safety)
export type AnswerRouter = typeof answerRouter;
