// src/server/routers/user.router.ts
import { initTRPC } from "@trpc/server";
import { UserService } from "../../trpc/services/user.service.ts";
import {userCreateSchema, userUpdateSchema, userIdSchema, userLevelSchema, userEmailSchema} from "../schemas-zod/user-schema.ts";
import { z } from "zod";

// Initialisation de tRPC pour ce router spécifique
const t = initTRPC.create();

// Instance unique du service métier pour ce router
const userService = new UserService();

export const userRouter = t.router({

    /**
     * Récupère tous les utilisateurs
     * Endpoint: GET http://localhost:3000/trpc/user.getAll
     * Pas de paramètre d'entrée requis
     */
    getAll: t.procedure.query(async () => {
        return await userService.findAll();
    }),

    /**
     * Récupère un utilisateur par son ID
     * Endpoint: GET http://localhost:3000/trpc/user.getById?input={"id":1}
     * @input {id: number} - ID de l'utilisateur recherché, validé par userIdSchema
     */
    getById: t.procedure
        .input(userIdSchema) // Validation automatique de l'entrée
        .query(async ({ input }) => {
            return await userService.findOne(input.id);
        }),

    /**
     * Crée un nouvel utilisateur
     * Endpoint: POST http://localhost:3000/trpc/user.create
     * @input UserCreateSchema - Données de l'utilisateur à créer, validées automatiquement
     */
    create: t.procedure
        .input(userCreateSchema) // Validation des données avant traitement
        .mutation(async ({ input }) => { // mutation = opération de modification
            return await userService.create(input);
        }),

    /**
     * Met à jour un utilisateur existant
     * Endpoint: POST http://localhost:3000/trpc/user.update
     * @input UserUpdateSchema - ID + données à modifier, validées automatiquement
     */
    update: t.procedure
        .input(userUpdateSchema) // Validation de l'ID et des données
        .mutation(async ({ input }) => {
            return await userService.update(input.id, input.data);
        }),

    /**
     * Supprime un utilisateur
     * Endpoint: POST http://localhost:3000/trpc/user.delete
     * @input {id: number} - ID de l'utilisateur à supprimer, validé par userIdSchema
     */
    delete: t.procedure
        .input(userIdSchema) // Validation de l'ID
        .mutation(async ({ input }) => {
            return await userService.delete(input.id);
        }),

    /**
     * Récupère tous les utilisateurs d'un niveau spécifique
     * Endpoint: GET http://localhost:3000/trpc/user.getByLevel?input={"levelId":1}
     * @input {levelId: number} - ID du niveau, validé
     */
    getByLevel: t.procedure
        .input(userLevelSchema)
        .query(async ({ input }) => {
            return await userService.findByLevel(input.levelId);
        }),

    /**
     * Recherche un utilisateur par email
     * Endpoint: GET http://localhost:3000/trpc/user.getByEmail?input={"email":"user@example.com"}
     * @input {email: string} - Email de l'utilisateur
     */
    getByEmail: t.procedure
        .input(userEmailSchema)
        .query(async ({ input }) => {
            return await userService.findByEmail(input.email);
        }),

    /**
     * Récupère le top des utilisateurs par points
     * Endpoint: GET http://localhost:3000/trpc/user.getTopUsers?input={"limit":10}
     * @input {limit?: number} - Nombre maximum d'utilisateurs à retourner (optionnel)
     */
    getTopUsers: t.procedure
        .input(z.object({ limit: z.number().positive().optional() }))
        .query(async ({ input }) => {
            return await userService.findTopUsers(input.limit);
        }),

    /**
     * Met à jour la dernière activité d'un utilisateur
     * Endpoint: POST http://localhost:3000/trpc/user.updateLastActivity
     * @input {id: number} - ID de l'utilisateur
     */
    updateLastActivity: t.procedure
        .input(userIdSchema)
        .mutation(async ({ input }) => {
            return await userService.updateLastActivity(input.id);
        }),

    /**
     * Ajoute des points à un utilisateur
     * Endpoint: POST http://localhost:3000/trpc/user.addPoints
     * @input {id: number, points: number} - ID de l'utilisateur et points à ajouter
     */
    addPoints: t.procedure
        .input(z.object({
            id: z.number().min(1, "L'ID doit être un nombre > 0"),
            points: z.number().positive("Les points doivent être positifs")
        }))
        .mutation(async ({ input }) => {
            return await userService.addPoints(input.id, input.points);
        }),
});

// Export du type pour utilisation côté frontend (IntelliSense et type-safety)
export type UserRouter = typeof userRouter;
