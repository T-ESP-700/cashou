import { NotificationService } from "../services/notification.service.ts";
import {
    notificationCreateSchema,
    notificationUpdateSchema,
    notificationIdSchema,
    notificationUserIdSchema,
} from "../schemas-zod/notification-schema.ts";
import { router, publicProcedure } from "../index.ts";
import { z } from "zod";
import { prisma } from "@cashou/db-app";

const notificationService = new NotificationService();

export const notificationRouter = router({

    /**
     * Récupère toutes les notifications
     * Endpoint: GET http://localhost:3000/trpc/notification.getAll
     * Pas de paramètre d'entrée requis
     */
    getAll: publicProcedure.query(async () => {
        return await notificationService.findAll();
    }),

    /**
     * Récupère une notification par son ID
     * Endpoint: GET http://localhost:3000/trpc/notification.getById?input={"id":1}
     * @input {id: number} - ID de la notification, validé par notificationIdSchema
     */
    getById: publicProcedure
        .input(notificationIdSchema)
        .query(async ({ input }) => {
        return await notificationService.findOne(input.id);
        }),

    /**
     * Récupère toutes les notifications d'un utilisateur
     * Endpoint: GET http://localhost:3000/trpc/notification.findByUser?input={"userId":"user123"}
     * @input {userId: string} - ID de l'utilisateur, validé par notificationUserIdSchema
     */
    findByUser: publicProcedure
        .input(notificationUserIdSchema)
        .query(async ({ input }) => {
            return await notificationService.findByUser(input.userId);
        }),

    /**
     * Crée une nouvelle notification
     * Endpoint: POST http://localhost:3000/trpc/notification.create
     * @input NotificationCreateSchema - Données de la notification à créer
     */
    create: publicProcedure
        .input(notificationCreateSchema)
        .mutation(async ({ input }) => {
            return await notificationService.create(input);
        }),

    /**
     * Met à jour une notification existante
     * Endpoint: POST http://localhost:3000/trpc/notification.update
     * @input NotificationUpdateSchema - ID + données à modifier
     */
    update: publicProcedure
        .input(notificationUpdateSchema)
        .mutation(async ({ input }) => {
            return await notificationService.update(input.id, input.data);
        }),

    /**
      * Marque une notification spécifique comme lue.
      * Endpoint: POST http://localhost:3000/trpc/notification.markedAsRead
      * @input {id: number} - ID de la notification, validé par notificationIdSchema
      */
    markedAsRead: publicProcedure
        .input(notificationIdSchema)
        .mutation(async ({ input }) => {
            return await notificationService.markedAsRead(input.id);
        }),

    /**
      * Marque toutes les notifications non lues d'un utilisateur comme lues.
      * Endpoint: POST http://localhost:3000/trpc/notification.markAllAsRead
      * @input {userId: string} - ID de l'utilisateur, validé par notificationUserIdSchema
      */
    markAllAsRead: publicProcedure
        .input(notificationUserIdSchema)
        .mutation(async ({ input }) => {
            return await notificationService.markAllAsReadByUser(input.userId);
        }),

    /**
     * Supprime une notification
     * Endpoint: POST http://localhost:3000/trpc/notification.delete
     * @input {id: number} - ID de la notification à supprimer
     */
    delete: publicProcedure
        .input(notificationIdSchema)
        .mutation(async ({ input }) => {
            return await notificationService.delete(input.id);
        }),

    /**
     * Marque la notification GAME_END d'une partie comme lue.
     * Empêche le polling de re-déclencher la navigation vers l'écran de jeu.
     */
    markGameEndAsRead: publicProcedure
        .input(z.object({ gameInstanceId: z.number() }))
        .mutation(async ({ input }) => {
            await prisma.notification.updateMany({
                where: {
                    gameInstanceId: input.gameInstanceId,
                    type: 'GAME_END',
                    isOpened: false,
                },
                data: { isOpened: true },
            });
            return { success: true };
        }),
});

export type NotificationRouter = typeof notificationRouter;
