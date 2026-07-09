// Service métier pour la gestion de l'historique des actifs du jeu
// Couche d'abstraction entre les routers et la base de données
// Import depuis @cashou/db-app (et non @prisma/client) car Bun crée des copies séparées
// de @prisma/client par contexte de résolution, ce qui cause des types incompatibles
import type { AssetHistory, PrismaClient } from "@cashou/db-app";
import defaultPrisma from "../../database.ts";
import type {AssetHistoryCreateSchema, AssetHistoryDataSchema} from "../schemas-zod/asset-history-schema.ts";
import { gameCache, cached } from "../../lib/cache.ts";
import { impactCoefForAsset } from "../../lib/interest.ts";

export class AssetHistoryService {
    private prisma: PrismaClient;

    // Permet d'injecter Prisma pour les tests
    constructor(prismaClient?: PrismaClient) {
        this.prisma = prismaClient || defaultPrisma;
    }

    /**
     * Récupère tout l'historique des actifs avec leurs relations
     * @returns Promise<AssetHistory[]> - Liste complète de l'historique triée par timestamp décroissant
     */
    async findAll(): Promise<AssetHistory[]> {
        return this.prisma.assetHistory.findMany({
            include: {
                // Inclut l'actif parent
                asset: true
            },
            orderBy: { timestamp: 'desc' }, // Tri par timestamp décroissant (plus récent en premier)
        });
    }

    /**
     * Récupère un historique d'actif spécifique par son ID
     * @param id - Identifiant unique de l'historique
     * @returns Promise<AssetHistory | null> - L'historique trouvé ou null si inexistant
     */
    async findOne(id: number): Promise<AssetHistory | null> {
        return this.prisma.assetHistory.findUnique({
            where: { id },
            include: {
                // Même structure que findAll pour la cohérence des données
                asset: true
            }
        });
    }

    /**
     * Récupère tout l'historique d'un actif spécifique
     * @param assetId - Identifiant de l'actif parent
     * @returns Promise<AssetHistory[]> - Liste de l'historique de l'actif
     */
    async findByAssetId(assetId: number): Promise<AssetHistory[]> {
        return this.prisma.assetHistory.findMany({
            where: { assetId },
            include: {
                // asset: true,  // Supprimé car redondant - on connaît déjà l'assetId
            },
            orderBy: { timestamp: 'desc' }
        });
    }

    /**
     * Récupère l'historique d'un actif dans une période donnée
     * @param assetId - Identifiant de l'actif
     * @param startDate - Date de début de la période
     * @param endDate - Date de fin de la période
     * @returns Promise<AssetHistory[]> - Liste de l'historique dans la période
     */
    async findByAssetIdAndPeriod(assetId: number, startDate: Date, endDate: Date): Promise<AssetHistory[]> {
        return this.prisma.assetHistory.findMany({
            where: {
                assetId,
                timestamp: {
                    gte: startDate,
                    lte: endDate
                }
            },
            orderBy: { timestamp: 'desc' }
        });
    }

    /**
     * Récupère la valeur la plus récente d'un actif
     * @param assetId - Identifiant de l'actif
     * @returns Promise<AssetHistory | null> - L'historique le plus récent
     */
    async findLatestByAssetId(assetId: number): Promise<AssetHistory | null> {
        return this.prisma.assetHistory.findFirst({
            where: { assetId },
            orderBy: { timestamp: 'desc' }
        });
    }

    /**
     * Retrieve asset history for a game, with event coefs applied on-the-fly.
     *
     * Returns: past history (before game start) + game history up to current day.
     * Event impacts are applied progressively (5-day transition) without modifying DB.
     * All players on the same level see the same prices.
     */
    async findForGame(assetId: number, gameInstanceId: number) {
        const cacheKey = `assetHistory:${assetId}:${gameInstanceId}`;
        return cached(gameCache, cacheKey, () => this._findForGameUncached(assetId, gameInstanceId));
    }

    private async _findForGameUncached(assetId: number, gameInstanceId: number) {
        // Load game instance with level + level events + impacts
        const gameInstance = await this.prisma.gameInstance.findUnique({
            where: { id: gameInstanceId },
            include: {
                level: {
                    include: {
                        levelEvents: {
                            include: {
                                event: {
                                    include: { impacts: true }
                                }
                            },
                            orderBy: { position: 'asc' as const }
                        }
                    }
                }
            },
        });

        if (!gameInstance || !gameInstance.level) {
            return [];
        }

        // Asset's field/submarket — needed to resolve sector-wide impacts
        // (impacts targeting a fieldId + submarketId rather than a single assetId).
        const asset = await this.prisma.asset.findUnique({
            where: { id: assetId },
            select: { id: true, fieldId: true, submarketId: true },
        });

        const level = gameInstance.level;
        const speed = level.speed ?? 1;
        const duration = level.duration ?? 365;
        const historyStartDay = level.historyStartDay ?? 0;

        // Calculate current game day
        // If game is paused without pausedAt and not ended (e.g. created in preparation mode), game day = 0
        let currentGameDay = 0;
        if (gameInstance.isPaused && !gameInstance.pausedAt && !gameInstance.isEnded) {
            currentGameDay = 0;
        } else {
            const now = gameInstance.isEnded && gameInstance.endedAt
                ? gameInstance.endedAt.getTime()
                : gameInstance.isPaused && gameInstance.pausedAt
                    ? gameInstance.pausedAt.getTime()
                    : Date.now();
            const elapsedMs = now - gameInstance.createdAt.getTime();
            const elapsedRealSeconds = Math.max(0, elapsedMs / 1000 - (gameInstance.totalPausedDuration ?? 0));
            currentGameDay = Math.min(
                duration,
                Math.floor((elapsedRealSeconds * speed) / 86400)
            );
        }

        // Total days to fetch: all past history + game days played so far
        const lastDayIndex = historyStartDay + currentGameDay;

        // Fetch raw DB data from day 0 to lastDayIndex
        const rawHistory = await this.prisma.assetHistory.findMany({
            where: { assetId },
            orderBy: { timestamp: 'asc' },
            take: lastDayIndex + 1,
        });

        if (rawHistory.length === 0) return [];

        // Build event timeline: when does each event trigger (as day index in history)?
        const TRANSITION_DAYS = 3;
        const eventImpacts: { historyDay: number; coef: number }[] = [];

        for (const le of level.levelEvents) {
            const eventGameDay = Math.floor(duration * (le.triggerPercent / 100));
            const eventHistoryDay = historyStartDay + eventGameDay;

            // An event may carry several impacts touching this asset, either
            // asset-specific (assetId) or sector-wide (fieldId + submarketId).
            // Only PRICE impacts touch the price curve; RATE impacts are handled
            // separately by getRateImpacts() (they modify the annual rate, not the price).
            if (!asset) continue;
            const priceImpacts = le.event.impacts.filter(
                (imp) => imp.impactType !== "RATE"
            );
            const eventCoef = impactCoefForAsset(priceImpacts, asset);
            if (eventCoef != null) {
                eventImpacts.push({ historyDay: eventHistoryDay, coef: eventCoef });
            }
        }

        // Apply coefs on-the-fly to the returned data
        // Past history (before historyStartDay) is untouched.
        // Game history has coefs applied progressively.
        const result = rawHistory.map((point: AssetHistory, dayIndex: number) => {
            if (dayIndex < historyStartDay || !point.value) {
                return point; // Past history — raw DB values
            }

            // Calculate cumulative coef at this day
            let cumulativeCoef = 1.0;
            for (const evt of eventImpacts) {
                if (dayIndex >= evt.historyDay + TRANSITION_DAYS) {
                    // Fully applied
                    cumulativeCoef *= evt.coef;
                } else if (dayIndex >= evt.historyDay) {
                    // Transitioning: linear interpolation over TRANSITION_DAYS
                    const progress = (dayIndex - evt.historyDay) / TRANSITION_DAYS;
                    const partialCoef = 1 + (evt.coef - 1) * progress;
                    cumulativeCoef *= partialCoef;
                }
                // else: event hasn't happened yet, no impact
            }

            if (cumulativeCoef === 1.0) return point;

            // Return modified point WITHOUT changing DB
            const rawValue = Number(point.value);
            return {
                ...point,
                value: Math.round(rawValue * cumulativeCoef),
            };
        });

        return result;
    }

    /**
     * Get the current virtual price of an asset in a game (DB price × cumulative coefs).
     * Used by buy/sell operations.
     */
    async getCurrentPrice(assetId: number, gameInstanceId: number): Promise<number | null> {
        const cacheKey = `assetPrice:${assetId}:${gameInstanceId}`;
        return cached(gameCache, cacheKey, async () => {
            const history = await this.findForGame(assetId, gameInstanceId);
            if (history.length === 0) return null;
            const lastPoint = history[history.length - 1];
            return lastPoint.value ? Number(lastPoint.value) : null;
        });
    }

    /**
     * Get current price + daily change % for an asset in a game context.
     * Returns both values in a single call to avoid N+1 queries.
     */
    async getCurrentPriceWithChange(assetId: number, gameInstanceId: number): Promise<{ price: number; changePct: number } | null> {
        const history = await this.findForGame(assetId, gameInstanceId);
        if (history.length === 0) return null;
        const lastPoint = history[history.length - 1];
        const price = lastPoint.value ? Number(lastPoint.value) : null;
        if (price == null) return null;

        let changePct = 0;
        if (history.length >= 2) {
            const prevPoint = history[history.length - 2];
            const prevPrice = prevPoint.value ? Number(prevPoint.value) : price;
            if (prevPrice > 0) {
                changePct = ((price - prevPrice) / prevPrice) * 100;
            }
        }
        return { price, changePct };
    }

    /**
     * Build the interest-rate timeline for an asset in a given game.
     *
     * Mirrors the price-impact logic of findForGame() but for RATE impacts:
     * each event with a RATE impact on this asset multiplies the annual rate by its
     * coef, anchored on the same game-day the event triggers
     * (eventGameDay = floor(duration × triggerPercent / 100)).
     *
     * Nothing is mutated — Asset.rate stays global and untouched; the effective rate
     * is recomputed per game instance at read time, exactly like prices.
     *
     * @returns rate changes sorted by changeGameDay (cumulative: each newRate is the
     *          rate in effect from that game-day onward)
     */
    async getRateImpacts(
        assetId: number,
        gameInstanceId: number
    ): Promise<{ changeGameDay: number; newRate: number }[]> {
        const gameInstance = await this.prisma.gameInstance.findUnique({
            where: { id: gameInstanceId },
            include: {
                level: {
                    include: {
                        levelEvents: {
                            include: { event: { include: { impacts: true } } },
                            orderBy: { position: "asc" as const },
                        },
                    },
                },
            },
        });

        if (!gameInstance?.level) return [];

        const asset = await this.prisma.asset.findUnique({
            where: { id: assetId },
            select: { rate: true },
        });
        if (asset?.rate == null) return [];

        const duration = gameInstance.level.duration ?? 365;

        // Collect (changeGameDay, coef) pairs for RATE impacts on this asset
        const changes: { changeGameDay: number; coef: number }[] = [];
        for (const le of gameInstance.level.levelEvents) {
            const impact = le.event.impacts.find(
                (imp) => imp.assetId === assetId && imp.impactType === "RATE"
            );
            if (impact?.coef != null) {
                changes.push({
                    changeGameDay: Math.floor(duration * (le.triggerPercent / 100)),
                    coef: impact.coef,
                });
            }
        }

        // Resolve cumulative rates (rounded to 2 decimals, e.g. 1.7 × 0.882 ≈ 1.50)
        changes.sort((a, b) => a.changeGameDay - b.changeGameDay);
        let runningRate = asset.rate;
        return changes.map((c) => {
            runningRate = Math.round(runningRate * c.coef * 100) / 100;
            return { changeGameDay: c.changeGameDay, newRate: runningRate };
        });
    }

    /**
     * Piecewise rate-based interest for a holding when the annual rate changes mid-game.
     *
     * Integrates the daily rate over [acquisitionGameDay, currentGameDay], switching rate
     * at each change so interest already accrued before a rate cut keeps the old rate
     * (the rate is never applied retroactively).
     *
     * interest = quantity × Σ_segment (rate/100/365 × daysInSegment)
     */
    static computeRateInterest(params: {
        quantity: number;
        baseRate: number;
        rateChanges: { changeGameDay: number; newRate: number }[];
        acquisitionGameDay: number;
        currentGameDay: number;
    }): number {
        const { quantity, baseRate, rateChanges, acquisitionGameDay, currentGameDay } = params;
        if (currentGameDay <= acquisitionGameDay || quantity <= 0) return 0;

        // Rate in effect at the moment of acquisition (any change at/before that day applies)
        let currentRate = baseRate;
        for (const c of rateChanges) {
            if (c.changeGameDay <= acquisitionGameDay) currentRate = c.newRate;
        }

        let interest = 0;
        let segStart = acquisitionGameDay;
        for (const c of rateChanges) {
            if (c.changeGameDay <= acquisitionGameDay) continue; // already folded in
            if (c.changeGameDay >= currentGameDay) break; // not reached yet
            interest += quantity * (currentRate / 100 / 365) * (c.changeGameDay - segStart);
            segStart = c.changeGameDay;
            currentRate = c.newRate;
        }
        // Final segment up to "now"
        interest += quantity * (currentRate / 100 / 365) * (currentGameDay - segStart);

        return Math.max(0, interest);
    }

    /**
     * Crée un nouvel historique d'actif
     * @param data - Données de l'historique validées par le schéma Zod
     * @returns Promise<AssetHistory> - L'historique créé avec son ID généré
     */
    async create(data: AssetHistoryCreateSchema): Promise<AssetHistory> {
        return this.prisma.assetHistory.create({ data });
    }

    /**
     * Met à jour un historique d'actif existant
     * @param id - Identifiant de l'historique à modifier
     * @param data - Nouvelles données validées par le schéma Zod
     * @returns Promise<AssetHistory> - L'historique mis à jour
     */
    async update(id: number, data: AssetHistoryDataSchema): Promise<AssetHistory> {
        return this.prisma.assetHistory.update({
            where: { id },
            data
        });
    }

    /**
     * Supprime un historique d'actif
     * @param id - Identifiant de l'historique à supprimer
     * @returns Promise<AssetHistory> - L'historique supprimé (pour confirmation)
     */
    async delete(id: number): Promise<AssetHistory> {
        return this.prisma.assetHistory.delete({ where: { id } });
    }
}
