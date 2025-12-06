/**
 * Service de fin de partie
 * Gère la liquidation des assets et la validation des objectifs
 */
import type { PrismaClient } from "@cashou/db-app";
import { Prisma } from "@cashou/db-app";
import defaultPrisma from "../../database.ts";

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
}

export class EndGameService {
    private prisma: PrismaClient;

    constructor(prismaClient?: PrismaClient) {
        this.prisma = prismaClient || defaultPrisma;
    }

    /**
     * Termine une partie de jeu:
     * 1. Vend tous les assets détenus et ajoute au wallet
     * 2. Valide les objectifs du niveau
     * @param gameInstanceId - ID de l'instance de jeu
     * @returns EndGameResult - Résultat de la fin de partie
     */
    async endGame(gameInstanceId: number): Promise<EndGameResult> {
        // 1. Récupérer l'instance de jeu avec toutes ses données
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

        // 2. Calculer les assets détenus (différence entre BUY et SELL)
        const assetHoldings = this.calculateAssetHoldings(gameInstance.transactions);

        // 3. Calculer la valeur totale des assets (sans les vendre)
        let totalAssetsValue = 0;

        for (const [, holding] of Object.entries(assetHoldings)) {
            if (holding.quantity > 0) {
                // Valeur de l'asset = quantité * dernier prix connu
                const assetPrice = holding.lastPrice || 1;
                const assetValue = holding.quantity * assetPrice;
                totalAssetsValue += assetValue;
            }
        }

        // 4. Calculer la valeur totale (wallet + assets)
        const currentWalletBalance = Number(wallet.amount || 0);
        const totalValue = currentWalletBalance + totalAssetsValue;

        // 5. Valider les objectifs
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

        // 6. Retourner le résultat
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
                ? `🎉 Bravo ! Tu as terminé avec ${totalValue}€ (wallet: ${currentWalletBalance}€ + assets: ${totalAssetsValue}€) pour un départ de ${startBalance}€`
                : `❌ Objectifs non atteints. Total: ${totalValue}€ (départ: ${startBalance}€)`,
        };
    }

    /**
     * Calcule les assets détenus par le joueur
     * @param transactions - Liste des transactions
     * @returns Map<assetId, {quantity, lastPrice, asset}>
     */
    private calculateAssetHoldings(
        transactions: Array<{
            assetId: number | null;
            type: string | null;
            quantity: number | null;
            unitPrice: Prisma.Decimal | null;
            asset: { id: number; title: string | null; rate: number | null } | null;
        }>
    ): Record<string, { quantity: number; lastPrice: number; asset: { title: string | null; rate: number | null } | null }> {
        const holdings: Record<string, { quantity: number; lastPrice: number; asset: { title: string | null; rate: number | null } | null }> = {};

        for (const tx of transactions) {
            if (!tx.assetId) continue;

            const assetIdStr = tx.assetId.toString();

            if (!holdings[assetIdStr]) {
                holdings[assetIdStr] = { quantity: 0, lastPrice: 1, asset: tx.asset };
            }

            const quantity = tx.quantity || 0;
            const price = tx.unitPrice ? Number(tx.unitPrice) : 1;

            if (tx.type === "BUY") {
                holdings[assetIdStr].quantity += quantity;
                holdings[assetIdStr].lastPrice = price;
            } else if (tx.type === "SELL") {
                holdings[assetIdStr].quantity -= quantity;
            }
        }

        return holdings;
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
