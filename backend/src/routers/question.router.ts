// src/server/routers/question.router.ts
import { initTRPC } from "@trpc/server";
import { QuestionService } from "../services/question.service";
import {questionCreateSchema, questionUpdateSchema, questionIdSchema, questionSearchSchema} from "../schemas-zod/question-schema.ts";

// Initialisation de tRPC pour ce router spécifique
const t = initTRPC.create();

// Instance unique du service métier pour ce router
const questionService = new QuestionService();

export const questionRouter = t.router({

    /**
     * Récupère toutes les questions
     * Endpoint: GET http://localhost:3000/trpc/question.getAll
     * Pas de paramètre d'entrée requis
     */
    getAll: t.procedure.query(async () => {
        return await questionService.findAll();
    }),

    /**
     * Récupère une question par son ID
     * Endpoint: GET http://localhost:3000/trpc/question.getById?input={"id":1}
     * @input {id: number} - ID de la question recherchée, validé par questionIdSchema
     */
    getById: t.procedure
        .input(questionIdSchema) // Validation automatique de l'entrée
        .query(async ({ input }) => {
            return await questionService.findOne(input.id);
        }),

    /**
     * Crée une nouvelle Question
     * Endpoint: POST http://localhost:3000/trpc/question.create
     * @input QuestionCreateSchema - Données de la question à créer, validées automatiquement
     */
    create: t.procedure
        .input(questionCreateSchema) // Validation des données avant traitement
        .mutation(async ({ input }) => { // mutation = opération de modification
            return await questionService.create(input);
        }),

    /**
     * Met à jour une Question existante
     * Endpoint: POST http://localhost:3000/trpc/question.update
     * @input QuestionUpdateSchema - ID + données à modifier, validées automatiquement
     */
    update: t.procedure
        .input(questionUpdateSchema) // Validation de l'ID et des données
        .mutation(async ({ input }) => {
            return await questionService.update(input.id, input.data);
        }),

    /**
     * Supprime une question
     * Endpoint: POST http://localhost:3000/trpc/question.delete
     * @input {id: number} - ID de la question à supprimer, validé par questionIdSchema
     */
    delete: t.procedure
        .input(questionIdSchema) // Validation de l'ID
        .mutation(async ({ input }) => {
            return await questionService.delete(input.id);
        }),

    /**
     * Recherche des questions par mot-clé
     * Endpoint: GET {{base_url}}/trpc/question.search?input={"keyword":"bitcoin"}
     * @input {keyword: string} - Mot-clé à rechercher dans le texte des questions
     */
    search: t.procedure
        .input(questionSearchSchema)
        .query(async ({ input }) => {
            return await questionService.search(input.keyword);
        }),
});

// Export du type pour utilisation côté frontend (IntelliSense et type-safety)
export type QuestionRouter = typeof questionRouter;
