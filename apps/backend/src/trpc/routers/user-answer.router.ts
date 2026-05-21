// src/server/routers/user-answer.router.ts
import { initTRPC } from "@trpc/server";
import { UserAnswerService } from "../../trpc/services/user-answer.service.ts";
import {
    userAnswerCreateSchema,
    userAnswerUpdateSchema,
    userAnswerIdSchema,
    userAnswerByUserSchema,
    userAnswerByQuestionSchema,
    userAnswerByAnswerSchema,
    submitAnswerSchema,
    userAnswerByAccuracySchema,
    userAnswerByUserAndQuestionSchema
} from "../schemas-zod/user-answer-schema.ts";

// Initialisation de tRPC pour ce router spécifique
const t = initTRPC.create();

// Instance unique du service métier pour ce router
const userAnswerService = new UserAnswerService();

export const userAnswerRouter = t.router({

    /**
     * Récupère toutes les réponses des utilisateurs
     * Endpoint: GET {{base_url}}/trpc/userAnswer.getAll
     * Pas de paramètre d'entrée requis
     */
    getAll: t.procedure.query(async () => {
        return await userAnswerService.findAll();
    }),

    /**
     * Récupère une réponse par son ID
     * Endpoint: GET {{base_url}}/trpc/userAnswer.getById?input={"id":1}
     * @input {id: number} - ID de la réponse recherchée
     */
    getById: t.procedure
        .input(userAnswerIdSchema)
        .query(async ({ input }) => {
            return await userAnswerService.findOne(input.id);
        }),

    /**
     * Crée une nouvelle réponse utilisateur
     * Endpoint: POST {{base_url}}/trpc/userAnswer.create
     * @input UserAnswerCreateSchema - Données de la réponse à créer
     */
    create: t.procedure
        .input(userAnswerCreateSchema)
        .mutation(async ({ input }) => {
            return await userAnswerService.create(input);
        }),

    /**
     * Met à jour une réponse existante
     * Endpoint: POST {{base_url}}/trpc/userAnswer.update
     * @input UserAnswerUpdateSchema - ID + données à modifier
     */
    update: t.procedure
        .input(userAnswerUpdateSchema)
        .mutation(async ({ input }) => {
            return await userAnswerService.update(input.id, input.data);
        }),

    /**
     * Supprime une réponse
     * Endpoint: POST {{base_url}}/trpc/userAnswer.delete
     * @input {id: number} - ID de la réponse à supprimer
     */
    delete: t.procedure
        .input(userAnswerIdSchema)
        .mutation(async ({ input }) => {
            return await userAnswerService.delete(input.id);
        }),

    /**
     * Récupère toutes les réponses d'un utilisateur
     * Endpoint: GET {{base_url}}/trpc/userAnswer.getByUser?input={"userId":1}
     * @input {userId: number} - ID de l'utilisateur
     */
    getByUser: t.procedure
        .input(userAnswerByUserSchema)
        .query(async ({ input }) => {
            return await userAnswerService.findByUser(input.userId);
        }),

    /**
     * Récupère toutes les réponses à une question
     * Endpoint: GET {{base_url}}/trpc/userAnswer.getByQuestion?input={"questionId":1}
     * @input {questionId: number} - ID de la question
     */
    getByQuestion: t.procedure
        .input(userAnswerByQuestionSchema)
        .query(async ({ input }) => {
            return await userAnswerService.findByQuestion(input.questionId);
        }),

    /**
     * Récupère toutes les occurrences d'une réponse spécifique
     * Endpoint: GET {{base_url}}/trpc/userAnswer.getByAnswer?input={"answerId":1}
     * @input {answerId: number} - ID de la réponse
     */
    getByAnswer: t.procedure
        .input(userAnswerByAnswerSchema)
        .query(async ({ input }) => {
            return await userAnswerService.findByAnswer(input.answerId);
        }),

    /**
     * Récupère les réponses par exactitude
     * Endpoint: GET {{base_url}}/trpc/userAnswer.getByAccuracy?input={"accurate":true}
     * @input {accurate: boolean} - Exactitude à filtrer
     */
    getByAccuracy: t.procedure
        .input(userAnswerByAccuracySchema)
        .query(async ({ input }) => {
            return await userAnswerService.findByAccuracy(input.accurate);
        }),

    /**
     * Enregistre la réponse d'un utilisateur (avec validation automatique)
     * Endpoint: POST {{base_url}}/trpc/userAnswer.submitAnswer
     * @input {userId: number, questionId: number, answerId: number} - Données de la réponse
     */
    submitAnswer: t.procedure
        .input(submitAnswerSchema)
        .mutation(async ({ input }) => {
            return await userAnswerService.submitAnswer(input.userId, input.questionId, input.answerId);
        }),

    /**
     * Récupère la réponse d'un utilisateur à une question spécifique
     * Endpoint: GET {{base_url}}/trpc/userAnswer.getByUserAndQuestion?input={"userId":1,"questionId":1}
     * @input {userId: number, questionId: number} - ID de l'utilisateur et de la question
     */
    getByUserAndQuestion: t.procedure
        .input(userAnswerByUserAndQuestionSchema)
        .query(async ({ input }) => {
            return await userAnswerService.findByUserAndQuestion(input.userId, input.questionId);
        }),

    /**
     * Vérifie si un utilisateur a déjà répondu à une question
     * Endpoint: GET {{base_url}}/trpc/userAnswer.hasAnswered?input={"userId":1,"questionId":1}
     * @input {userId: number, questionId: number} - ID de l'utilisateur et de la question
     */
    hasAnswered: t.procedure
        .input(userAnswerByUserAndQuestionSchema)
        .query(async ({ input }) => {
            return await userAnswerService.hasUserAnswered(input.userId, input.questionId);
        }),

    /**
     * Récupère les statistiques de réponses d'un utilisateur
     * Endpoint: GET {{base_url}}/trpc/userAnswer.getUserStats?input={"userId":1}
     * @input {userId: number} - ID de l'utilisateur
     */
    getUserStats: t.procedure
        .input(userAnswerByUserSchema)
        .query(async ({ input }) => {
            return await userAnswerService.getUserStats(input.userId);
        }),

    /**
     * Récupère les statistiques d'une question
     * Endpoint: GET {{base_url}}/trpc/userAnswer.getQuestionStats?input={"questionId":1}
     * @input {questionId: number} - ID de la question
     */
    getQuestionStats: t.procedure
        .input(userAnswerByQuestionSchema)
        .query(async ({ input }) => {
            return await userAnswerService.getQuestionStats(input.questionId);
        }),

    /**
     * Récupère les statistiques d'une réponse spécifique
     * Endpoint: GET {{base_url}}/trpc/userAnswer.getAnswerStats?input={"answerId":1}
     * @input {answerId: number} - ID de la réponse
     */
    getAnswerStats: t.procedure
        .input(userAnswerByAnswerSchema)
        .query(async ({ input }) => {
            return await userAnswerService.getAnswerStats(input.answerId);
        }),
});

// Export du type pour utilisation côté frontend (IntelliSense et type-safety)
export type UserAnswerRouter = typeof userAnswerRouter;
