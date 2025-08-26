//cashou/backend/src/index.ts

// Point d'entrée principal du backend
// Utilise Bun comme runtime JavaScript/TypeScript et tRPC pour l'API
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./routers/app.router.ts";

// Configuration et démarrage du serveur Bun
const server = Bun.serve({
    // Port configurable via variable d'environnement, sinon port 3000 par défaut
    port: process.env.PORT || 3000,

    // Gestionnaire principal des requêtes HTTP
    fetch(req) {
        const url = new URL(req.url);

        // Route d'accueil - Retourne un message simple pour vérifier que le serveur fonctionne
        if (url.pathname === "/") {
            return new Response("Cashou backend", {
                status: 200,
                headers: {
                    "Content-Type": "text/plain",
                },
            });
        }

        // Routage des API tRPC - Toutes les routes commençant par /trpc sont gérées par tRPC
        // tRPC permet de créer des APIs type-safe entre frontend et backend
        if (url.pathname.startsWith("/trpc")) {
            return fetchRequestHandler({
                endpoint: "/trpc", // Point d'entrée des routes tRPC
                req,
                router: appRouter, // Router principal contenant toutes les routes API
                createContext: () => ({}), // Contexte vide pour l'instant (peut contenir auth, db, etc.)
            });
        }

        // Gestion des routes non trouvées - Retourne une erreur 404
        return new Response("Not found", { status: 404 });
    },
});

// Message de confirmation du démarrage avec le port utilisé
console.log(`🚀 Cashou Backend démarré sur http://localhost:${server.port}`);