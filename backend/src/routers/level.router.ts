// src/server/routers/level.router.ts
import { initTRPC } from "@trpc/server";
import { LevelService } from "../services/level.service";
import {levelCreateSchema, levelUpdateSchema, levelIdSchema} from "../schemas-zod/level-schema.ts";

const t = initTRPC.create();
const levelService = new LevelService();

export const levelRouter = t.router({

    // GET  http://localhost:3000/trpc/level.getAll
    getAll: t.procedure.query(async () => {
        return await levelService.findAll();
    }),

    // GET http://localhost:3000/trpc/level.getById?input={"id":1}
    getById: t.procedure
        .input(levelIdSchema)
        .query(async ({ input }) => {
            return await levelService.findOne(input.id);
        }),

    // POST  http://localhost:3000/trpc/level.create
    create: t.procedure
        .input(levelCreateSchema)
        .mutation(async ({ input }) => {
            return await levelService.create(input);
        }),

    // POST http://localhost:3000/trpc/level.update
    update: t.procedure
        .input(levelUpdateSchema)
        .mutation(async ({ input }) => {
            return await levelService.update(input.id, input.data);
        }),

    // POST http://localhost:3000/trpc/level.delete
    delete: t.procedure
        .input(levelIdSchema)
        .mutation(async ({ input }) => {
            return await levelService.delete(input.id);
        }),
});

export type LevelRouter = typeof levelRouter;