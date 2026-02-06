/**
 * Service de fin de partie
 * Gère la liquidation des assets et la validation des objectifs
 */
import type { PrismaClient, Holding, Asset, Submarket, Level, GameInstance } from "@cashou/db-app";
import defaultPrisma from "../../database.ts";
import { GameTimeService } from "./game-time.service.ts";
import type { FeesSummary, EnvelopeFees } from "./investment.service.ts";

type HoldingWithAsset = Holding & {
    asset: Asset & { submarket: Submarket | null };
};

type GameInstanceWithLevel = GameInstance & {
    level: Level | null;
};

export interface GoalResult {
    id: number;
    title: string;
    description: string | null;
    validated: boolean;
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
    feesSummary: FeesSummary;
}

export class EndGameService {
    private prisma: PrismaClient;
    private gameTimeService: GameTimeService;

    constructor(prismaClient?: PrismaClient) {
        this.prisma = prismaClient || defaultPrisma;
        this.gameTimeService = new GameTimeService();
    }

    /**
     * Calcule les interets pour un holding (taux net = rendement - frais de gestion)
     */
    private calculateInterests(holding: HoldingWithAsset, gameInstance: GameInstanceWithLevel): number {
        const asset = holding.asset;
        const level = gameInstance.level;

        if (!level) {
            return 0;
        }

        const annualRate = asset.rate ?? 0;
        const managementFee = asset.submarket?.managementFee ?? 0;
        const netAnnualRate = annualRate - managementFee;

        if (netAnnualRate === 0) {
            return 0;
        }

        // Temps reel ecoule depuis l'acquisition
        const elapsedRealSeconds = this.gameTimeService.calculateElapsedTimeSince(
            gameInstance,
            new Date(holding.acquiredAt)
        );

        // Conversion en jours de jeu
        const elapsedGameDays = this.gameTimeService.convertRealSecondsToGameDays(level, elapsedRealSeconds);

        // Calcul des interets
        const quantity = holding.quantity ? Number(holding.quantity) : 0;
        const dailyRate = netAnnualRate / 100 / 365;
        const interests = quantity * dailyRate * elapsedGameDays;

        return interests;
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
                            include: {
                                goal: true,
                            },
                        },
                    },
                },
                wallets: true,
                holdings: {
                    include: {
                        asset: {
                            include: {
                                submarket: true,
                            },
                        },
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

        for (const holding of gameInstance.holdings) {
            const holdingWithAsset = holding as HoldingWithAsset;
            const quantity = holdingWithAsset.quantity ? Number(holdingWithAsset.quantity) : 0;
            const interests = this.calculateInterests(holdingWithAsset, gameInstance as GameInstanceWithLevel);

            totalInterests += interests;
            totalAssetsValue += quantity + interests;
        }

        // 3. Calculer la valeur totale (wallet + assets avec interets)
        const currentWalletBalance = Number(wallet.amount || 0);
        const totalValue = currentWalletBalance + totalAssetsValue;

        // 4. Valider les objectifs
        const goals = gameInstance.level.levelGoals.map((lg) => lg.goal);
        const goalResults: GoalResult[] = [];

        for (const goal of goals) {
            if (!goal) continue;

            const validated = this.validateGoal(goal.goalType, goal.goalValue, totalValue, startBalance);

            goalResults.push({
                id: goal.id,
                title: goal.title || "Objectif sans titre",
                description: goal.description,
                validated,
            });
        }

        // 5. Marquer la partie comme terminee
        await this.prisma.gameInstance.update({
            where: { id: gameInstanceId },
            data: {
                isEnded: true,
                endedAt: new Date(),
            },
        });

        // 6. Calculer le résumé des frais
        const feesSummary = await this.getTotalFeesPaid(gameInstanceId);

        // 7. Retourner le resultat
        const allGoalsValidated = goalResults.every((g) => g.validated);

        return {
            success: allGoalsValidated,
            gameInstanceId,
            startBalance,
            walletBalance: currentWalletBalance,
            assetsValue: totalAssetsValue,
            totalValue,
            goals: goalResults,
            message: allGoalsValidated
                ? `Bravo ! Tu as termine avec ${Math.round(totalValue)} EUR (wallet: ${Math.round(currentWalletBalance)} EUR + assets: ${Math.round(totalAssetsValue)} EUR dont ${Math.round(totalInterests)} EUR d'interets) pour un depart de ${startBalance} EUR`
                : `Objectifs non atteints. Total: ${Math.round(totalValue)} EUR (depart: ${startBalance} EUR)`,
            feesSummary,
        };
    }

    /**
     * Calcule le total des frais payés par enveloppe pour une partie
     */
    private async getTotalFeesPaid(gameInstanceId: number): Promise<FeesSummary> {
        const transactions = await this.prisma.transaction.findMany({
            where: {
                gameInstanceId,
                feeAmount: { not: null },
            },
            include: { asset: { include: { submarket: true } } },
        });

        const byEnvelope: Record<string, EnvelopeFees> = {};
        for (const tx of transactions) {
            const envelopeName = tx.asset?.submarket?.title ?? "Autre";
            if (!byEnvelope[envelopeName]) {
                byEnvelope[envelopeName] = { entryFees: 0, exitFees: 0, managementFees: 0, total: 0 };
            }
            const fee = Number(tx.feeAmount);
            if (tx.type === "BUY") byEnvelope[envelopeName].entryFees += fee;
            if (tx.type === "SELL") byEnvelope[envelopeName].exitFees += fee;
            if (tx.type === "MANAGEMENT_FEE") byEnvelope[envelopeName].managementFees += fee;
        }

        const grandTotal = Object.values(byEnvelope).reduce((s, e) => {
            e.total = e.entryFees + e.exitFees + e.managementFees;
            return s + e.total;
        }, 0);

        return { byEnvelope, grandTotal };
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
        startBalance: number
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

            default:
                // Type inconnu = objectif validé par défaut
                return true;
        }
    }
}
