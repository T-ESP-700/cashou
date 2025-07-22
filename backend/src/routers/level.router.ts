// src/server/routers/level.router.ts
import { initTRPC } from "@trpc/server";
import { z } from "zod";
import { LevelService } from "../services/level.service.ts";
import type { LevelCreateInput, LevelUpdateInput } from "../services/level.service.ts";

const t = initTRPC.create();
const levelService = new LevelService();

// Schéma de validation pour la création et la mise à jour
const levelInputSchema = z.object({
    title: z.string().optional(),
    number: z.number().optional(),
    duration: z.number().optional(),
    speed: z.number().optional(),
    startBalance: z.number().optional(),
    pointsRequired: z.number().optional(),
    description: z.string().optional(),
});

export const levelRouter = t.router({
    // GET  http://localhost:3000/trpc/level.getAll
    getAll: t.procedure.query(async () => {
        return await levelService.findAll();
    }),

    // GET http://localhost:3000/trpc/level.getById?input={"id":1}
    getById: t.procedure
        .input(z.object({ id: z.number() }))
        .query(async ({ input }) => {
            return await levelService.findOne(input.id);
        }),

    // POST  http://localhost:3000/trpc/level.create
    create: t.procedure
        .input(levelInputSchema)
        .mutation(async ({ input }) => {
            return await levelService.create(input as LevelCreateInput);
        }),

    // POST http://localhost:3000/trpc/level.update
    update: t.procedure
        .input(z.object({
            id: z.number(),
            data: levelInputSchema
        }))
        .mutation(async ({ input }) => {
            return await levelService.update(input.id, input.data as LevelUpdateInput);
        }),

    // POST http://localhost:3000/trpc/level.delete
    delete: t.procedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
            return await levelService.delete(input.id);
        }),
});

export type LevelRouter = typeof levelRouter;