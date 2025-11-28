import { z } from "zod";

export const notificationDataSchema = z.object({
  id: z.number().int().positive(),
  user_id: z.number().int().positive(),
  title: z.string().min(1, "Title is required"),
  message: z.string().min(1, "Message is required"),
  type: z.enum(["QUIZ", "NEWS", "REMINDER"]),
  type_id: z.number().int().positive().optional(),
  is_open: z.boolean(),
  sent_at: z.coerce.date(),
  created_at: z.date().default(() => new Date()),
  updated_at: z.date().default(() => new Date()),
});

export const notificationIdSchema = z.object({
  id: z.number().int().positive(),
});

export const notificationCreateSchema = notificationDataSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const notificationUpdateSchema = z.object({
  id: z.number().int().positive(),
  data: notificationCreateSchema.partial(),
});

export type NotificationSchema = z.infer<typeof notificationDataSchema>;
export type NotificationCreateSchema = z.infer<typeof notificationCreateSchema>;
export type NotificationUpdateSchema = z.infer<typeof notificationUpdateSchema>;
