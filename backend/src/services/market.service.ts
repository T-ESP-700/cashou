// Service métier pour la gestion des marchés du jeu
// Couche d'abstraction entre les routers et la base de données
import type { Market, Submarket, PrismaClient } from "@prisma/client";
import defaultPrisma from "../database.ts";
import type {MarketCreateSchema, MarketDataSchema} from "../schemas-zod/market-schema.ts";

export class MarketService {
    private prisma: PrismaClient;

    // Permet d'injecter Prisma pour les tests
    constructor(prismaClient?: PrismaClient) {
        this.prisma = prismaClient || defaultPrisma;
    }

    /**
     * Récupère tous les marchés avec leurs relations
     * @returns Promise<Market[]> - Liste complète des marchés triés par nom
     */
    async findAll(): Promise<Market[]> {
        return this.prisma.market.findMany({
            include: {
                // Inclut les sous-marchés du marché
                submarkets: true,
                // Inclut les actifs du marché
                assets: true,
                // Inclut les champs du marché
                fields: true
            },
            orderBy: { name: 'asc' }, // Tri par nom de marché croissant
        });
    }

    /**
     * Récupère un marché spécifique par son ID
     * @param id - Identifiant unique du marché
     * @returns Promise<Market | null> - Le marché trouvé ou null si inexistant
     */
    async findOne(id: number): Promise<Market | null> {
        return this.prisma.market.findUnique({
            where: { id },
            include: {
                // Même structure que findAll pour la cohérence des données
                submarkets: true,
                assets: true,
                fields: true
            }
        });
    }

    /**
     * Crée un nouveau marché
     * @param data - Données du marché validées par le schéma Zod
     * @returns Promise<Market> - Le marché créé avec son ID généré
     */
    async create(data: MarketCreateSchema): Promise<Market> {
        return this.prisma.market.create({ data });
    }

    /**
     * Met à jour un marché existant
     * @param id - Identifiant du marché à modifier
     * @param data - Nouvelles données validées par le schéma Zod
     * @returns Promise<Market> - Le marché mis à jour
     */
    async update(id: number, data: MarketDataSchema): Promise<Market> {
        return this.prisma.market.update({
            where: { id },
            data
        });
    }

    /**
     * Supprime un marché
     * @param id - Identifiant du marché à supprimer
     * @returns Promise<Market> - Le marché supprimé (pour confirmation)
     */
    async delete(id: number): Promise<Market> {
        return this.prisma.market.delete({ where: { id } });
    }

    /**
     * Récupère une liste paginée des marchés avec compteurs
     * @param limit - Nombre d'éléments par page
     * @param offset - Décalage pour la pagination
     * @returns Promise<{items: Market[], page: {limit: number, offset: number, total: number}}>
     */
    async list(limit: number = 20, offset: number = 0): Promise<{
        items: Array<Market & { assets_count: number; submarkets_count: number }>;
        page: { limit: number; offset: number; total: number };
    }> {
        // Récupérer le total
        const total = await this.prisma.market.count();

        // Récupérer les marchés avec compteurs
        const markets = await this.prisma.market.findMany({
            skip: offset,
            take: limit,
            include: {
                _count: {
                    select: {
                        assets: true,
                        submarkets: true
                    }
                }
            },
            orderBy: { name: 'asc' }
        });

        // Transformer les données pour inclure les compteurs
        const items = markets.map(market => ({
            ...market,
            assets_count: market._count.assets,
            submarkets_count: market._count.submarkets
        }));

        return {
            items,
            page: { limit, offset, total }
        };
    }

    /**
     * Recherche des marchés par mots-clés et tendances
     * @param query - Terme de recherche
     * @param tag - Tag optionnel
     * @param trend - Tendance optionnelle
     * @returns Promise<Array<Market & { relevance: number }>>
     */
    async search(query: string, tag?: string, trend?: string): Promise<Array<Market & { relevance: number }>> {
        const where: any = {
            OR: [
                { name: { contains: query, mode: 'insensitive' } },
                { description: { contains: query, mode: 'insensitive' } },
                { currentTrends: { contains: query, mode: 'insensitive' } }
            ]
        };

        if (tag) {
            where.OR.push({ name: { contains: tag, mode: 'insensitive' } });
        }

        if (trend) {
            where.currentTrends = { contains: trend, mode: 'insensitive' };
        }

        const markets = await this.prisma.market.findMany({
            where,
            orderBy: { name: 'asc' }
        });

        // Calculer un score de pertinence simple
        return markets.map(market => ({
            ...market,
            relevance: this.calculateRelevance(market, query)
        }));
    }

    /**
     * Récupère l'arbre complet d'un marché (marché + sous-marchés + compteurs d'actifs)
     * @param marketId - Identifiant du marché
     * @returns Promise<Market & { submarkets: Array<any> }>
     */
    async getTree(marketId: number): Promise<Market & {
        submarkets: Array<any>
    }> {
        const market = await this.prisma.market.findUnique({
            where: { id: marketId },
            include: {
                submarkets: {
                    include: {
                        _count: {
                            select: { assets: true }
                        }
                    }
                }
            }
        });

        if (!market) {
            throw new Error(`Marché avec l'ID ${marketId} non trouvé`);
        }

        // Transformer les sous-marchés pour inclure les compteurs
        const submarkets = market.submarkets.map(submarket => ({
            ...submarket,
            assets_count: submarket._count.assets
        }));

        return {
            ...market,
            submarkets
        };
    }

    /**
     * Récupère une vue d'ensemble complète d'un marché
     * @param marketId - Identifiant du marché
     * @returns Promise<Market & { kpis: any, topAssets: any[], submarkets: any[] }>
     */
    async getOverview(marketId: number): Promise<Market & {
        kpis: any;
        topAssets: any[];
        submarkets: any[]
    }> {
        const market = await this.prisma.market.findUnique({
            where: { id: marketId },
            include: {
                submarkets: true,
                assets: {
                    include: {
                        assetHistories: {
                            orderBy: { timestamp: 'desc' },
                            take: 1
                        }
                    },
                    orderBy: { title: 'asc' },
                    take: 10 // Top 10 actifs
                }
            }
        });

        if (!market) {
            throw new Error(`Marché avec l'ID ${marketId} non trouvé`);
        }

        // Calculer les KPIs basiques
        const kpis = this.calculateMarketKPIs(market);

        // Identifier les top actifs (par exemple, par performance ou volume)
        const topAssets = this.getTopAssets(market.assets);

        return {
            ...market,
            kpis,
            topAssets,
            submarkets: market.submarkets
        };
    }

    /**
     * Calcule un score de pertinence pour la recherche
     * @param market - Marché à évaluer
     * @param query - Terme de recherche
     * @returns number - Score de pertinence (0-100)
     */
    private calculateRelevance(market: Market, query: string): number {
        let score = 0;
        const queryLower = query.toLowerCase();

        if (market.name?.toLowerCase().includes(queryLower)) score += 50;
        if (market.description?.toLowerCase().includes(queryLower)) score += 30;
        if (market.currentTrends?.toLowerCase().includes(queryLower)) score += 20;

        return Math.min(score, 100);
    }

    /**
     * Calcule les KPIs basiques d'un marché
     * @param market - Marché avec ses relations
     * @returns any - Objet contenant les KPIs
     */
    private calculateMarketKPIs(market: Market & { assets: any[]; submarkets: any[] }): any {
        const totalAssets = market.assets.length;
        const totalSubmarkets = market.submarkets?.length || 0;

        // KPIs plus réalistes
        return {
            total_assets: totalAssets,
            total_submarkets: totalSubmarkets,
            diversity_score: totalAssets > 0 ? Math.min(totalAssets / 10, 100) : 0,
            // Market cap basé sur la valeur des actifs (plus réaliste)
            estimated_market_cap: this.calculateEstimatedMarketCap(market.assets),
            volatility_estimate: this.estimateVolatility(totalAssets),
            liquidity_score: this.calculateLiquidityScore(totalAssets, totalSubmarkets)
        };
    }

    /**
     * Calcule une estimation plus réaliste du market cap
     * @param assets - Liste des actifs du marché
     * @returns string - Market cap estimé formaté
     */
    private calculateEstimatedMarketCap(assets: any[]): string {
        if (assets.length === 0) return "0";

        // Simulation plus réaliste basée sur le nombre d'actifs
        // Dans un vrai système, on utiliserait les vraies valeurs des actifs
        const baseValue = assets.length * 50000000; // 50M par actif en moyenne

        if (baseValue >= 1000000000) {
            return `${(baseValue / 1000000000).toFixed(1)}B`; // Billions
        } else if (baseValue >= 1000000) {
            return `${(baseValue / 1000000).toFixed(1)}M`; // Millions
        } else {
            return `${(baseValue / 1000).toFixed(1)}K`; // Thousands
        }
    }

    /**
     * Estime la volatilité basée sur la diversité du marché
     * @param totalAssets - Nombre total d'actifs
     * @returns string - Estimation de volatilité
     */
    private estimateVolatility(totalAssets: number): string {
        if (totalAssets === 0) return "Inconnue";
        if (totalAssets < 3) return "Très élevée";      // Peu diversifié
        if (totalAssets < 10) return "Élevée";          // Diversification limitée
        if (totalAssets < 25) return "Modérée";         // Bonne diversification
        if (totalAssets < 50) return "Faible";          // Très diversifié
        return "Très faible";                            // Ultra diversifié
    }

    /**
     * Calcule un score de liquidité basé sur la structure du marché
     * @param totalAssets - Nombre total d'actifs
     * @param totalSubmarkets - Nombre total de sous-marchés
     * @returns string - Score de liquidité
     */
    private calculateLiquidityScore(totalAssets: number, totalSubmarkets: number): string {
        if (totalAssets === 0) return "N/A";

        // Score basé sur la diversité et la structure
        const diversityScore = totalAssets / Math.max(totalSubmarkets, 1);

        if (diversityScore > 10) return "Élevée";       // Beaucoup d'actifs par sous-marché
        if (diversityScore > 5) return "Modérée";       // Bon équilibre
        if (diversityScore > 2) return "Faible";        // Peu d'actifs par sous-marché
        return "Très faible";                            // Concentration élevée
    }

    /**
     * Identifie les top actifs d'un marché
     * @param assets - Liste des actifs
     * @returns any[] - Top actifs triés par performance
     */
    private getTopAssets(assets: any[]): any[] {
        if (assets.length === 0) return [];

        // Calculer un score de performance pour chaque actif
        const assetsWithScore = assets.map(asset => {
            const lastHistory = asset.assetHistories?.[0];
            const lastValue = lastHistory?.value || 0;

            // Score basé sur plusieurs critères
            const score = this.calculateAssetScore(asset, lastHistory);

            return {
                asset,
                score,
                lastValue
            };
        });

        // Trier par score de performance (décroissant)
        const sortedAssets = assetsWithScore
            .sort((a, b) => b.score - a.score)
            .slice(0, 5); // Top 5

        // Formater la réponse
        return sortedAssets.map(({ asset, score, lastValue }) => {
            const lastHistory = asset.assetHistories?.[0];
            return {
                id: asset.id,
                symbol: asset.symbol,
                title: asset.title,
                last_value: lastValue,
                last_volume: lastHistory?.volume || 0,        // ← Volume ajouté !
                performance_score: Math.round(score * 100) / 100,
                category: asset.field || 'Non catégorisé',    // ← Utilise 'field' au lieu de 'category'
                risk_level: this.assessAssetRisk(asset, lastHistory)
            };
        });
    }

    /**
     * Calcule un score de performance pour un actif
     * @param asset - Actif à évaluer
     * @param lastHistory - Dernière historique de l'actif
     * @returns number - Score de performance (0-100)
     */
    private calculateAssetScore(asset: any, lastHistory: any): number {
        let score = 0;

        // Base score sur la catégorie (utilise 'field' du schéma Prisma)
        if (asset.field) {
            const categoryScores: { [key: string]: number } = {
                'tech': 85,      // Technologie = tendance
                'finance': 75,   // Finance = stable
                'energy': 70,    // Énergie = cyclique
                'healthcare': 80, // Santé = croissance
                'consumer': 65,  // Consommation = stable
                'industrial': 60, // Industriel = cyclique
                'ai': 90,        // IA = très tendance
                'crypto': 70,    // Crypto = volatil mais populaire
                'biotech': 85,   // Biotech = croissance
                'renewable': 80  // Énergies renouvelables = tendance
            };
            score += categoryScores[asset.field.toLowerCase()] || 50;
        } else {
            score += 50; // Score par défaut
        }

        // Bonus pour la liquidité (plus d'historiques = plus liquide)
        if (asset.assetHistories && asset.assetHistories.length > 0) {
            score += Math.min(asset.assetHistories.length * 2, 20);
        }

        // Bonus pour la stabilité (si on a des données historiques)
        if (lastHistory && lastHistory.value) {
            // Plus la valeur est élevée, plus l'actif est "mature"
            if (lastHistory.value > 1000000) score += 10;
            else if (lastHistory.value > 100000) score += 5;
        }

        // Bonus pour le volume (liquidité)
        if (lastHistory && lastHistory.volume) {
            // Plus le volume est élevé, plus l'actif est liquide
            if (lastHistory.volume > 1000000) score += 15;      // Très liquide
            else if (lastHistory.volume > 100000) score += 10;   // Liquide
            else if (lastHistory.volume > 10000) score += 5;     // Modérément liquide
        }

        return Math.min(score, 100);
    }

    /**
     * Évalue le niveau de risque d'un actif
     * @param asset - Actif à évaluer
     * @param lastHistory - Dernière historique
     * @returns string - Niveau de risque
     */
    private assessAssetRisk(asset: any, lastHistory: any): string {
        let riskFactors = 0;

        // Plus de catégories = plus de risque
        if (!asset.category) riskFactors++;

        // Moins d'historiques = plus de risque
        if (!asset.assetHistories || asset.assetHistories.length < 3) riskFactors++;

        // Valeur faible = potentiellement plus de risque
        if (lastHistory && lastHistory.value < 10000) riskFactors++;

        if (riskFactors === 0) return "Faible";
        if (riskFactors === 1) return "Modéré";
        if (riskFactors === 2) return "Élevé";
        return "Très élevé";
    }
}
