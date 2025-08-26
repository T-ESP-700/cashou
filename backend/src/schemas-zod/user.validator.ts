import { z } from "zod";

export const createUserValidator = z.object({
  username: z.string().min(3).max(20),
  email: z.string().email(),
  passwordHash: z.string().min(8), // déjà hashé côté service ?
  levelId: z.number(), // FK vers Level
});

export const updateUserValidator = z.object({
  id: z.number(),
  username: z.string().min(3).max(20).optional(),
  email: z.string().email().optional(),
  levelId: z.number().optional(),
});
