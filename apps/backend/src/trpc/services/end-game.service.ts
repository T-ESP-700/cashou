/**
 * Service de fin de partie
 * Gère la liquidation des assets et la validation des objectifs
 */
import type { PrismaClient, Holding, Asset, Level, GameInstance } from "@cashou/db-app";
import defaultPrisma from "../../database.ts";
import { GameTimeService } from "./game-time.service.ts";
import { LevelCompletionService } from "./level-completion.service.ts";

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

    constructor(prismaClient?: PrismaClient) {
        this.prisma = prismaClient || defaultPrisma;
        this.gameTimeService = new GameTimeService();
        this.levelCompletionService = new LevelCompletionService(prismaClient);
    }

    /**
     * Calcule les interets pour un holding
     */
    private calculateInterests(holding: HoldingWithAsset, gameInstance: GameInstanceWithLevel): number {
        const asset = holding.asset;
        const level = gameInstance.level;

        if (!level || !asset.rate) {
            return 0;
        }

        const annualRate = asset.rate;

        // Temps reel ecoule depuis l'acquisition
        const elapsedRealSeconds = this.gameTimeService.calculateElapsedTimeSince(
            gameInstance,
            new Date(holding.acquiredAt)
        );

        // Conversion en jours de jeu
        const elapsedGameDays = this.gameTimeService.convertRealSecondsToGameDays(level, elapsedRealSeconds);

        // Calcul des interets
        const quantity = holding.quantity ? Number(holding.quantity) : 0;
        const dailyRate = annualRate / 100 / 365;
        const interests = quantity * dailyRate * elapsedGameDays;

        return Math.max(0, interests);
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
        const goalResults: GoalResult[] = [];

        for (const levelGoal of gameInstance.level.levelGoals) {
            const goal = levelGoal.goal;
            if (!goal) continue;

            const validated = this.validateGoal(goal.goalType, goal.goalValue, totalValue, startBalance);

            goalResults.push({
                id: goal.id,
                title: goal.title || "Objectif sans titre",
                description: goal.description,
                isMandatory: levelGoal.isMandatory,
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
