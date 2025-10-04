// Schémas de validation Zod pour les routes métiers de Market
// Au-delà du CRUD basique, ces schémas gèrent les cas d'usage métier
import { z } from "zod";

// Schéma pour la pagination
export const paginationSchema = z.object({
    limit: z.number().min(1).max(100).default(20),
    offset: z.number().min(0).default(0)
});
export type PaginationSchema = z.infer<typeof paginationSchema>;

// Schéma pour la recherche
export const marketSearchSchema = z.object({
    query: z.string().min(1, "Le terme de recherche est requis"),
    tag: z.string().optional(),
    trend: z.string().optional()
});
export type MarketSearchSchema = z.infer<typeof marketSearchSchema>;

// Schéma pour l'ID de marché (réutilisé)
export const marketIdSchema = z.object({
    marketId: z.number().min(1, "L'ID du marché doit être un nombre > 0")
});
export type MarketIdSchema = z.infer<typeof marketIdSchema>;

// Schéma pour la réponse de liste paginée
export const marketListResponseSchema = z.object({
    items: z.array(z.object({
        id: z.number(),
        name: z.string().nullable(),
        description: z.string().nullable(),
        currentTrends: z.string().nullable(),
        dataSource: z.string().nullable(),
        createdAt: z.date(),
        updatedAt: z.date(),
        assets_count: z.number(),
        submarkets_count: z.number()
    })),
    page: z.object({
        limit: z.number(),
        offset: z.number(),
        total: z.number()
    })
});
export type MarketListResponseSchema = z.infer<typeof marketListResponseSchema>;

// Schéma pour la réponse de recherche
export const marketSearchResponseSchema = z.array(z.object({
    id: z.number(),
    name: z.string().nullable(),
    description: z.string().nullable(),
    currentTrends: z.string().nullable(),
    dataSource: z.string().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
    relevance: z.number()
}));
export type MarketSearchResponseSchema = z.infer<typeof marketSearchResponseSchema>;

// Schéma pour la réponse d'arbre de marché
export const marketTreeResponseSchema = z.object({
    id: z.number(),
    name: z.string().nullable(),
    description: z.string().nullable(),
    currentTrends: z.string().nullable(),
    dataSource: z.string().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
    submarkets: z.array(z.object({
        id: z.number(),
        name: z.string().nullable(),
        description: z.string().nullable(),
        currentTrends: z.string().nullable(),
        dataSource: z.string().nullable(),
        marketId: z.number().nullable(),
        createdAt: z.date(),
        updatedAt: z.date(),
        assets_count: z.number()
    }))
});
export type MarketTreeResponseSchema = z.infer<typeof marketTreeResponseSchema>;

// Schéma pour la réponse d'overview de marché
export const marketOverviewResponseSchema = z.object({
    id: z.number(),
    name: z.string().nullable(),
    description: z.string().nullable(),
    currentTrends: z.string().nullable(),
    dataSource: z.string().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
    kpis: z.object({
        total_assets: z.number(),
        total_submarkets: z.number(),
        diversity_score: z.number(),
        market_cap_simulated: z.number(),
        volatility_estimate: z.string()
    }),
    topAssets: z.array(z.object({
        id: z.number(),
        symbol: z.string().nullable(),
        title: z.string().nullable(),
        last_value: z.number(),
        perf_m1_pct: z.number()
    })),
    submarkets: z.array(z.object({
        id: z.number(),
        name: z.string().nullable(),
        description: z.string().nullable(),
        currentTrends: z.string().nullable(),
        dataSource: z.string().nullable(),
        marketId: z.number().nullable(),
        createdAt: z.date(),
        updatedAt: z.date()
    }))
});
export type MarketOverviewResponseSchema = z.infer<typeof marketOverviewResponseSchema>;
