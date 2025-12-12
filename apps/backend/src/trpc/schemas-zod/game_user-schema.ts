import { z } from "zod";

export const GameUserCreateSchema = z.object({
  userId: z.string({
    message: "L'ID utilisateur doit être une chaîne"
  })
    .min(1, "L'ID utilisateur est requis"),

  gameInstanceId: z.number({
    message: "L'ID de l'instance de jeu doit être un nombre"
  })
    .int("L'ID de l'instance de jeu doit être un entier")
    .positive("L'ID de l'instance de jeu doit être positif"),

  isCreator: z.boolean({
    message: "Le statut de créateur doit être un booléen"
  })
    .nullable()
    .optional(),

  joinAt: z.coerce.date()
    .nullable()
    .optional(),

  status: z.enum(["active", "inactive"], {
    message: "Le statut doit être 'active' ou 'inactive'"
  })
    .nullable()
    .optional()
});

export const GameUserUpdateSchema = GameUserCreateSchema.partial();

export const GameUserDataSchema = GameUserCreateSchema.extend({
  id: z.number().int().positive(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export const GameUserSearchByUserSchema = z.object({
  userId: z.string().min(1, "L'ID utilisateur est requis")
});

export const GameUserSearchByGameInstanceSchema = z.object({
  gameInstanceId: z.number().int().positive()
});

export const GameUserSearchByStatusSchema = z.object({
  status: z.enum(["active", "inactive"])
});

export const GameUserStatusUpdateSchema = z.object({
  status: z.enum(["active", "inactive"])
});

export const GameUserSearchByCreatorSchema = z.object({
  isCreator: z.boolean()
});

export type GameUserCreateSchema = z.infer<typeof GameUserCreateSchema>;
export type GameUserUpdateSchema = z.infer<typeof GameUserUpdateSchema>;
export type GameUserDataSchema = z.infer<typeof GameUserDataSchema>;
export type GameUserSearchByUserSchema = z.infer<typeof GameUserSearchByUserSchema>;
export type GameUserSearchByGameInstanceSchema = z.infer<typeof GameUserSearchByGameInstanceSchema>;
export type GameUserSearchByStatusSchema = z.infer<typeof GameUserSearchByStatusSchema>;
export type GameUserStatusUpdateSchema = z.infer<typeof GameUserStatusUpdateSchema>;
export type GameUserSearchByCreatorSchema = z.infer<typeof GameUserSearchByCreatorSchema>;
