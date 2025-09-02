// src/server/routers/user-quiz.router.ts
import { initTRPC } from "@trpc/server";
import { UserQuizService } from "../services/user-quiz.service";
import {
    userQuizCreateSchema, 
    userQuizUpdateSchema, 
    userQuizIdSchema, 
    userQuizByUserSchema, 
    userQuizByQuizSchema,
    startQuizSchema,
    completeQuizSchema,
    userQuizByResultSchema
} from "../schemas-zod/user-quiz-schema.ts";
import { z } from "zod";

// Initialisation de tRPC pour ce router spécifique
const t = initTRPC.create();

// Instance unique du service métier pour ce router
const userQuizService = new UserQuizService();

export const userQuizRouter = t.router({

    /**
     * Récupère toutes les participations aux quiz
     * Endpoint: GET http://localhost:3000/trpc/userQuiz.getAll
     * Pas de paramètre d'entrée requis
     */
    getAll: t.procedure.query(async () => {
        return await userQuizService.findAll();
    }),

    /**
     * Récupère une participation par son ID
     * Endpoint: GET http://localhost:3000/trpc/userQuiz.getById?input={"id":1}
     * @input {id: number} - ID de la participation recherchée
     */
    getById: t.procedure
        .input(userQuizIdSchema)
        .query(async ({ input }) => {
            return await userQuizService.findOne(input.id);
        }),

    /**
     * Crée une nouvelle participation à un quiz
     * Endpoint: POST http://localhost:3000/trpc/userQuiz.create
     * @input UserQuizCreateSchema - Données de la participation à créer
     */
    create: t.procedure
        .input(userQuizCreateSchema)
        .mutation(async ({ input }) => {
            return await userQuizService.create(input);
        }),

    /**
     * Met à jour une participation existante
     * Endpoint: POST http://localhost:3000/trpc/userQuiz.update
     * @input UserQuizUpdateSchema - ID + données à modifier
     */
    update: t.procedure
        .input(userQuizUpdateSchema)
        .mutation(async ({ input }) => {
            return await userQuizService.update(input.id, input.data);
        }),

    /**
     * Supprime une participation
     * Endpoint: POST http://localhost:3000/trpc/userQuiz.delete
     * @input {id: number} - ID de la participation à supprimer
     */
    delete: t.procedure
        .input(userQuizIdSchema)
        .mutation(async ({ input }) => {
            return await userQuizService.delete(input.id);
        }),

    /**
     * Récupère toutes les participations d'un utilisateur
     * Endpoint: GET http://localhost:3000/trpc/userQuiz.getByUser?input={"userId":1}
     * @input {userId: number} - ID de l'utilisateur
     */
    getByUser: t.procedure
        .input(userQuizByUserSchema)
        .query(async ({ input }) => {
            return await userQuizService.findByUser(input.userId);
        }),

    /**
     * Récupère toutes les participations d'un quiz
     * Endpoint: GET http://localhost:3000/trpc/userQuiz.getByQuiz?input={"quizId":1}
     * @input {quizId: number} - ID du quiz
     */
    getByQuiz: t.procedure
        .input(userQuizByQuizSchema)
        .query(async ({ input }) => {
            return await userQuizService.findByQuiz(input.quizId);
        }),

    /**
     * Récupère les participations par résultat
     * Endpoint: GET http://localhost:3000/trpc/userQuiz.getByResult?input={"isCorrect":true}
     * @input {isCorrect: boolean} - Résultat à filtrer
     */
    getByResult: t.procedure
        .input(userQuizByResultSchema)
        .query(async ({ input }) => {
            return await userQuizService.findByResult(input.isCorrect);
        }),

    /**
     * Démarre un quiz pour un utilisateur
     * Endpoint: POST http://localhost:3000/trpc/userQuiz.startQuiz
     * @input {quizId: number, userId: number} - ID du quiz et de l'utilisateur
     */
    startQuiz: t.procedure
        .input(startQuizSchema)
        .mutation(async ({ input }) => {
            return await userQuizService.startQuiz(input.quizId, input.userId);
        }),

    /**
     * Termine un quiz avec le résultat
     * Endpoint: POST http://localhost:3000/trpc/userQuiz.completeQuiz
     * @input {id: number, isCorrect: boolean} - ID de la participation et résultat
     */
    completeQuiz: t.procedure
        .input(completeQuizSchema)
        .mutation(async ({ input }) => {
            return await userQuizService.completeQuiz(input.id, input.isCorrect);
        }),

    /**
     * Vérifie si un utilisateur a déjà participé à un quiz
     * Endpoint: GET http://localhost:3000/trpc/userQuiz.hasParticipated?input={"quizId":1,"userId":1}
     * @input {quizId: number, userId: number} - ID du quiz et de l'utilisateur
     */
    hasParticipated: t.procedure
        .input(z.object({
            quizId: z.number().min(1, "L'ID du quiz doit être un nombre > 0"),
            userId: z.number().min(1, "L'ID de l'utilisateur doit être un nombre > 0")
        }))
        .query(async ({ input }) => {
            return await userQuizService.hasUserParticipated(input.quizId, input.userId);
        }),

    /**
     * Récupère les statistiques d'un utilisateur
     * Endpoint: GET http://localhost:3000/trpc/userQuiz.getUserStats?input={"userId":1}
     * @input {userId: number} - ID de l'utilisateur
     */
    getUserStats: t.procedure
        .input(userQuizByUserSchema)
        .query(async ({ input }) => {
            return await userQuizService.getUserStats(input.userId);
        }),

    /**
     * Récupère les statistiques d'un quiz
     * Endpoint: GET http://localhost:3000/trpc/userQuiz.getQuizStats?input={"quizId":1}
     * @input {quizId: number} - ID du quiz
     */
    getQuizStats: t.procedure
        .input(userQuizByQuizSchema)
        .query(async ({ input }) => {
            return await userQuizService.getQuizStats(input.quizId);
        }),
});

// Export du type pour utilisation côté frontend (IntelliSense et type-safety)
export type UserQuizRouter = typeof userQuizRouter;
