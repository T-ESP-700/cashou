import { initTRPC } from "@trpc/server";
import {levelRouter} from "./level.router.ts";

const t = initTRPC.create();

export const appRouter = t.router({
    level: levelRouter,
});

export type AppRouter = typeof appRouter;