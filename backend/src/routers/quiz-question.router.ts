// src/server/routers/quiz-question.router.ts
import { initTRPC } from "@trpc/server";
import { QuizQuestionService } from "../services/quiz-question.service";
import {
    quizQuestionCreateSchema, 
    quizQuestionUpdateSchema, 
    quizQuestionIdSchema,
    quizQuestionByQuizSchema,
    quizQuestionByQuestionSchema,
    quizQuestionsWithAnswersSchema
} from "../schemas-zod/quiz-question-schema.ts";

// Initialisation de tRPC pour ce router spécifique
const t = initTRPC.create();

// Instance unique du service métier pour ce router
const quizQuestionService = new QuizQuestionService();

export const quizQuestionRouter = t.router({

    /**
     * Récupère toutes les quiz-questions
     * Endpoint: GET http://localhost:3000/trpc/quizQuestion.getAll
     * Pas de paramètre d'entrée requis
     */
    getAll: t.procedure.query(async () => {
        return await quizQuestionService.findAll();
    }),

    /**
     * Récupère une quiz-question par son ID
     * Endpoint: GET http://localhost:3000/trpc/quizQuestion.getById?input={"id":1}
     * @input {id: number} - ID de la quiz-question recherchée, validé par quizQuestionIdSchema
     */
    getById: t.procedure
        .input(quizQuestionIdSchema) // Validation automatique de l'entrée
        .query(async ({ input }) => {
            return await quizQuestionService.findOne(input.id);
        }),

    /**
     * Crée une nouvelle QuizQuestion (liaison entre un quiz et une question)
     * Endpoint: POST http://localhost:3000/trpc/quizQuestion.create
     * @input QuizQuestionCreateSchema - Données de la quiz-question à créer, validées automatiquement
     */
    create: t.procedure
        .input(quizQuestionCreateSchema) // Validation des données avant traitement
        .mutation(async ({ input }) => { // mutation = opération de modification
            return await quizQuestionService.create(input);
        }),

    /**
     * Met à jour une QuizQuestion existante
     * Endpoint: POST http://localhost:3000/trpc/quizQuestion.update
     * @input QuizQuestionUpdateSchema - ID + données à modifier, validées automatiquement
     */
    update: t.procedure
        .input(quizQuestionUpdateSchema) // Validation de l'ID et des données
        .mutation(async ({ input }) => {
            return await quizQuestionService.update(input.id, input.data);
        }),

    /**
     * Supprime une quiz-question
     * Endpoint: POST http://localhost:3000/trpc/quizQuestion.delete
     * @input {id: number} - ID de la quiz-question à supprimer, validé par quizQuestionIdSchema
     */
    delete: t.procedure
        .input(quizQuestionIdSchema) // Validation de l'ID
        .mutation(async ({ input }) => {
            return await quizQuestionService.delete(input.id);
        }),

    /**
     * Récupère toutes les questions d'un quiz spécifique
     * Endpoint: GET http://localhost:3000/trpc/quizQuestion.getByQuiz?input={"quizId":1}
     * @input {quizId: number} - ID du quiz, validé
     */
    getByQuiz: t.procedure
        .input(quizQuestionByQuizSchema)
        .query(async ({ input }) => {
            return await quizQuestionService.findByQuiz(input.quizId);
        }),

    /**
     * Récupère tous les quiz contenant une question spécifique
     * Endpoint: GET http://localhost:3000/trpc/quizQuestion.getByQuestion?input={"questionId":1}
     * @input {questionId: number} - ID de la question, validé
     */
    getByQuestion: t.procedure
        .input(quizQuestionByQuestionSchema)
        .query(async ({ input }) => {
            return await quizQuestionService.findByQuestion(input.questionId);
        }),

    /**
     * Récupère toutes les questions d'un quiz avec leurs réponses
     * Endpoint: GET http://localhost:3000/trpc/quizQuestion.getQuestionsWithAnswers?input={"quizId":1}
     * @input {quizId: number} - ID du quiz, validé
     */
    getQuestionsWithAnswers: t.procedure
        .input(quizQuestionsWithAnswersSchema)
        .query(async ({ input }) => {
            return await quizQuestionService.findQuestionsWithAnswersByQuiz(input.quizId);
        }),
});

// Export du type pour utilisation côté frontend (IntelliSense et type-safety)
export type QuizQuestionRouter = typeof quizQuestionRouter;
