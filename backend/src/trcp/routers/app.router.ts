import { initTRPC } from "@trpc/server";
import { enumRouter } from "./enum.router";

const t = initTRPC.create();

export const appRouter = t.router({
    enum: enumRouter,
    // Ajoutez d'autres routers ici selon votre hiérarchie
});

export type AppRouter = typeof appRouter;