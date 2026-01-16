import { z } from "zod";

export const notificationDataSchema = z.object({
  id: z.number().int().positive(),
  user_id: z.string().optional(),
  title: z.string().min(1, "Title is required"),
  message: z.string().min(1, "Message is required"),
  type: z.enum(["QUIZ", "NEWS", "REMINDER", "PROFILE", "EVENT", "GAME_END"]),
  game_instance_id: z.number().int().positive().optional(),
  quiz_id: z.number().int().positive().optional(),
  event_id: z.number().int().positive().optional(),
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

// Schéma de base pour la création (sans refinement, pour permettre .partial())
const notificationCreateBaseSchema = notificationDataSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

// Refinement pour valider les relations mutuellement exclusives
const notificationRelationRefinement = (data: { game_instance_id?: number; quiz_id?: number }) => {
  // Si les deux IDs sont fournis, c'est invalide
  if (data.game_instance_id && data.quiz_id) {
    return false;
  }
  return true;
};

const notificationRelationRefinementMessage = {
  message: "game_instance_id and quiz_id cannot both be provided. Only one relation is allowed.",
};

// Schéma de création avec refinement
export const notificationCreateSchema = notificationCreateBaseSchema.refine(
  notificationRelationRefinement,
  notificationRelationRefinementMessage
);

// Schéma de mise à jour: partial() sur le schéma de base, puis refinement
export const notificationUpdateSchema = z.object({
  id: z.number().int().positive(),
  data: notificationCreateBaseSchema.partial().refine(
    notificationRelationRefinement,
    notificationRelationRefinementMessage
  ),
});

export type NotificationSchema = z.infer<typeof notificationDataSchema>;
export type NotificationCreateSchema = z.infer<typeof notificationCreateSchema>;
export type NotificationUpdateSchema = z.infer<typeof notificationUpdateSchema>;
