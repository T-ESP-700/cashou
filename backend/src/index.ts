//cashou/backend/src/index.ts
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./routers/app.router.ts";

const server = Bun.serve({
    port: process.env.PORT || 3000,
    fetch(req) {
        const url = new URL(req.url);

        // Route racine pour afficher le message d'accueil
        if (url.pathname === "/") {
            console.log("✅ Route racine appelée");
            return new Response("Cashou backend", {
                status: 200,
                headers: {
                    "Content-Type": "text/plain",
                },
            });
        }

        // Routes tRPC
        if (url.pathname.startsWith("/trpc")) {
            return fetchRequestHandler({
                endpoint: "/trpc",
                req,
                router: appRouter,
                createContext: () => ({}),
            });
        }

        // Toutes les autres routes
        console.log("❌ Route non trouvée:", url.pathname);
        return new Response("Not found", { status: 404 });
    },
});

console.log(`🚀 Cashou Backend démarré sur http://localhost:${server.port}`);
