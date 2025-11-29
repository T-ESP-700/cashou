import { z } from "zod";

export const notificationDataSchema = z.object({
  id: z.number().int().positive(),
  user_id: z.string().optional(),
  title: z.string().min(1, "Title is required"),
  message: z.string().min(1, "Message is required"),
  type: z.enum(["QUIZ", "NEWS", "REMINDER", "PROFILE"]),
  game_instance_id: z.number().int().positive().optional(),
  quiz_id: z.number().int().positive().optional(),
  is_open: z.boolean(),
  sent_at: z.coerce.date(),
  created_at: z.date().default(() => new Date()),
  updated_at: z.date().default(() => new Date()),
});

export const notificationIdSchema = z.object({
  id: z.number().int().positive(),
});

export const notificationUserIdSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
});

export const notificationCreateSchema = notificationDataSchema
  .omit({
    id: true,
    created_at: true,
    updated_at: true,
  })
  .refine(
    (data) => {
      // Si les deux IDs sont fournis, c'est invalide
      if (data.game_instance_id && data.quiz_id) {
        return false;
      }
      // Si le type est QUIZ, quiz_id devrait être fourni (mais on le laisse optionnel pour flexibilité)
      // Si le type nécessite une game instance, game_instance_id devrait être fourni
      return true;
    },
    {
      message: "game_instance_id and quiz_id cannot both be provided. Only one relation is allowed.",
    }
  );

export const notificationUpdateSchema = z.object({
  id: z.number().int().positive(),
  data: notificationCreateSchema.partial(),
});

export type NotificationSchema = z.infer<typeof notificationDataSchema>;
export type NotificationCreateSchema = z.infer<typeof notificationCreateSchema>;
export type NotificationUpdateSchema = z.infer<typeof notificationUpdateSchema>;
