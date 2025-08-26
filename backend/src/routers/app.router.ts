// Router principal de l'application - Point central de regroupement de tous les sous-routers
import { initTRPC } from "@trpc/server";
import {levelRouter} from "./level.router.ts";
import {marketRouter} from "./market.router.ts";
import {submarketRouter} from "./submarket.router.ts";
import {fieldRouter} from "./field.router.ts";
import {assetRouter} from "./asset.router.ts";
import {eventRouter} from "./event.router.ts";
import {assetHistoryRouter} from "./asset-history.router.ts";
import {eventAssetRouter} from "./event-asset.router.ts";

// Initialisation de tRPC - Framework pour créer des APIs type-safe
const t = initTRPC.create();

// Router principal qui regroupe tous les sous-routers de l'application
export const appRouter = t.router({
    level: levelRouter,
    market: marketRouter,
    submarket: submarketRouter,
    field: fieldRouter,
    asset: assetRouter,
    event: eventRouter,
    assetHistory: assetHistoryRouter,
    eventAsset: eventAssetRouter,
});

// Export du type pour utilisation côté frontend (type-safety)
// Permet au frontend de connaître exactement les routes disponibles et leurs types
export type AppRouter = typeof appRouter;
