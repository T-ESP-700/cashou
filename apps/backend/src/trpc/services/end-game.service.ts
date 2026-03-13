/**
 * Service de fin de partie
 * Gère la liquidation des assets et la validation des objectifs
 */
import type { PrismaClient, Holding, Asset, Level, GameInstance } from "@cashou/db-app";
import defaultPrisma from "../../database.ts";
import { GameTimeService } from "./game-time.service.ts";
import { LevelCompletionService } from "./level-completion.service.ts";
import { AssetHistoryService } from "./asset-history.service.ts";

type HoldingWithAsset = Holding & {
    asset: Asset;
};

type GameInstanceWithLevel = GameInstance & {
    level: Level | null;
};

export interface GoalResult {
    id: number;
    title: string;
    description: string | null;
    isMandatory: boolean;
    validated: boolean;
}

export type EndGameModalType =
    | "PRIMARY_AND_SECONDARY_SUCCESS"
    | "PRIMARY_SUCCESS_ONLY"
    | "PRIMARY_FAILURE";

export interface EndGameModalContent {
    type: EndGameModalType;
    title: string;
    primaryMessage: string;
    secondaryMessage: string | null;
}

export interface EndGameResult {
    success: boolean;
    gameInstanceId: number;
    startBalance: number;
    walletBalance: number;
    assetsValue: number;
    totalValue: number;
    goals: GoalResult[];
    message: string;
    modal: EndGameModalContent;
    /** Level completion score (1-3 stars), set when completion was recorded */
    stars?: number;
    mandatoryGoalsMet?: boolean;
    bonusGoalsMet?: boolean;
    quizPassed?: boolean;
}

export class EndGameService {
    private prisma: PrismaClient;
    private gameTimeService: GameTimeService;
    private levelCompletionService: LevelCompletionService;
    private assetHistoryService: AssetHistoryService;

    constructor(prismaClient?: PrismaClient) {
        this.prisma = prismaClient || defaultPrisma;
        this.gameTimeService = new GameTimeService();
        this.levelCompletionService = new LevelCompletionService(prismaClient);
        this.assetHistoryService = new AssetHistoryService(this.prisma);
    }

    /**
     * Calcule les gains/pertes d'un holding basés sur le prix d'acquisition réel.
     * Même logique que investment.service.ts pour cohérence avec le portfolio affiché.
     */
    private async calculateInterests(holding: HoldingWithAsset, gameInstance: GameInstanceWithLevel): Promise<number> {
        const asset = holding.asset;
        const level = gameInstance.level;
        const quantity = holding.quantity ? Number(holding.quantity) : 0;

        if (!level || quantity === 0) return 0;

        // Price-based calculation
        const currentPrice = await this.assetHistoryService.getCurrentPrice(asset.id, gameInstance.id);
        if (currentPrice) {
            // Get average acquisition price from BUY transactions
            const buyTransactions = await this.prisma.transaction.findMany({
                where: {
                    assetId: asset.id,
                    gameInstanceId: gameInstance.id,
                    type: "BUY",
                },
                orderBy: { transactionDate: 'asc' },
            });

            if (buyTransactions.length > 0) {
                let totalSpent = 0;
                let totalQty = 0;
                for (const tx of buyTransactions) {
                    const txQty = tx.quantity ? Number(tx.quantity) : 0;
                    const txPrice = tx.unitPrice ? Number(tx.unitPrice) : 0;
                    if (txPrice > 0 && txQty > 0) {
                        totalSpent += txQty * txPrice;
                        totalQty += txQty;
                    }
                }

                if (totalQty > 0 && totalSpent > 0) {
                    const avgAcquisitionPrice = totalSpent / totalQty;
                    const returnRate = (currentPrice - avgAcquisitionPrice) / avgAcquisitionPrice;
                    return Math.round(quantity * returnRate);
                }
            }

            // Fallback: use game start price
            const history = await this.assetHistoryService.findForGame(asset.id, gameInstance.id);
            if (history.length > 0) {
                const historyStartDay = level.historyStartDay ?? 0;
                const startPoint = history[Math.min(historyStartDay, history.length - 1)];
                const startPrice = startPoint?.value ? Number(startPoint.value) : currentPrice;
                if (startPrice > 0) {
                    const returnRate = (currentPrice - startPrice) / startPrice;
                    return Math.round(quantity * returnRate);
                }
            }
        }

        // Fallback: rate-based
        if (asset.rate) {
            const elapsedRealSeconds = this.gameTimeService.calculateElapsedTimeSince(
                gameInstance, new Date(holding.acquiredAt)
            );
            const elapsedGameDays = this.gameTimeService.convertRealSecondsToGameDays(level, elapsedRealSeconds);
            const dailyRate = asset.rate / 100 / 365;
            return Math.max(0, quantity * dailyRate * elapsedGameDays);
        }

        return 0;
    }

    /**
     * Termine une partie de jeu:
     * 1. Applique les interets aux holdings
     * 2. Calcule la valeur totale (wallet + assets + interets)
     * 3. Valide les objectifs du niveau
     * 4. Marque la partie comme terminee
     * @param gameInstanceId - ID de l'instance de jeu
     * @returns EndGameResult - Résultat de la fin de partie
     */
    async endGame(gameInstanceId: number): Promise<EndGameResult> {
        // 1. Recuperer l'instance de jeu avec toutes ses donnees
        const gameInstance = await this.prisma.gameInstance.findUnique({
            where: { id: gameInstanceId },
            include: {
                level: {
                    include: {
                        levelGoals: {
                            orderBy: { id: "asc" },
                            include: {
                                goal: true,
                            },
                        },
                    },
                },
                wallets: true,
                holdings: {
                    include: {
                        asset: true,
                    },
                },
                transactions: {
                    include: {
                        asset: true,
                    },
                },
            },
        });

        if (!gameInstance) {
            throw new Error(`GameInstance ${gameInstanceId} non trouvée`);
        }

        if (!gameInstance.level) {
            throw new Error(`Aucun niveau associé à la partie ${gameInstanceId}`);
        }

        const startBalance = Number(gameInstance.startBalance || gameInstance.level.startBalance || 0);
        const wallet = gameInstance.wallets[0];

        if (!wallet) {
            throw new Error(`Aucun wallet trouvé pour la partie ${gameInstanceId}`);
        }

        // 2. Calculer la valeur totale des holdings avec interets
        let totalAssetsValue = 0;
        let totalInterests = 0;

        console.log(`[EndGame] === HOLDINGS DETAIL ===`);
        for (const holding of gameInstance.holdings) {
            const holdingWithAsset = holding as HoldingWithAsset;
            const quantity = holdingWithAsset.quantity ? Number(holdingWithAsset.quantity) : 0;
            const interests = await this.calculateInterests(holdingWithAsset, gameInstance as GameInstanceWithLevel);

            const currentPrice = await this.assetHistoryService.getCurrentPrice(holdingWithAsset.asset.id, gameInstance.id);
            console.log(`[EndGame] Holding: ${holdingWithAsset.asset.title} (assetId=${holdingWithAsset.asset.id}, submarketId=${holdingWithAsset.asset.submarketId}) → qty=${quantity}€, currentPrice=${currentPrice}, interests=${interests}, value=${quantity + interests}€`);

            totalInterests += interests;
            totalAssetsValue += quantity + interests;
        }

        // 3. Calculer la valeur totale (wallet + assets avec interets)
        const currentWalletBalance = Number(wallet.amount || 0);
        const totalValue = currentWalletBalance + totalAssetsValue;

        // 4. Valider les objectifs
        const goalResults: GoalResult[] = [];

        console.log(`[EndGame] === GOAL VALIDATION DEBUG ===`);
        console.log(`[EndGame] startBalance=${startBalance}, walletBalance=${currentWalletBalance}, assetsValue=${totalAssetsValue}, totalInterests=${totalInterests}, totalValue=${totalValue}`);
        console.log(`[EndGame] Transactions (BUY):`, gameInstance.transactions.filter((t: any) => t.type === 'BUY').map((t: any) => `${t.asset?.title ?? 'unknown'} (assetId=${t.assetId}, submarketId=${t.asset?.submarketId}) qty=${t.quantity} price=${t.unitPrice}`));

        for (const levelGoal of gameInstance.level.levelGoals) {
            const goal = levelGoal.goal;
            if (!goal) continue;

            console.log(`[EndGame] Goal "${goal.title}" (id=${goal.id}): type=${goal.goalType}, value=${goal.goalValue}, isMandatory=${levelGoal.isMandatory}`);

            const validated = this.validateGoal(goal.goalType, goal.goalValue, totalValue, startBalance, gameInstance.holdings as HoldingWithAsset[], gameInstance.transactions as any[]);

            console.log(`[EndGame] → validated=${validated} (totalValue ${totalValue} >= goalValue ${goal.goalValue} ? ${totalValue >= (goal.goalValue || 0)})`);

            goalResults.push({
                id: goal.id,
                title: goal.title || "Objectif sans titre",
                description: goal.description,
                isMandatory: levelGoal.isMandatory,
                validated,
            });
        }

        console.log(`[EndGame] Goal results:`, goalResults.map(g => `${g.title}: ${g.validated} (mandatory=${g.isMandatory})`));

        // 5. Marquer la partie comme terminee
        console.log(`[GAME-ENDED] endGame: gameInstanceId=${gameInstanceId}, levelId=${gameInstance.levelId}, userId=${gameInstance.userId}, totalValue=${Math.round(totalValue)}, startBalance=${startBalance}, reason=NORMAL_END_GAME`);
        await this.prisma.gameInstance.update({
            where: { id: gameInstanceId },
            data: {
                isEnded: true,
                endedAt: new Date(),
            },
        });

        // 5b. Success and level completion: based on mandatory goals only (bonus only affects stars)
        type LevelGoalWithMandatory = { goalId: number; isMandatory: boolean };
        const levelGoalsWithMandatory = gameInstance.level.levelGoals as unknown as LevelGoalWithMandatory[];
        const mandatoryGoalIds = levelGoalsWithMandatory
            .filter((lg) => lg.isMandatory)
            .map((lg) => lg.goalId);
        const allMandatoryGoalsValidated =
            mandatoryGoalIds.length === 0 ||
            mandatoryGoalIds.every(
                (goalId) => goalResults.find((g) => g.id === goalId)?.validated === true
            );

        console.log(`[EndGame] mandatoryGoalIds=`, mandatoryGoalIds);
        console.log(`[EndGame] allMandatoryGoalsValidated=${allMandatoryGoalsValidated}`);

        const userId = gameInstance.userId;
        const levelId = gameInstance.levelId;
        let completion: Awaited<ReturnType<LevelCompletionService["getCompletion"]>> = null;
        if (allMandatoryGoalsValidated && userId && levelId) {
            const goalResultsByGoalId = new Map(goalResults.map((g) => [g.id, g.validated]));
            const levelGoals = levelGoalsWithMandatory.map((lg) => ({
                goalId: lg.goalId,
                isMandatory: lg.isMandatory,
            }));
            await this.levelCompletionService.recordFromGameEnd(
                userId,
                levelId,
                goalResultsByGoalId,
                levelGoals
            );
            completion = await this.levelCompletionService.getCompletion(userId, levelId);
        }

        const firstMandatoryGoal = gameInstance.level.levelGoals.find((lg) => lg.isMandatory)?.goal ?? null;
        const firstBonusGoal = gameInstance.level.levelGoals.find((lg) => !lg.isMandatory)?.goal ?? null;
        const firstBonusGoalValidated =
            firstBonusGoal ? goalResults.find((g) => g.id === firstBonusGoal.id)?.validated === true : false;

        const primaryMessageFromGoal = allMandatoryGoalsValidated
            ? firstMandatoryGoal?.successMessage
            : firstMandatoryGoal?.failureMessage;
        const secondaryMessageFromGoal =
            allMandatoryGoalsValidated && firstBonusGoal
                ? (firstBonusGoalValidated ? firstBonusGoal.successMessage : firstBonusGoal.failureMessage)
                : null;

        const modal: EndGameModalContent = allMandatoryGoalsValidated
            ? {
                type: firstBonusGoal && firstBonusGoalValidated
                    ? "PRIMARY_AND_SECONDARY_SUCCESS"
                    : "PRIMARY_SUCCESS_ONLY",
                title: "Bravo !",
                primaryMessage: primaryMessageFromGoal ?? "Tu as réussi l'objectif principal.",
                secondaryMessage: secondaryMessageFromGoal ?? (
                    firstBonusGoal ? "L'objectif secondaire n'a pas été atteint cette fois." : null
                ),
            }
            : {
                type: "PRIMARY_FAILURE",
                title: "Dommage !",
                primaryMessage: primaryMessageFromGoal ?? "Tu n'as pas atteint l'objectif principal.",
                secondaryMessage: null,
            };

        // 6. Retourner le resultat (success = objectifs obligatoires atteints) + stars si enregistrement
        return {
            success: allMandatoryGoalsValidated,
            gameInstanceId,
            startBalance,
            walletBalance: currentWalletBalance,
            assetsValue: totalAssetsValue,
            totalValue,
            goals: goalResults,
            message: allMandatoryGoalsValidated
                ? `Bravo ! Tu as termine avec ${Math.round(totalValue)} EUR (wallet: ${Math.round(currentWalletBalance)} EUR + assets: ${Math.round(totalAssetsValue)} EUR dont ${Math.round(totalInterests)} EUR d'interets) pour un depart de ${startBalance} EUR`
                : `Objectifs non atteints. Total: ${Math.round(totalValue)} EUR (depart: ${startBalance} EUR)`,
            modal,
            ...(completion && {
                stars: completion.stars,
                mandatoryGoalsMet: completion.mandatoryGoalsMet,
                bonusGoalsMet: completion.bonusGoalsMet,
                quizPassed: completion.quizPassed,
            }),
        };
    }

    /**
     * Recalcule le résultat de fin de partie pour une partie déjà terminée, sans modifier l'état.
     * Utilisé pour afficher le recap en lecture seule (ex: mode history).
     */
    async getEndGameResult(gameInstanceId: number): Promise<EndGameResult> {
        const gameInstance = await this.prisma.gameInstance.findUnique({
            where: { id: gameInstanceId },
            include: {
                level: {
                    include: {
                        levelGoals: {
                            orderBy: { id: "asc" },
                            include: { goal: true },
                        },
                    },
                },
                wallets: true,
                holdings: { include: { asset: true } },
                transactions: { include: { asset: true } },
            },
        });

        if (!gameInstance) throw new Error(`GameInstance ${gameInstanceId} non trouvée`);
        if (!gameInstance.level) throw new Error(`Aucun niveau associé à la partie ${gameInstanceId}`);

        const startBalance = Number(gameInstance.startBalance || gameInstance.level.startBalance || 0);
        const wallet = gameInstance.wallets[0];
        if (!wallet) throw new Error(`Aucun wallet trouvé pour la partie ${gameInstanceId}`);

        let totalAssetsValue = 0;
        let totalInterests = 0;
        for (const holding of gameInstance.holdings) {
            const holdingWithAsset = holding as HoldingWithAsset;
            const quantity = holdingWithAsset.quantity ? Number(holdingWithAsset.quantity) : 0;
            const interests = await this.calculateInterests(holdingWithAsset, gameInstance as GameInstanceWithLevel);
            totalInterests += interests;
            totalAssetsValue += quantity + interests;
        }

        const currentWalletBalance = Number(wallet.amount || 0);
        const totalValue = currentWalletBalance + totalAssetsValue;

        const goalResults: GoalResult[] = [];
        for (const levelGoal of gameInstance.level.levelGoals) {
            const goal = levelGoal.goal;
            if (!goal) continue;
            const validated = this.validateGoal(goal.goalType, goal.goalValue, totalValue, startBalance, gameInstance.holdings as HoldingWithAsset[], gameInstance.transactions as any[]);
            goalResults.push({
                id: goal.id,
                title: goal.title || "Objectif sans titre",
                description: goal.description,
                isMandatory: levelGoal.isMandatory,
                validated,
            });
        }

        const allMandatoryGoalsValidated = gameInstance.level.levelGoals
            .filter((lg) => lg.isMandatory)
            .every((lg) => goalResults.find((g) => g.id === lg.goal?.id)?.validated === true);

        const userId = gameInstance.userId;
        const levelId = gameInstance.levelId;
        let completion: Awaited<ReturnType<LevelCompletionService["getCompletion"]>> = null;
        if (userId && levelId) {
            completion = await this.levelCompletionService.getCompletion(userId, levelId);
        }

        return {
            success: allMandatoryGoalsValidated,
            gameInstanceId,
            startBalance,
            walletBalance: currentWalletBalance,
            assetsValue: totalAssetsValue,
            totalValue,
            goals: goalResults,
            message: allMandatoryGoalsValidated
                ? `Total: ${Math.round(totalValue)} EUR`
                : `Objectifs non atteints. Total: ${Math.round(totalValue)} EUR`,
            modal: {
                type: allMandatoryGoalsValidated ? "PRIMARY_SUCCESS_ONLY" : "PRIMARY_FAILURE",
                title: allMandatoryGoalsValidated ? "Bravo !" : "Dommage !",
                primaryMessage: "",
                secondaryMessage: null,
            },
            ...(completion && {
                stars: completion.stars,
                mandatoryGoalsMet: completion.mandatoryGoalsMet,
                bonusGoalsMet: completion.bonusGoalsMet,
                quizPassed: completion.quizPassed,
            }),
        };
    }

    /**
     * Valide un objectif basé sur son goalType et goalValue
     * @param goalType - Type d'objectif (ex: 'wallet_gte_start')
     * @param goalValue - Valeur associée (ex: 0 pour >= startBalance)
     * @param finalBalance - Solde final du wallet
     * @param startBalance - Solde de départ
     * @returns boolean - true si l'objectif est validé
     */
    private validateGoal(
        goalType: string | null,
        goalValue: number | null,
        finalBalance: number,
        startBalance: number,
        holdings: HoldingWithAsset[],
        transactions: any[] = []
    ): boolean {
        if (!goalType) {
            // Pas de type défini = objectif validé par défaut
            return true;
        }

        const value = goalValue || 0;

        switch (goalType) {
            case 'wallet_gte_start':
                // wallet >= startBalance + value (si value=0, juste wallet >= startBalance)
                return finalBalance >= startBalance + value;

            case 'wallet_gt_start':
                // wallet > startBalance + value
                return finalBalance > startBalance + value;

            case 'wallet_min':
                // wallet >= value (minimum absolu)
                return finalBalance >= value;

            case 'profit_min':
                // profit >= value (en %)
                const profit = ((finalBalance - startBalance) / startBalance) * 100;
                return profit >= value;

            case 'min_submarkets_invested':
                // Nombre minimum de submarkets distincts — basé sur les transactions d'achat (historique complet)
                // Fallback sur les holdings si pas de transactions
                const submarketIdsFromTx = new Set(
                    transactions
                        .filter((t: any) => t.type === 'BUY' && t.asset?.submarketId)
                        .map((t: any) => t.asset.submarketId)
                );
                const submarketIdsFromHoldings = new Set(
                    holdings
                        .filter(h => Number(h.quantity) > 0)
                        .map(h => h.asset.submarketId)
                        .filter(Boolean)
                );
                // Union des deux sources
                const distinctSubmarkets = new Set([...submarketIdsFromTx, ...submarketIdsFromHoldings]);
                console.log(`[EndGame] min_submarkets_invested: fromTx=${submarketIdsFromTx.size}, fromHoldings=${submarketIdsFromHoldings.size}, total=${distinctSubmarkets.size} (need >= ${value})`);
                return distinctSubmarkets.size >= value;

            default:
                // Type inconnu = objectif validé par défaut
                return true;
        }
    }
}
