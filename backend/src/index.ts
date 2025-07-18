import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import {appRouter} from "./server/routers";

const server = Bun.serve({
    port: process.env.PORT || 3000,
    fetch(req) {
        const url = new URL(req.url);

        if (url.pathname.startsWith("/trpc")) {
            return fetchRequestHandler({
                endpoint: "/trpc",
                req,
                router: appRouter,
                createContext: () => ({}),
            });
        }

        return new Response("Not found", { status: 404 });
    },
});

console.log(`🚀 Server running on http://localhost:${server.port}`);