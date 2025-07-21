import { publicProcedure, router } from "../trcp";
import { z } from "zod";
import { userService } from "../../services/user.services";
import { createUserValidator, updateUserValidator } from "../../validators/user.validator"; 

export const userRouter = router({
    // 🔥 GET /users
    getAll: publicProcedure.query(async () => {
        return userService.getAll();
    }),

    // 🔥 GET /users/:id
    getById: publicProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ input }) => {
            return userService.getById(input.id);
        }),

    // 🔥 POST /users
    create: publicProcedure
        .input(createUserValidator)
        .mutation(async ({ input }) => {
            return userService.create(input);
        }),

    // 🔥 PUT /users/:id
    update: publicProcedure
        .input(updateUserValidator)
        .mutation(async ({ input }) => {
            const { id, ...data } = input;
            return userService.update(id, data);
        }),

    // 🔥 DELETE /users/:id
    delete: publicProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
            return userService.delete(input.id);
        }),
});
