import type { Market, Submarket, PrismaClient } from "@prisma/client";
import defaultPrisma from "../../database.ts";
import type {MarketCreateSchema, MarketDataSchema} from "../schemas-zod/market-schema.ts";

export class MarketService {
    private prisma: PrismaClient;

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
            orderBy: { title: 'asc' }, // Tri par titre de marché croissant
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
            orderBy: { title: 'asc' }
        });

        // Transformer les données pour inclure les compteurs
        const items = markets.map((market: Market & { _count: { assets: number; submarkets: number } }) => ({
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
                { title: { contains: query, mode: 'insensitive' } },
                { description: { contains: query, mode: 'insensitive' } }
            ]
        };

        if (tag) {
            where.OR.push({ title: { contains: tag, mode: 'insensitive' } });
        }

        // Note: currentTrends field doesn't exist in schema, trend parameter is ignored for now
        // if (trend) {
        //     where.currentTrends = { contains: trend, mode: 'insensitive' };
        // }

        const markets = await this.prisma.market.findMany({
            where,
            orderBy: { title: 'asc' }
        });

        // Calculer un score de pertinence simple
        return markets.map((market: Market) => ({
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
        const submarkets = market.submarkets.map((submarket: Submarket & { _count: { assets: number } }) => ({
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
                        field: true,
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

        if (market.title?.toLowerCase().includes(queryLower)) score += 50;
        if (market.description?.toLowerCase().includes(queryLower)) score += 50;

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

        // Calculer le market cap d'abord
        const marketCapString = this.calculateEstimatedMarketCap(market.assets);
        const marketCap = this.parseMarketCapToNumber(marketCapString);

        // KPIs plus réalistes
        return {
            total_assets: totalAssets,
            total_submarkets: totalSubmarkets,
            diversity_score: totalAssets > 0 ? Math.min(Math.log(totalAssets + 1) * 20, 100) : 0,
            estimated_market_cap: marketCapString,
            volatility_estimate: this.estimateVolatility(market.assets),
            liquidity_score: this.calculateLiquidityScore(marketCap, totalAssets, totalSubmarkets)
        };
    }

    /**
     * Calcule la capitalisation totale du marché basée sur les asset_histories
     * @param assets - Liste des actifs du marché avec leurs asset_histories
     * @returns string - Capitalisation totale formatée
     */
    private calculateEstimatedMarketCap(assets: any[]): string {
        if (assets.length === 0) return "0";

        let totalMarketCap = 0;

        assets.forEach(asset => {
            // Récupérer le dernier asset_history (le plus récent)
            if (asset.assetHistories && asset.assetHistories.length > 0) {
                const latestHistory = asset.assetHistories[0]; // Premier = plus récent (orderBy desc)
                const currentValue = latestHistory.value || 0;
                const currentVolume = latestHistory.volume || 0;

                // Market cap d'un asset = valeur * volume (ou juste valeur si volume = 1)
                const assetMarketCap = currentValue * Math.max(currentVolume, 1);
                totalMarketCap += assetMarketCap;
            }
        });

        if (totalMarketCap >= 1000000000) {
            return `${(totalMarketCap / 1000000000).toFixed(1)}B`; // Billions
        } else if (totalMarketCap >= 1000000) {
            return `${(totalMarketCap / 1000000).toFixed(1)}M`; // Millions
        } else if (totalMarketCap >= 1000) {
            return `${(totalMarketCap / 1000).toFixed(1)}K`; // Thousands
        } else {
            return `${Math.round(totalMarketCap)}`; // Valeur exacte
        }
    }

    /**
     * Calcule la volatilité du marché basée sur les fluctuations des prix des actifs
     * @param assets - Liste des actifs avec leurs asset_histories
     * @returns string - Volatilité calculée avec seuils
     */
    private estimateVolatility(assets: any[]): string {
        if (assets.length === 0) return "Inconnue";

        const assetVolatilities: number[] = [];

        // Calculer la volatilité de chaque actif
        assets.forEach(asset => {
            if (asset.assetHistories && asset.assetHistories.length >= 2) {
                const volatility = this.calculateAssetVolatility(asset.assetHistories);
                if (volatility !== null) {
                    assetVolatilities.push(volatility);
                }
            }
        });

        if (assetVolatilities.length === 0) return "Inconnue";

        const averageVolatility = assetVolatilities.reduce((sum, vol) => sum + vol, 0) / assetVolatilities.length;

        if (averageVolatility < 10) return "Stable";
        if (averageVolatility < 25) return "Modéré";
        if (averageVolatility < 40) return "Risqué";
        return "Très risqué";
    }

    /**
     * Calcule la volatilité d'un actif basée sur ses asset_histories
     * @param histories - Historiques de l'actif (triés par date décroissante)
     * @returns number | null - Volatilité en pourcentage ou null si insuffisant de données
     */
    private calculateAssetVolatility(histories: any[]): number | null {
        if (histories.length < 2) return null;

        const sortedHistories = histories
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
            .filter(h => h.value && h.value > 0);

        if (sortedHistories.length < 2) return null;

        const returns: number[] = [];
        for (let i = 1; i < sortedHistories.length; i++) {
            const currentPrice = sortedHistories[i].value;
            const previousPrice = sortedHistories[i - 1].value;

            if (previousPrice > 0) {
                const returnRate = ((currentPrice - previousPrice) / previousPrice) * 100;
                returns.push(returnRate);
            }
        }

        if (returns.length === 0) return null;

        const meanReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;

        const variance = returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / returns.length;
        const standardDeviation = Math.sqrt(variance);

        const annualizedVolatility = standardDeviation * Math.sqrt(252);

        return Math.round(annualizedVolatility * 100) / 100;
    }

    /**
     * Parse une chaîne de market cap formatée en nombre
     * @param marketCapString - Market cap formaté (ex: "1.5B", "500M", "2.3K")
     * @returns number - Valeur numérique du market cap
     */
    private parseMarketCapToNumber(marketCapString: string): number {
        if (marketCapString === "0") return 0;

        const match = marketCapString.match(/^(\d+(?:\.\d+)?)([KMB])?$/);
        if (!match || !match[1]) return 0;

        const value = parseFloat(match[1]);
        const suffix = match[2];

        switch (suffix) {
            case 'K': return value * 1000;
            case 'M': return value * 1000000;
            case 'B': return value * 1000000000;
            default: return value;
        }
    }

    /**
     * Calcule un score de liquidité basé sur market cap et diversité
     * @param marketCap - Capitalisation totale du marché
     * @param totalAssets - Nombre d'actifs disponibles
     * @param totalSubmarkets - Nombre de sous-marchés
     * @returns string - Score de liquidité
     */
    private calculateLiquidityScore(marketCap: number, totalAssets: number, totalSubmarkets: number): string {
        if (marketCap === 0 || totalAssets === 0) return "N/A";

        // 1) Densité d'actifs par sous-marché
        const diversity = totalAssets / Math.max(totalSubmarkets, 1);

        // 2) Score brut basé sur taille du marché + diversité
        const liquidityIndex = Math.log10(marketCap + 1) + diversity;

        if (liquidityIndex > 10) return "Élevée";
        if (liquidityIndex > 7) return "Modérée";
        if (liquidityIndex > 4) return "Faible";
        return "Très faible";
    }

    /**
     * Identifie les top actifs d'un marché basés sur leur vraie capitalisation
     * @param assets - Liste des actifs
     * @returns any[] - Top actifs triés par market cap
     */
    private getTopAssets(assets: any[]): any[] {
        if (assets.length === 0) return [];

        // Calculer le market cap réel pour chaque actif
        const assetsWithMarketCap = assets.map(asset => {
            const lastHistory = asset.assetHistories?.[0];
            const currentValue = lastHistory?.value || 0;
            const currentVolume = lastHistory?.volume || 0;

            // Market cap = valeur * volume (ou juste valeur si volume = 1)
            const marketCap = currentValue * Math.max(currentVolume, 1);

            // Score basé sur plusieurs critères
            const score = this.calculateAssetScore(asset, lastHistory);

            return {
                asset,
                marketCap,
                score,
                currentValue,
                currentVolume
            };
        });

        // Trier par market cap (décroissant) - les plus gros actifs en premier
        const sortedAssets = assetsWithMarketCap
            .sort((a, b) => b.marketCap - a.marketCap)
            .slice(0, 5); // Top 5

        // Formater la réponse
        return sortedAssets.map(({ asset, marketCap, score, currentValue, currentVolume }) => {
            const fieldName = this.getAssetFieldName(asset);
            return {
                id: asset.id,
                symbol: asset.symbol,
                title: asset.title,
                market_cap: marketCap,
                current_value: currentValue,
                current_volume: currentVolume,
                performance_score: Math.round(score * 100) / 100,
                category: fieldName || 'Non catégorisé',
                risk_level: this.assessAssetRisk(asset, asset.assetHistories?.[0])
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
        const fieldName = this.getAssetFieldName(asset);

        // Base score sur la catégorie (utilise 'field' du schéma Prisma)
        if (fieldName) {
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
            score += categoryScores[fieldName.toLowerCase()] || 50;
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
        if (!this.hasAssetField(asset)) riskFactors++;

        // Moins d'historiques = plus de risque
        if (!asset.assetHistories || asset.assetHistories.length < 3) riskFactors++;

        // Valeur faible = potentiellement plus de risque
        if (lastHistory && lastHistory.value < 10000) riskFactors++;

        if (riskFactors === 0) return "Faible";
        if (riskFactors === 1) return "Modéré";
        if (riskFactors === 2) return "Élevé";
        return "Très élevé";
    }

    // ===== PHASE 2 : ROUTES AVANCÉES =====

    /**
     * Obtient un snapshot temps réel d'un marché
     * @param marketId - ID du marché
     * @returns any - Snapshot avec données temps réel
     */
    async getSnapshot(marketId: number): Promise<any> {
        const market = await this.prisma.market.findUnique({
            where: { id: marketId },
            include: {
                assets: {
                    include: {
                        field: true,
                        assetHistories: {
                            orderBy: { timestamp: 'desc' },
                            take: 1
                        }
                    }
                },
                submarkets: {
                    include: {
                        assets: {
                            include: {
                                field: true,
                                assetHistories: {
                                    orderBy: { timestamp: 'desc' },
                                    take: 1
                                }
                            }
                        }
                    }
                }
            }
        });

        if (!market) {
            throw new Error(`Marché avec l'ID ${marketId} non trouvé`);
        }

        // Calculer les métriques temps réel
        const realTimeMetrics = this.calculateRealTimeMetrics(market);

        // Détecter les alertes et anomalies
        const alerts = this.detectMarketAlerts(market);

        // Calculer les tendances instantanées
        const trends = this.calculateSimpleTrends(market);

        return {
            market_id: market.id,
            market_name: market.title,
            timestamp: new Date().toISOString(),
            real_time_metrics: realTimeMetrics,
            alerts: alerts,
            trends: trends,
            market_status: this.determineMarketStatus(realTimeMetrics)
        };
    }

    /**
     * Obtient l'historique agrégé d'un marché
     * @param marketId - ID du marché
     * @param from - Date de début
     * @param to - Date de fin
     * @returns any - Historique agrégé
     */
    async getHistory(marketId: number, from: Date, to: Date): Promise<any> {
        // Vérifier que le marché existe
        const market = await this.prisma.market.findUnique({
            where: { id: marketId }
        });

        if (!market) {
            throw new Error(`Marché avec l'ID ${marketId} non trouvé`);
        }

        // Récupérer l'historique des actifs du marché
        const assetHistories = await this.prisma.assetHistory.findMany({
            where: {
                asset: {
                    marketId: marketId
                },
                timestamp: {
                    gte: from,
                    lte: to
                }
            },
            include: {
                asset: {
                    select: {
                        id: true,
                        title: true,
                        symbol: true,
                        field: true
                    }
                }
            },
            orderBy: {
                timestamp: 'asc'
            }
        });

        // Agréger les données par période
        const aggregatedData = this.aggregateHistoricalData(assetHistories, from, to);

        // Calculer les statistiques temporelles
        const temporalStats = this.calculateTemporalStatistics(assetHistories, from, to);

        return {
            market_id: marketId,
            market_name: market.title,
            period: {
                from: from.toISOString(),
                to: to.toISOString()
            },
            aggregated_data: aggregatedData,
            temporal_statistics: temporalStats,
            data_points_count: assetHistories.length
        };
    }

    /**
     * Génère une carte thermique pour un marché
     * @param marketId - ID du marché
     * @param metric - Métrique à visualiser
     * @returns any - Données de la carte thermique
     */
    async getHeatmap(marketId: number, metric: string): Promise<any> {
        const market = await this.prisma.market.findUnique({
            where: { id: marketId },
            include: {
                submarkets: {
                    include: {
                        assets: {
                            include: {
                                field: true,
                                assetHistories: {
                                    orderBy: { timestamp: 'desc' },
                                    take: 1
                                }
                            }
                        }
                    }
                }
            }
        });

        if (!market) {
            throw new Error(`Marché avec l'ID ${marketId} non trouvé`);
        }

        // Valider la métrique demandée
        const validMetrics = ['performance', 'volume', 'volatility', 'risk'];
        if (!validMetrics.includes(metric)) {
            throw new Error(`Métrique invalide. Valeurs acceptées: ${validMetrics.join(', ')}`);
        }

        // Générer la carte thermique selon la métrique
        const heatmapData = this.generateHeatmapData(market, metric);

        return {
            market_id: marketId,
            market_name: market.title,
            metric: metric,
            generated_at: new Date().toISOString(),
            heatmap_data: heatmapData,
            color_scale: this.getColorScaleForMetric(metric),
            interpretation: this.getHeatmapInterpretation(metric, heatmapData)
        };
    }

    // ===== MÉTHODES PRIVÉES POUR LES ROUTES AVANCÉES =====

    /**
     * Calcule les métriques temps réel d'un marché
     * @param market - Marché avec ses relations
     * @returns any - Métriques temps réel
     */
    private calculateRealTimeMetrics(market: any): any {
        const totalAssets = market.assets.length;
        const totalSubmarkets = market.submarkets.length;

        // Calculer la valeur totale du marché
        let totalMarketValue = 0;
        let totalVolume = 0;

        market.assets.forEach((asset: any) => {
            const lastHistory = asset.assetHistories?.[0];
            if (lastHistory) {
                totalMarketValue += lastHistory.value || 0;
                totalVolume += lastHistory.volume || 0;
            }
        });

        return {
            total_market_value: totalMarketValue,
            total_volume: totalVolume,
            total_assets: totalAssets,
            average_asset_value: totalAssets > 0 ? totalMarketValue / totalAssets : 0,
            market_depth: this.calculateMarketDepth(market),
            last_update: new Date().toISOString()
        };
    }

    /**
     * Détecte les alertes et anomalies du marché
     * @param market - Marché à analyser
     * @returns any[] - Liste des alertes
     */
    private detectMarketAlerts(market: any): any[] {
        const alerts: any[] = [];

                        // Dans une simulation, tous les actifs ont des données
        // Pas besoin de vérifier les actifs sans données

        // Vérifier les sous-marchés vides
        const emptySubmarkets = market.submarkets.filter((sub: any) =>
            !sub.assets || sub.assets.length === 0
        );

        if (emptySubmarkets.length > 0) {
            alerts.push({
                type: 'info',
                severity: 'low',
                message: `${emptySubmarkets.length} sous-marchés vides`,
                details: emptySubmarkets.map((s: any) => ({ id: s.id, title: s.title }))
            });
        }

        return alerts;
    }

        /**
     * Calcule les tendances simples du marché
     * @param market - Marché à analyser
     * @returns any - Tendances détectées
     */
    private calculateSimpleTrends(market: any): any {
        const trends = {
            market_summary: this.getMarketSummary(market)
        };

        return trends;
    }

        /**
     * Génère un résumé simple du marché
     * @param market - Marché à analyser
     * @returns any - Résumé du marché
     */
    private getMarketSummary(market: any): any {
        const totalAssets = market.assets.length;
        const totalSubmarkets = market.submarkets?.length || 0;

        return {
            total_assets: totalAssets,
            total_submarkets: totalSubmarkets,
            average_assets_per_submarket: totalSubmarkets > 0 ? Math.round((totalAssets / totalSubmarkets) * 100) / 100 : 0,
            market_structure: this.assessMarketStructure(totalAssets, totalSubmarkets)
        };
    }

            /**
     * Évalue la structure du marché
     * @param totalAssets - Nombre total d'actifs
     * @param totalSubmarkets - Nombre total de sous-marchés
     * @returns string - Évaluation de la structure du marché
     */
    private assessMarketStructure(totalAssets: number, totalSubmarkets: number): string {
        if (totalAssets === 0) return 'Vide';
        if (totalSubmarkets === 0) return 'Non structuré';

        const avgAssetsPerSubmarket = totalAssets / totalSubmarkets;

        if (avgAssetsPerSubmarket >= 20) return 'Très concentré';
        if (avgAssetsPerSubmarket >= 10) return 'Concentré';
        if (avgAssetsPerSubmarket >= 5) return 'Bien équilibré';
        if (avgAssetsPerSubmarket >= 2) return 'Équilibré';
        return 'Dispersé';
    }

    /**
     * Calcule la rotation sectorielle du marché
     * @param market - Marché à analyser
     * @returns any - Analyse de rotation sectorielle
     */
    private calculateSectorRotation(market: any): any {
        // Grouper les actifs par secteur (field)
        const sectorGroups: { [key: string]: any[] } = {};

        market.assets.forEach((asset: any) => {
            const fieldName = this.getAssetFieldName(asset);
            if (fieldName && asset.assetHistories && asset.assetHistories.length > 0) {
                const sector = fieldName.toLowerCase();
                if (!sectorGroups[sector]) {
                    sectorGroups[sector] = [];
                }
                sectorGroups[sector].push(asset);
            }
        });

        // Analyser chaque secteur
        const sectorAnalysis = Object.entries(sectorGroups).map(([sector, assets]) => {
            const totalValue = assets.reduce((sum, asset) => {
                const lastHistory = asset.assetHistories[0];
                return sum + (lastHistory.value || 0);
            }, 0);

            const totalVolume = assets.reduce((sum, asset) => {
                const lastHistory = asset.assetHistories[0];
                return sum + (lastHistory.volume || 0);
            }, 0);

            const avgValue = totalValue / assets.length;
            const avgVolume = totalVolume / assets.length;

            // Déterminer le type de secteur
            const sectorType = this.categorizeSector(sector);

            // Calculer le momentum du secteur
            const momentum = this.calculateSectorMomentum(assets);

            return {
                sector_name: sector,
                sector_type: sectorType,
                asset_count: assets.length,
                total_value: totalValue,
                total_volume: totalVolume,
                average_value: Math.round(avgValue),
                average_volume: Math.round(avgVolume),
                market_share: 0, // Sera calculé après
                momentum: momentum,
                rotation_signal: this.getRotationSignal(sectorType, momentum)
            };
        });

        // Calculer la part de marché de chaque secteur
        const totalMarketValue = sectorAnalysis.reduce((sum, sector) => sum + sector.total_value, 0);
        sectorAnalysis.forEach(sector => {
            sector.market_share = totalMarketValue > 0 ? Math.round((sector.total_value / totalMarketValue) * 100 * 100) / 100 : 0;
        });

        // Trier par performance (momentum)
        sectorAnalysis.sort((a, b) => b.momentum - a.momentum);

        // Identifier les secteurs en rotation
        const rotationInsights = this.analyzeRotationPatterns(sectorAnalysis);

        return {
            sectors: sectorAnalysis,
            rotation_insights: rotationInsights,
            market_phase: this.determineMarketPhase(sectorAnalysis),
            recommended_actions: this.getRecommendedActions(rotationInsights)
        };
    }

    /**
     * Catégorise un secteur selon son comportement économique
     * @param sector - Nom du secteur
     * @returns string - Type de secteur
     */
    private categorizeSector(sector: string): string {
        const sectorCategories: { [key: string]: string } = {
            // Secteurs de croissance (performants en expansion)
            'tech': 'growth',
            'ai': 'growth',
            'biotech': 'growth',
            'software': 'growth',
            'cloud': 'growth',

            // Secteurs cycliques (sensibles à l'économie)
            'industrial': 'cyclical',
            'materials': 'cyclical',
            'energy': 'cyclical',
            'automotive': 'cyclical',
            'construction': 'cyclical',

            // Secteurs défensifs (stables en récession)
            'utilities': 'defensive',
            'healthcare': 'defensive',
            'consumer': 'defensive',
            'food': 'defensive',
            'pharmaceuticals': 'defensive',

            // Secteurs financiers (sensibles aux taux)
            'finance': 'financial',
            'banking': 'financial',
            'insurance': 'financial',
            'real_estate': 'financial',

            // Secteurs spéculatifs (volatils)
            'crypto': 'speculative',
            'gaming': 'speculative',
            'entertainment': 'speculative'
        };

        return sectorCategories[sector] || 'other';
    }

    /**
     * Calcule le momentum d'un secteur
     * @param assets - Actifs du secteur
     * @returns number - Score de momentum (-100 à +100)
     */
    private calculateSectorMomentum(assets: any[]): number {
        if (assets.length === 0) return 0;

        let momentumScore = 0;
        let validAssets = 0;

        assets.forEach(asset => {
            if (asset.assetHistories && asset.assetHistories.length >= 2) {
                const recentHistory = asset.assetHistories.slice(0, 2);
                const currentValue = recentHistory[0].value || 0;
                const previousValue = recentHistory[1].value || 0;

                if (previousValue > 0) {
                    const changePercent = ((currentValue - previousValue) / previousValue) * 100;

                    // Score basé sur le changement de valeur
                    if (changePercent > 10) momentumScore += 20;        // Forte hausse
                    else if (changePercent > 5) momentumScore += 10;    // Hausse modérée
                    else if (changePercent > 0) momentumScore += 5;     // Légère hausse
                    else if (changePercent > -5) momentumScore += 0;    // Stable
                    else if (changePercent > -10) momentumScore -= 10;  // Baisse modérée
                    else momentumScore -= 20;                           // Forte baisse

                    validAssets++;
                }
            }
        });

        return validAssets > 0 ? Math.round(momentumScore / validAssets) : 0;
    }

    /**
     * Génère un signal de rotation pour un secteur
     * @param sectorType - Type de secteur
     * @param momentum - Momentum du secteur
     * @returns string - Signal de rotation
     */
    private getRotationSignal(sectorType: string, momentum: number): string {
        if (momentum >= 15) return 'strong_buy';      // Fort achat
        if (momentum >= 5) return 'buy';              // Achat
        if (momentum >= -5) return 'hold';            // Maintenir
        if (momentum >= -15) return 'sell';           // Vendre
        return 'strong_sell';                         // Forte vente
    }

    /**
     * Analyse les patterns de rotation sectorielle
     * @param sectors - Analyse des secteurs
     * @returns any - Insights de rotation
     */
    private analyzeRotationPatterns(sectors: any[]): any {
        const growthSectors = sectors.filter(s => s.sector_type === 'growth');
        const cyclicalSectors = sectors.filter(s => s.sector_type === 'cyclical');
        const defensiveSectors = sectors.filter(s => s.sector_type === 'defensive');

        const avgGrowthMomentum = growthSectors.length > 0 ?
            growthSectors.reduce((sum, s) => sum + s.momentum, 0) / growthSectors.length : 0;

        const avgCyclicalMomentum = cyclicalSectors.length > 0 ?
            cyclicalSectors.reduce((sum, s) => sum + s.momentum, 0) / cyclicalSectors.length : 0;

        const avgDefensiveMomentum = defensiveSectors.length > 0 ?
            defensiveSectors.reduce((sum, s) => sum + s.momentum, 0) / defensiveSectors.length : 0;

        return {
            growth_momentum: Math.round(avgGrowthMomentum),
            cyclical_momentum: Math.round(avgCyclicalMomentum),
            defensive_momentum: Math.round(avgDefensiveMomentum),
            rotation_trend: this.determineRotationTrend(avgGrowthMomentum, avgCyclicalMomentum, avgDefensiveMomentum),
            leading_sector: this.findLeadingSector(sectors),
            lagging_sector: this.findLaggingSector(sectors)
        };
    }

    /**
     * Détermine la tendance de rotation
     * @param growth - Momentum des secteurs de croissance
     * @param cyclical - Momentum des secteurs cycliques
     * @param defensive - Momentum des secteurs défensifs
     * @returns string - Tendance de rotation
     */
    private determineRotationTrend(growth: number, cyclical: number, defensive: number): string {
        if (growth > cyclical && growth > defensive) {
            return 'growth_leadership';        // Leadership de la croissance
        } else if (cyclical > growth && cyclical > defensive) {
            return 'cyclical_rotation';        // Rotation vers les cycliques
        } else if (defensive > growth && defensive > cyclical) {
            return 'defensive_rotation';       // Rotation défensive
        } else if (growth < 0 && cyclical < 0 && defensive < 0) {
            return 'market_contraction';       // Contraction du marché
        } else {
            return 'mixed_signals';            // Signaux mixtes
        }
    }

    /**
     * Trouve le secteur leader
     * @param sectors - Analyse des secteurs
     * @returns string - Secteur leader
     */
    private findLeadingSector(sectors: any[]): string {
        if (sectors.length === 0) return 'none';
        return sectors[0].sector_name;
    }

    /**
     * Trouve le secteur en retard
     * @param sectors - Analyse des secteurs
     * @returns string - Secteur en retard
     */
    private findLaggingSector(sectors: any[]): string {
        if (sectors.length === 0) return 'none';
        return sectors[sectors.length - 1].sector_name;
    }

    /**
     * Détermine la phase du marché
     * @param sectors - Analyse des secteurs
     * @returns string - Phase du marché
     */
    private determineMarketPhase(sectors: any[]): string {
        const avgMomentum = sectors.reduce((sum, s) => sum + s.momentum, 0) / sectors.length;

        if (avgMomentum >= 10) return 'expansion';           // Phase d'expansion
        if (avgMomentum >= 0) return 'growth';               // Phase de croissance
        if (avgMomentum >= -10) return 'consolidation';      // Phase de consolidation
        if (avgMomentum >= -20) return 'contraction';        // Phase de contraction
        return 'recession';                                   // Phase de récession
    }

    /**
     * Génère des actions recommandées basées sur la rotation
     * @param insights - Insights de rotation
     * @returns string[] - Actions recommandées
     */
    private getRecommendedActions(insights: any): string[] {
        const actions: string[] = [];

        switch (insights.rotation_trend) {
            case 'growth_leadership':
                actions.push('Privilégier les secteurs de croissance (Tech, Biotech)');
                actions.push('Maintenir l\'exposition aux cycliques');
                actions.push('Réduire l\'exposition défensive');
                break;

            case 'cyclical_rotation':
                actions.push('Augmenter l\'exposition aux secteurs cycliques');
                actions.push('Maintenir une position équilibrée');
                actions.push('Surveiller les indicateurs économiques');
                break;

            case 'defensive_rotation':
                actions.push('Augmenter l\'exposition défensive');
                actions.push('Réduire l\'exposition aux cycliques');
                actions.push('Privilégier la stabilité');
                break;

            case 'market_contraction':
                actions.push('Réduire l\'exposition au marché');
                actions.push('Augmenter la liquidité');
                actions.push('Privilégier les actifs défensifs');
                break;

            default:
                actions.push('Maintenir une allocation équilibrée');
                actions.push('Surveiller les signaux de rotation');
                break;
        }

        return actions;
    }

            /**
     * Détermine le statut global du marché
     * @param metrics - Métriques temps réel
     * @returns string - Statut du marché
     */
    private determineMarketStatus(metrics: any): string {
        const totalAssets = metrics.total_assets || 0;
        const totalValue = metrics.total_market_value || 0;

        if (totalAssets === 0) return 'Vide';
        if (totalValue === 0) return 'Sans valeur';

        const avgValue = totalValue / totalAssets;

        if (avgValue >= 100000000) return 'Très performant';  // 100M+ par actif
        if (avgValue >= 50000000) return 'Performant';        // 50M+ par actif
        if (avgValue >= 10000000) return 'Modéré';            // 10M+ par actif
        if (avgValue >= 1000000) return 'En développement';  // 1M+ par actif
        return 'Émergent';                                    // < 1M par actif
    }

    /**
     * Calcule la profondeur du marché
     * @param market - Marché à analyser
     * @returns string - Profondeur du marché
     */
    private calculateMarketDepth(market: any): any {
        const totalAssets = market.assets.length;
        const totalSubmarkets = market.submarkets.length;

        if (totalAssets >= 100 && totalSubmarkets >= 10) return 'Très profonde';
        if (totalAssets >= 50 && totalSubmarkets >= 5) return 'Profonde';
        if (totalAssets >= 20 && totalSubmarkets >= 3) return 'Modérée';
        if (totalAssets >= 10 && totalSubmarkets >= 2) return 'Faible';
        return 'Très faible';
    }

    /**
     * Agrège les données historiques par période
     * @param histories - Historiques des actifs
     * @param from - Date de début
     * @param to - Date de fin
     * @returns any - Données agrégées
     */
    private aggregateHistoricalData(histories: any[], from: Date, to: Date): any {
        // Grouper par jour
        const dailyData: { [key: string]: any } = {};

        histories.forEach(history => {
            const dateKey = history.timestamp.toISOString().split('T')[0];

            if (!dailyData[dateKey]) {
                dailyData[dateKey] = {
                    date: dateKey,
                    total_value: 0,
                    total_volume: 0,
                    asset_count: 0,
                    transactions: []
                };
            }

            dailyData[dateKey].total_value += history.value || 0;
            dailyData[dateKey].total_volume += history.volume || 0;
            dailyData[dateKey].asset_count++;
            dailyData[dateKey].transactions.push({
                asset_id: history.asset.id,
                asset_symbol: history.asset.symbol,
                    value: history.value,
                    volume: history.volume
                });
        });

        return Object.values(dailyData);
    }

    /**
     * Calcule les statistiques temporelles
     * @param histories - Historiques des actifs
     * @param from - Date de début
     * @param to - Date de fin
 * @returns any - Statistiques temporelles
     */
    private calculateTemporalStatistics(histories: any[], from: Date, to: Date): any {
        if (histories.length === 0) {
            return {
                total_periods: 0,
                average_daily_value: 0,
                average_daily_volume: 0,
                volatility: 0,
                trend_direction: 'stable'
            };
        }

        const values = histories.map(h => h.value || 0).filter(v => v > 0);
        const volumes = histories.map(h => h.volume || 0).filter(v => v > 0);

        const avgValue = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
        const avgVolume = volumes.length > 0 ? volumes.reduce((a, b) => a + b, 0) / volumes.length : 0;

        // Calculer la volatilité (écart-type)
        const valueVariance = values.length > 0 ?
            values.reduce((sum, val) => sum + Math.pow(val - avgValue, 2), 0) / values.length : 0;
        const volatility = Math.sqrt(valueVariance);

        return {
            total_periods: histories.length,
            average_daily_value: Math.round(avgValue),
            average_daily_volume: Math.round(avgVolume),
            volatility: Math.round(volatility),
            trend_direction: this.determineTrendDirection(histories)
        };
    }

    /**
     * Détermine la direction de la tendance
     * @param histories - Historiques des actifs
     * @returns any - Direction de la tendance
     */
    private determineTrendDirection(histories: any[]): string {
        if (histories.length < 2) return 'stable';

        const sortedHistories = histories.sort((a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        const firstValue = sortedHistories[0].value || 0;
        const lastValue = sortedHistories[sortedHistories.length - 1].value || 0;
        const change = lastValue - firstValue;
        const changePercent = firstValue > 0 ? (change / firstValue) * 100 : 0;

        if (changePercent > 5) return 'hausse';
        if (changePercent < -5) return 'baisse';
        return 'stable';
    }

    /**
     * Génère les données de la carte thermique
     * @param market - Marché à analyser
     * @param metric - Métrique à visualiser
     * @returns any - Données de la carte thermique
     */
    private generateHeatmapData(market: any, metric: string): any {
        const heatmapData: any[] = [];

        market.submarkets.forEach((submarket: any) => {
            const submarketData = {
                submarket_id: submarket.id,
                submarket_name: submarket.title,
                intensity: 0,
                assets: [] as any[]
            };

            submarket.assets.forEach((asset: any) => {
                if (asset.assetHistories && asset.assetHistories.length > 0) {
                    const lastHistory = asset.assetHistories[0];
                    let intensity = 0;

                    switch (metric) {
                        case 'performance':
                            intensity = this.calculatePerformanceIntensity(lastHistory.value || 0);
                            break;
                        case 'volume':
                            intensity = this.calculateVolumeIntensity(lastHistory.volume || 0);
                            break;
                        case 'volatility':
                            intensity = this.calculateVolatilityIntensity(asset);
                            break;
                        case 'risk':
                            intensity = this.calculateRiskIntensity(asset);
                            break;
                    }

                    submarketData.intensity = Math.max(submarketData.intensity, intensity);
                    submarketData.assets.push({
                        asset_id: asset.id,
                        asset_symbol: asset.symbol,
                        intensity: intensity,
                        value: lastHistory.value || 0,
                        volume: lastHistory.volume || 0
                    });
                }
            });

            heatmapData.push(submarketData);
        });

        return heatmapData;
    }

    /**
     * Calcule l'intensité de performance
     * @param value - Valeur de l'actif
     * @returns number - Intensité (0-100)
     */
    private calculatePerformanceIntensity(value: number): number {
        if (value >= 1000000) return 100;      // Très haute performance
        if (value >= 500000) return 80;        // Haute performance
        if (value >= 100000) return 60;        // Performance moyenne
        if (value >= 10000) return 40;         // Performance faible
        return 20;                             // Très faible performance
    }

    /**
     * Calcule l'intensité de volume
     * @param volume - Volume de l'actif
     * @returns number - Intensité (0-100)
     */
    private calculateVolumeIntensity(volume: number): number {
        if (volume >= 1000000) return 100;     // Très haute liquidité
        if (volume >= 500000) return 80;       // Haute liquidité
        if (volume >= 100000) return 60;       // Liquidité moyenne
        if (volume >= 10000) return 40;        // Liquidité faible
        return 20;                             // Très faible liquidité
    }

    /**
     * Calcule l'intensité de volatilité
     * @param asset - Actif à analyser
     * @returns number - Intensité (0-100)
     */
    private calculateVolatilityIntensity(asset: any): number {
        if (!asset.assetHistories || asset.assetHistories.length < 2) return 50;

        const values = asset.assetHistories
            .slice(0, 5) // Derniers 5 points
            .map((h: any) => h.value || 0)
            .filter((v: number) => v > 0);

        if (values.length < 2) return 50;

        const avg = values.reduce((a: number, b: number) => a + b, 0) / values.length;
        const variance = values.reduce((sum: number, val: number) => sum + Math.pow(val - avg, 2), 0) / values.length;
        const stdDev = Math.sqrt(variance);
        const coefficient = avg > 0 ? (stdDev / avg) * 100 : 0;

        if (coefficient > 50) return 100;      // Très volatile
        if (coefficient > 30) return 80;       // Volatile
        if (coefficient > 15) return 60;       // Modérément volatile
        if (coefficient > 5) return 40;        // Peu volatile
        return 20;                             // Très stable
    }

    /**
     * Calcule l'intensité de risque
     * @param asset - Actif à analyser
     * @returns number - Intensité (0-100)
     */
    private calculateRiskIntensity(asset: any): number {
        let riskScore = 0;

        // Pas de catégorie = plus de risque
        if (!this.hasAssetField(asset)) riskScore += 30;

        // Peu d'historiques = plus de risque
        if (!asset.assetHistories || asset.assetHistories.length < 3) riskScore += 25;

        // Valeur faible = potentiellement plus de risque
        if (asset.assetHistories && asset.assetHistories.length > 0) {
            const lastValue = asset.assetHistories[0].value || 0;
            if (lastValue < 10000) riskScore += 25;
            if (lastValue < 100000) riskScore += 15;
        }

        return Math.min(riskScore, 100);
    }

    /**
     * Récupère le nom du champ associé à un actif (compatibilité string ou relation)
     * @param asset - Actif à inspecter
     * @returns string | null - Nom du champ ou null
     */
    private getAssetFieldName(asset: any): string | null {
        if (!asset) return null;
        if (typeof asset.field === 'string') {
            return asset.field;
        }
        if (asset.field && typeof asset.field === 'object' && 'name' in asset.field) {
            return asset.field.name ?? null;
        }
        return null;
    }

    /**
     * Indique si un actif est rattaché à un champ
     * @param asset - Actif à inspecter
     * @returns boolean
     */
    private hasAssetField(asset: any): boolean {
        return Boolean(this.getAssetFieldName(asset) ?? asset.fieldId);
    }

    /**
     * Obtient l'échelle de couleurs pour une métrique
     * @param metric - Métrique à visualiser
     * @returns any - Échelle de couleurs
     */
    private getColorScaleForMetric(metric: string): any {
        const colorScales = {
            performance: {
                low: '#ff4444',      // Rouge pour faible performance
                medium: '#ffaa00',   // Orange pour performance moyenne
                high: '#00ff00'      // Vert pour haute performance
            },
            volume: {
                low: '#4444ff',      // Bleu pour faible volume
                medium: '#00aaff',   // Bleu clair pour volume moyen
                high: '#00ffff'      // Cyan pour haut volume
            },
            volatility: {
                low: '#00ff00',      // Vert pour faible volatilité
                medium: '#ffff00',   // Jaune pour volatilité moyenne
                high: '#ff0000'      // Rouge pour haute volatilité

            },
            risk: {
                low: '#00ff00',      // Vert pour faible risque
                medium: '#ffff00',   // Jaune pour risque moyen
                high: '#ff0000'      // Rouge pour haut risque
            }
        };

        return colorScales[metric as keyof typeof colorScales] || colorScales.performance;
    }

    /**
     * Obtient l'interprétation de la carte thermique
     * @param metric - Métrique visualisée
     * @param data - Données de la carte thermique
     * @returns string - Interprétation
     */
    private getHeatmapInterpretation(metric: string, data: any[]): string {
        const avgIntensity = data.reduce((sum, item) => sum + item.intensity, 0) / data.length;

        switch (metric) {
            case 'performance':
                if (avgIntensity >= 80) return 'Marché très performant avec de nombreux actifs de haute valeur';
                if (avgIntensity >= 60) return 'Marché performant avec une bonne diversité de valeurs';
                if (avgIntensity >= 40) return 'Marché modérément performant avec des actifs de valeur moyenne';
                return 'Marché en développement avec des actifs de faible valeur';

            case 'volume':
                if (avgIntensity >= 80) return 'Marché très liquide avec un volume de trading élevé';
                if (avgIntensity >= 60) return 'Marché liquide avec un bon volume de trading';
                if (avgIntensity >= 40) return 'Marché modérément liquide';
                return 'Marché peu liquide avec un faible volume de trading';

            case 'volatility':
                if (avgIntensity >= 80) return 'Marché très volatile, attention aux risques';
                if (avgIntensity >= 60) return 'Marché volatile avec des opportunités et des risques';
                if (avgIntensity >= 40) return 'Marché modérément volatile';
                return 'Marché stable avec peu de volatilité';

            case 'risk':
                if (avgIntensity >= 80) return 'Marché à haut risque, prudence recommandée';
                if (avgIntensity >= 60) return 'Marché à risque modéré';
                if (avgIntensity >= 40) return 'Marché à faible risque';
                return 'Marché très sûr avec des actifs stables';

            default:
                return 'Interprétation non disponible pour cette métrique';
        }
    }
}
