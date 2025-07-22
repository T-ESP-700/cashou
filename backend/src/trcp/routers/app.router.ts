import { initTRPC } from "@trpc/server";
import { enumRouter } from "./enum.router";
import {levelRouter} from "./level.router";

const t = initTRPC.create();

export const appRouter = t.router({
    enum: enumRouter,
    level: levelRouter,
});

export type AppRouter = typeof appRouter;