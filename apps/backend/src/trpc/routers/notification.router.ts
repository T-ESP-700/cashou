import { initTRPC } from "@trpc/server";
import { NotificationService } from "../services/notification.service.ts";
import {
    notificationCreateSchema,
    notificationUpdateSchema,
    notificationIdSchema,
    notificationUserIdSchema,
} from "../schemas-zod/notification-schema.ts";

const t = initTRPC.create();

const notificationService = new NotificationService();

export const notificationRouter = t.router({

    /**
     * Récupère toutes les notifications
     * Endpoint: GET http://localhost:3000/trpc/notification.getAll
     * Pas de paramètre d'entrée requis
     */
    getAll: t.procedure.query(async () => {
        return await notificationService.findAll();
    }),

    /**
     * Récupère une notification par son ID
     * Endpoint: GET http://localhost:3000/trpc/notification.getById?input={"id":1}
     * @input {id: number} - ID de la notification, validé par notificationIdSchema
     */
    getById: t.procedure
        .input(notificationIdSchema)
        .query(async ({ input }) => {
        return await notificationService.findOne(input.id);
        }),

    /**
     * Récupère toutes les notifications d'un utilisateur
     * Endpoint: GET http://localhost:3000/trpc/notification.findByUser?input={"userId":"user123"}
     * @input {userId: string} - ID de l'utilisateur, validé par notificationUserIdSchema
     */
    findByUser: t.procedure
        .input(notificationUserIdSchema)
        .query(async ({ input }) => {
            return await notificationService.findByUser(input.userId);
        }),

    /**
     * Crée une nouvelle notification
     * Endpoint: POST http://localhost:3000/trpc/notification.create
     * @input NotificationCreateSchema - Données de la notification à créer
     */
    create: t.procedure
        .input(notificationCreateSchema)
        .mutation(async ({ input }) => {
            return await notificationService.create(input);
        }),

    /**
     * Met à jour une notification existante
     * Endpoint: POST http://localhost:3000/trpc/notification.update
     * @input NotificationUpdateSchema - ID + données à modifier
     */
    update: t.procedure
        .input(notificationUpdateSchema)
        .mutation(async ({ input }) => {
            return await notificationService.update(input.id, input.data);
        }),

    /**
      * Marque une notification spécifique comme lue.
      * Endpoint: POST http://localhost:3000/trpc/notification.markedAsRead
      * @input {id: number} - ID de la notification, validé par notificationIdSchema
      */
    markedAsRead: t.procedure
        .input(notificationIdSchema)
        .mutation(async ({ input }) => {
            return await notificationService.markedAsRead(input.id);
        }),

    /**
      * Marque toutes les notifications non lues d'un utilisateur comme lues.
      * Endpoint: POST http://localhost:3000/trpc/notification.markAllAsRead
      * @input {userId: string} - ID de l'utilisateur, validé par notificationUserIdSchema
      */
    markAllAsRead: t.procedure
        .input(notificationUserIdSchema)
        .mutation(async ({ input }) => {
            return await notificationService.markAllAsReadByUser(input.userId);
        }),

    /**
     * Supprime une notification
     * Endpoint: POST http://localhost:3000/trpc/notification.delete
     * @input {id: number} - ID de la notification à supprimer
     */
    delete: t.procedure
        .input(notificationIdSchema)
        .mutation(async ({ input }) => {
            return await notificationService.delete(input.id);
        }),
});

export type NotificationRouter = typeof notificationRouter;
