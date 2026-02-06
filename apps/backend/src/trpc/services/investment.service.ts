import type { Holding, GameInstance, Asset, Level, PrismaClient } from "@cashou/db-app";
import { Prisma } from "@cashou/db-app";
import { TRPCError } from "@trpc/server";

import defaultPrisma from "../../database.ts";
import { HoldingService } from "./holding.service.ts";
import { WalletService } from "./wallet.service.ts";
import { GameTimeService } from "./game-time.service.ts";
import type { BuySchema, SellSchema } from "../schemas-zod/investment-schema.ts";

type HoldingWithAsset = Holding & {
  asset: Asset;
};

type GameInstanceWithLevel = GameInstance & {
  level: Level | null;
};

export interface PortfolioItem {
  holding: HoldingWithAsset;
  currentValue: number;
  interests: number;
  managementFees: number;
  totalValue: number;
}

export interface Portfolio {
  items: PortfolioItem[];
  totalInvested: number;
  totalInterests: number;
  totalValue: number;
  walletBalance: number;
  netWorth: number;
  feesSummary: FeesSummary;
}

export interface EnvelopeFees {
  entryFees: number;
  exitFees: number;
  managementFees: number;
  total: number;
}

export interface FeesSummary {
  byEnvelope: Record<string, EnvelopeFees>;
  grandTotal: number;
}

export class InvestmentService {
  private prisma: PrismaClient;
  private holdingService: HoldingService;
  private walletService: WalletService;
  private gameTimeService: GameTimeService;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || defaultPrisma;
    this.holdingService = new HoldingService(this.prisma);
    this.walletService = new WalletService(this.prisma);
    this.gameTimeService = new GameTimeService();
  }

  /**
   * Achète un asset (dépôt sur livret, achat d'actions, etc.)
   */
  async buy(data: BuySchema): Promise<Holding> {
    const { walletId, assetId, amount, gameInstanceId } = data;

    // 1. Récupérer le wallet et vérifier le solde
    const wallet = await this.walletService.findOne(walletId);
    if (!wallet) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Portefeuille introuvable",
      });
    }

    const walletBalance = wallet.amount ? Number(wallet.amount) : 0;
    if (walletBalance < amount) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Solde insuffisant. Disponible: ${walletBalance}€, Demandé: ${amount}€`,
      });
    }

    // 2. Récupérer l'asset et vérifier le plafond
    const asset = await this.prisma.asset.findUnique({
      where: { id: assetId },
    });

    if (!asset) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Asset introuvable",
      });
    }

    // 3. Charger le submarket pour les frais
    const submarket = asset.submarketId
      ? await this.prisma.submarket.findUnique({ where: { id: asset.submarketId } })
      : null;
    const entryFeePercent = submarket?.entryFee ?? 0;
    const feeAmount = amount * (entryFeePercent / 100);
    const investedAmount = amount - feeAmount;

    // 4. Vérifier le plafond de l'asset si défini
    const existingHolding = await this.holdingService.findByWalletAndAsset(walletId, assetId);
    const currentAmount = existingHolding?.quantity ? Number(existingHolding.quantity) : 0;
    const newTotal = currentAmount + investedAmount;

    if (asset.maxAmount && newTotal > Number(asset.maxAmount)) {
      const maxAmount = Number(asset.maxAmount);
      const remainingCapacity = maxAmount - currentAmount;
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Plafond dépassé. Maximum: ${maxAmount}€, Actuel: ${currentAmount}€, Capacité restante: ${remainingCapacity}€`,
      });
    }

    // 5. Vérifier le plafond de l'enveloppe (submarket) si défini
    if (submarket?.maxAmount) {
      const totalInEnvelope = await this.getEnvelopeTotal(walletId, submarket.id);
      if (totalInEnvelope + investedAmount > Number(submarket.maxAmount)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Plafond ${submarket.title} dépassé (${submarket.maxAmount} EUR)`,
        });
      }
    }

    // 6. Vérifier le montant minimum si défini
    if (asset.minAmount && amount < Number(asset.minAmount)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Montant minimum requis: ${asset.minAmount}€`,
      });
    }

    // 7. Exécuter la transaction dans une transaction Prisma
    return await this.prisma.$transaction(async (tx) => {
      // 7.1 Débiter le wallet du montant PLEIN
      await tx.wallet.update({
        where: { id: walletId },
        data: {
          amount: new Prisma.Decimal(walletBalance - amount),
        },
      });

      // 7.2 Créer ou mettre à jour le holding avec le montant INVESTI (après frais)
      let holding: Holding;
      if (existingHolding) {
        holding = await tx.holding.update({
          where: { id: existingHolding.id },
          data: {
            quantity: new Prisma.Decimal(newTotal),
          },
          include: {
            asset: true,
            wallet: true,
            gameInstance: true,
          },
        });
      } else {
        holding = await tx.holding.create({
          data: {
            walletId,
            assetId,
            gameInstanceId,
            quantity: new Prisma.Decimal(investedAmount),
            acquiredAt: new Date(),
          },
          include: {
            asset: true,
            wallet: true,
            gameInstance: true,
          },
        });
      }

      // 7.3 Créer la transaction (historique) avec frais enregistrés
      await tx.transaction.create({
        data: {
          walletId,
          assetId,
          gameInstanceId,
          type: "BUY",
          quantity: Math.floor(amount),
          unitPrice: new Prisma.Decimal(1),
          totalValue: new Prisma.Decimal(amount),
          feeAmount: feeAmount > 0 ? new Prisma.Decimal(feeAmount) : null,
          feePercent: entryFeePercent > 0 ? entryFeePercent : null,
          transactionDate: new Date(),
          source: "investment_service",
        },
      });

      return holding;
    });
  }

  /**
   * Vend un asset (retrait d'un livret, vente d'actions, etc.)
   * Pour les livrets, les intérêts sont calculés et ajoutés au montant retiré
   */
  async sell(data: SellSchema): Promise<{ holding: Holding | null; amountReceived: number; interests: number }> {
    const { walletId, assetId, amount, gameInstanceId } = data;

    // 1. Récupérer le holding existant
    const existingHolding = await this.holdingService.findByWalletAndAsset(walletId, assetId);
    if (!existingHolding) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Aucun holding trouvé pour cet asset",
      });
    }

    const currentQuantity = existingHolding.quantity ? Number(existingHolding.quantity) : 0;
    if (currentQuantity < amount) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Quantité insuffisante. Disponible: ${currentQuantity}€, Demandé: ${amount}€`,
      });
    }

    // 2. Récupérer la game instance pour calculer les intérêts
    const gameInstance = await this.prisma.gameInstance.findUnique({
      where: { id: gameInstanceId },
      include: { level: true },
    });

    if (!gameInstance) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Instance de jeu introuvable",
      });
    }

    // 3. Calculer les intérêts proportionnels au montant retiré
    const holdingWithAsset = existingHolding as HoldingWithAsset;
    const totalInterests = await this.calculateInterests(holdingWithAsset, gameInstance as GameInstanceWithLevel);
    const proportionalInterests = (amount / currentQuantity) * totalInterests;

    // 4. Charger le submarket pour les frais de sortie
    const submarket = holdingWithAsset.asset.submarketId
      ? await this.prisma.submarket.findUnique({ where: { id: holdingWithAsset.asset.submarketId } })
      : null;
    const exitFeePercent = submarket?.exitFee ?? 0;

    const grossAmount = amount + proportionalInterests;
    const feeAmount = grossAmount * (exitFeePercent / 100);
    const amountReceived = Math.ceil(grossAmount - feeAmount);
    const roundedInterests = amountReceived - amount;

    // 5. Exécuter la transaction
    return await this.prisma.$transaction(async (tx) => {
      const newQuantity = currentQuantity - amount;
      let updatedHolding: Holding | null = null;

      // 5.1 Mettre à jour ou supprimer le holding
      if (newQuantity > 0) {
        updatedHolding = await tx.holding.update({
          where: { id: existingHolding.id },
          data: {
            quantity: new Prisma.Decimal(newQuantity),
          },
          include: {
            asset: true,
            wallet: true,
            gameInstance: true,
          },
        });
      } else {
        await tx.holding.delete({
          where: { id: existingHolding.id },
        });
      }

      // 5.2 Créditer le wallet
      const wallet = await tx.wallet.findUnique({ where: { id: walletId } });
      const currentBalance = wallet?.amount ? Number(wallet.amount) : 0;
      await tx.wallet.update({
        where: { id: walletId },
        data: {
          amount: new Prisma.Decimal(currentBalance + amountReceived),
        },
      });

      // 5.3 Créer la transaction (historique) avec frais enregistrés
      await tx.transaction.create({
        data: {
          walletId,
          assetId,
          gameInstanceId,
          type: "SELL",
          quantity: Math.floor(amount),
          unitPrice: new Prisma.Decimal(1),
          totalValue: new Prisma.Decimal(amountReceived),
          feeAmount: feeAmount > 0 ? new Prisma.Decimal(feeAmount) : null,
          feePercent: exitFeePercent > 0 ? exitFeePercent : null,
          transactionDate: new Date(),
          source: "investment_service",
        },
      });

      return {
        holding: updatedHolding,
        amountReceived,
        interests: roundedInterests,
      };
    });
  }

  /**
   * Calcule les intérêts générés par un holding (taux net = rendement - frais de gestion)
   * Formule: montant × ((taux - fraisGestion)/365) × jours_de_jeu_écoulés
   */
  async calculateInterests(holding: HoldingWithAsset, gameInstance: GameInstanceWithLevel): Promise<number> {
    const asset = holding.asset;
    const level = gameInstance.level;

    if (!level) {
      return 0;
    }

    const annualRate = asset.rate ?? 0;

    // Charger le submarket pour les frais de gestion
    const submarket = asset.submarketId
      ? await this.prisma.submarket.findUnique({ where: { id: asset.submarketId } })
      : null;
    const managementFee = submarket?.managementFee ?? 0;
    const netAnnualRate = annualRate - managementFee;

    if (netAnnualRate === 0) {
      return 0;
    }

    // Temps réel écoulé depuis l'acquisition
    const elapsedRealSeconds = this.gameTimeService.calculateElapsedTimeSince(
      gameInstance,
      new Date(holding.acquiredAt)
    );

    // Conversion en jours de jeu
    const elapsedGameDays = this.gameTimeService.convertRealSecondsToGameDays(level, elapsedRealSeconds);

    // Calcul des intérêts: montant × (taux_net/100/365) × jours écoulés
    const quantity = holding.quantity ? Number(holding.quantity) : 0;
    const dailyRate = netAnnualRate / 100 / 365;
    const interests = quantity * dailyRate * elapsedGameDays;

    return interests;
  }

  /**
   * Calcule le total investi dans une enveloppe (submarket) pour un wallet
   */
  async getEnvelopeTotal(walletId: number, submarketId: number): Promise<number> {
    const holdings = await this.prisma.holding.findMany({
      where: { walletId },
      include: { asset: true },
    });
    return holdings
      .filter(h => h.asset.submarketId === submarketId)
      .reduce((sum, h) => sum + Number(h.quantity), 0);
  }

  /**
   * Récupère le portefeuille complet d'un utilisateur avec calcul des intérêts
   */
  async getPortfolio(walletId: number, gameInstanceId: number): Promise<Portfolio> {
    // 1. Récupérer le wallet
    const wallet = await this.walletService.findOne(walletId);
    if (!wallet) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Portefeuille introuvable",
      });
    }

    // 2. Récupérer la game instance
    const gameInstance = await this.prisma.gameInstance.findUnique({
      where: { id: gameInstanceId },
      include: { level: true },
    });

    if (!gameInstance) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Instance de jeu introuvable",
      });
    }

    // 3. Récupérer tous les holdings du wallet
    const holdings = await this.holdingService.findByWallet(walletId);

    // 4. Calculer les valeurs pour chaque holding
    const items: PortfolioItem[] = [];
    for (const holding of holdings) {
      const holdingWithAsset = holding as HoldingWithAsset;
      const currentValue = holdingWithAsset.quantity ? Number(holdingWithAsset.quantity) : 0;
      const interests = await this.calculateInterests(holdingWithAsset, gameInstance as GameInstanceWithLevel);

      // Calculer les frais de gestion cumulés (pour affichage)
      const submarket = holdingWithAsset.asset.submarketId
        ? await this.prisma.submarket.findUnique({ where: { id: holdingWithAsset.asset.submarketId } })
        : null;
      const managementFee = submarket?.managementFee ?? 0;
      const level = gameInstance.level;
      let managementFees = 0;
      if (level && managementFee > 0) {
        const elapsedRealSeconds = this.gameTimeService.calculateElapsedTimeSince(
          gameInstance,
          new Date(holdingWithAsset.acquiredAt)
        );
        const elapsedGameDays = this.gameTimeService.convertRealSecondsToGameDays(level, elapsedRealSeconds);
        managementFees = currentValue * (managementFee / 100 / 365) * elapsedGameDays;
      }

      const totalValue = currentValue + interests;

      items.push({
        holding: holdingWithAsset,
        currentValue,
        interests,
        managementFees,
        totalValue,
      });
    }

    // 5. Calculer les totaux
    const totalInvested = items.reduce((sum, item) => sum + item.currentValue, 0);
    const totalInterests = items.reduce((sum, item) => sum + item.interests, 0);
    const totalValue = items.reduce((sum, item) => sum + item.totalValue, 0);
    const walletBalance = wallet.amount ? Number(wallet.amount) : 0;
    const netWorth = walletBalance + totalValue;

    // 6. Calculer le résumé des frais
    const feesSummary = await this.getTotalFeesPaid(gameInstanceId);

    return {
      items,
      totalInvested,
      totalInterests,
      totalValue,
      walletBalance,
      netWorth,
      feesSummary,
    };
  }

  /**
   * Calcule les intérêts projetés pour un holding spécifique
   */
  async getHoldingWithInterests(holdingId: number, gameInstanceId: number): Promise<PortfolioItem | null> {
    const holding = await this.holdingService.findOne(holdingId);
    if (!holding) {
      return null;
    }

    const gameInstance = await this.prisma.gameInstance.findUnique({
      where: { id: gameInstanceId },
      include: { level: true },
    });

    if (!gameInstance) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Instance de jeu introuvable",
      });
    }

    const holdingWithAsset = holding as HoldingWithAsset;
    const currentValue = holdingWithAsset.quantity ? Number(holdingWithAsset.quantity) : 0;
    const interests = await this.calculateInterests(holdingWithAsset, gameInstance as GameInstanceWithLevel);

    const submarket = holdingWithAsset.asset.submarketId
      ? await this.prisma.submarket.findUnique({ where: { id: holdingWithAsset.asset.submarketId } })
      : null;
    const managementFee = submarket?.managementFee ?? 0;
    const level = gameInstance.level;
    let managementFees = 0;
    if (level && managementFee > 0) {
      const elapsedRealSeconds = this.gameTimeService.calculateElapsedTimeSince(
        gameInstance,
        new Date(holdingWithAsset.acquiredAt)
      );
      const elapsedGameDays = this.gameTimeService.convertRealSecondsToGameDays(level, elapsedRealSeconds);
      managementFees = currentValue * (managementFee / 100 / 365) * elapsedGameDays;
    }

    const totalValue = currentValue + interests;

    return {
      holding: holdingWithAsset,
      currentValue,
      interests,
      managementFees,
      totalValue,
    };
  }

  /**
   * Applique les intérêts à tous les holdings d'une game instance
   * (utile pour la fin du niveau ou pour des checkpoints)
   */
  async applyInterestsToAllHoldings(gameInstanceId: number): Promise<void> {
    const gameInstance = await this.prisma.gameInstance.findUnique({
      where: { id: gameInstanceId },
      include: { level: true },
    });

    if (!gameInstance || !gameInstance.level) {
      return;
    }

    const holdings = await this.holdingService.findByGameInstance(gameInstanceId);

    for (const holding of holdings) {
      const holdingWithAsset = holding as HoldingWithAsset;
      const interests = await this.calculateInterests(holdingWithAsset, gameInstance as GameInstanceWithLevel);

      if (interests !== 0) {
        const currentQuantity = holdingWithAsset.quantity ? Number(holdingWithAsset.quantity) : 0;
        const newQuantity = Math.max(0, currentQuantity + interests);

        await this.prisma.holding.update({
          where: { id: holding.id },
          data: {
            quantity: new Prisma.Decimal(newQuantity),
            lastInterestAt: new Date(),
          },
        });

        // Créer une transaction pour tracer les intérêts
        if (interests > 0) {
          await this.prisma.transaction.create({
            data: {
              walletId: holding.walletId,
              assetId: holding.assetId,
              gameInstanceId,
              type: "INTEREST",
              quantity: Math.floor(interests),
              unitPrice: new Prisma.Decimal(1),
              totalValue: new Prisma.Decimal(interests),
              transactionDate: new Date(),
              source: "interest_application",
            },
          });
        }

        // Créer une transaction de frais de gestion si applicable
        const submarket = holdingWithAsset.asset.submarketId
          ? await this.prisma.submarket.findUnique({ where: { id: holdingWithAsset.asset.submarketId } })
          : null;
        const managementFee = submarket?.managementFee ?? 0;
        if (managementFee > 0) {
          const level = gameInstance.level;
          const elapsedRealSeconds = this.gameTimeService.calculateElapsedTimeSince(
            gameInstance,
            new Date(holdingWithAsset.acquiredAt)
          );
          const elapsedGameDays = this.gameTimeService.convertRealSecondsToGameDays(level, elapsedRealSeconds);
          const mgmtFeeAmount = currentQuantity * (managementFee / 100 / 365) * elapsedGameDays;

          if (mgmtFeeAmount > 0) {
            await this.prisma.transaction.create({
              data: {
                walletId: holding.walletId,
                assetId: holding.assetId,
                gameInstanceId,
                type: "MANAGEMENT_FEE",
                quantity: 0,
                unitPrice: new Prisma.Decimal(1),
                totalValue: new Prisma.Decimal(mgmtFeeAmount),
                feeAmount: new Prisma.Decimal(mgmtFeeAmount),
                feePercent: managementFee,
                transactionDate: new Date(),
                source: "management_fee_application",
              },
            });
          }
        }
      }
    }
  }

  /**
   * Calcule le total des frais payés par enveloppe pour une partie
   */
  async getTotalFeesPaid(gameInstanceId: number): Promise<FeesSummary> {
    // Récupérer toutes les transactions avec frais
    const transactions = await this.prisma.transaction.findMany({
      where: {
        gameInstanceId,
        feeAmount: { not: null },
      },
      include: { asset: { include: { submarket: true } } },
    });

    // Grouper par enveloppe
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

    // Calculer totaux
    const grandTotal = Object.values(byEnvelope).reduce((s, e) => {
      e.total = e.entryFees + e.exitFees + e.managementFees;
      return s + e.total;
    }, 0);

    return { byEnvelope, grandTotal };
  }
}
