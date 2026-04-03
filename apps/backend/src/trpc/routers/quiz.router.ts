// src/server/routers/quiz.router.ts
import { initTRPC } from "@trpc/server";
import { QuizService } from "../../trpc/services/quiz.service.ts";
import {quizCreateSchema, quizUpdateSchema, quizIdSchema, QuizTypeEnum, quizDateCheckSchema, quizHistorySchema} from "../schemas-zod/quiz-schema.ts";
import { z } from "zod";
import { staticCache, cached, invalidateByPrefix } from "../../lib/cache.ts";

// Initialisation de tRPC pour ce router spécifique
const t = initTRPC.create();

// Instance unique du service métier pour ce router
const quizService = new QuizService();

export const quizRouter = t.router({

    /**
     * Récupère tous les quiz
     * Endpoint: GET http://localhost:3000/trpc/quiz.getAll
     * Pas de paramètre d'entrée requis
     */
    getAll: t.procedure.query(async () => {
        return cached(staticCache, "quiz:all", () => quizService.findAll());
    }),

    /**
     * Récupère un quiz par son ID
     * Endpoint: GET http://localhost:3000/trpc/quiz.getById?input={"id":1}
     * @input {id: number} - ID du quiz recherché, validé par quizIdSchema
     */
    getById: t.procedure
        .input(quizIdSchema) // Validation automatique de l'entrée
        .query(async ({ input }) => {
            return cached(staticCache, `quiz:${input.id}`, () => quizService.findOne(input.id));
        }),

    /**
     * Crée un nouveau Quiz
     * Endpoint: POST http://localhost:3000/trpc/quiz.create
     * @input QuizCreateSchema - Données du quiz à créer, validées automatiquement
     */
    create: t.procedure
        .input(quizCreateSchema) // Validation des données avant traitement
        .mutation(async ({ input }) => { // mutation = opération de modification
            const result = await quizService.create(input);
            invalidateByPrefix(staticCache, "quiz:");
            return result;
        }),

    /**
     * Met à jour un Quiz existant
     * Endpoint: POST http://localhost:3000/trpc/quiz.update
     * @input QuizUpdateSchema - ID + données à modifier, validées automatiquement
     */
    update: t.procedure
        .input(quizUpdateSchema) // Validation de l'ID et des données
        .mutation(async ({ input }) => {
            const result = await quizService.update(input.id, input.data);
            invalidateByPrefix(staticCache, "quiz:");
            return result;
        }),

    /**
     * Supprime un quiz
     * Endpoint: POST http://localhost:3000/trpc/quiz.delete
     * @input {id: number} - ID du quiz à supprimer, validé par quizIdSchema
     */
    delete: t.procedure
        .input(quizIdSchema) // Validation de l'ID
        .mutation(async ({ input }) => {
            const result = await quizService.delete(input.id);
            invalidateByPrefix(staticCache, "quiz:");
            return result;
        }),

    /**
     * Récupère tous les quiz d'un niveau spécifique
     * Endpoint: GET http://localhost:3000/trpc/quiz.getByLevel?input={"levelId":1}
     * @input {levelId: number} - ID du niveau, validé
     */
    getByLevel: t.procedure
        .input(z.object({ levelId: z.number().min(1, "L'ID du niveau doit être un nombre > 0") }))
        .query(async ({ input }) => {
            return await quizService.findByLevel(input.levelId);
        }),

    /**
     * Récupère tous les quiz d'un type spécifique
     * Endpoint: GET http://localhost:3000/trpc/quiz.getByType?input={"type":"DAILY"}
     * @input {type: QuizType} - Type de quiz (DAILY ou MCQ)
     */
    getByType: t.procedure
        .input(z.object({ type: QuizTypeEnum }))
        .query(async ({ input }) => {
            return await quizService.findByType(input.type);
        }),

    /**
     * Récupère le Daily Quiz d'aujourd'hui
     * Endpoint: GET {{base_url}}/trpc/quiz.getTodaysDailyQuiz
     * Pas de paramètre d'entrée requis
     */
    getTodaysDailyQuiz: t.procedure.query(async () => {
        return await quizService.getTodaysDailyQuiz();
    }),

    /**
     * Vérifie si un Daily Quiz existe pour une date donnée
     * Endpoint: GET {{base_url}}/trpc/quiz.dailyQuizExists?input={"date":"2024-01-15"}
     * @input {date: string} - Date à vérifier (format ISO ou YYYY-MM-DD)
     */
    dailyQuizExists: t.procedure
        .input(quizDateCheckSchema)
        .query(async ({ input }) => {
            return await quizService.dailyQuizExists(input.date);
        }),

    /**
     * Récupère l'historique des Daily Quiz
     * Endpoint: GET {{base_url}}/trpc/quiz.getDailyHistory?input={"limit":30}
     * @input {limit?: number} - Nombre maximum de quiz à retourner (défaut: 30, max: 100)
     */
    getDailyHistory: t.procedure
        .input(quizHistorySchema)
        .query(async ({ input }) => {
            return await quizService.getDailyHistory(input.limit);
        }),
});

// Export du type pour utilisation côté frontend (IntelliSense et type-safety)
export type QuizRouter = typeof quizRouter;
