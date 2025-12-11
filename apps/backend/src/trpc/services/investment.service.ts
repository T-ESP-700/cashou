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
  totalValue: number;
}

export interface Portfolio {
  items: PortfolioItem[];
  totalInvested: number;
  totalInterests: number;
  totalValue: number;
  walletBalance: number;
  netWorth: number;
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

    // 3. Vérifier le plafond si défini
    const existingHolding = await this.holdingService.findByWalletAndAsset(walletId, assetId);
    const currentAmount = existingHolding?.quantity ? Number(existingHolding.quantity) : 0;
    const newTotal = currentAmount + amount;

    if (asset.maxAmount && newTotal > Number(asset.maxAmount)) {
      const maxAmount = Number(asset.maxAmount);
      const remainingCapacity = maxAmount - currentAmount;
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Plafond dépassé. Maximum: ${maxAmount}€, Actuel: ${currentAmount}€, Capacité restante: ${remainingCapacity}€`,
      });
    }

    // 4. Vérifier le montant minimum si défini
    if (asset.minAmount && amount < Number(asset.minAmount)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Montant minimum requis: ${asset.minAmount}€`,
      });
    }

    // 5. Exécuter la transaction dans une transaction Prisma
    return await this.prisma.$transaction(async (tx) => {
      // 5.1 Débiter le wallet
      await tx.wallet.update({
        where: { id: walletId },
        data: {
          amount: new Prisma.Decimal(walletBalance - amount),
        },
      });

      // 5.2 Créer ou mettre à jour le holding
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
            quantity: new Prisma.Decimal(amount),
            acquiredAt: new Date(),
          },
          include: {
            asset: true,
            wallet: true,
            gameInstance: true,
          },
        });
      }

      // 5.3 Créer la transaction (historique)
      await tx.transaction.create({
        data: {
          walletId,
          assetId,
          gameInstanceId,
          type: "BUY",
          quantity: Math.floor(amount), // Pour livrets, quantity = montant en €
          unitPrice: new Prisma.Decimal(1), // Pour livrets, unitPrice = 1
          totalValue: new Prisma.Decimal(amount),
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
    const totalInterests = this.calculateInterests(holdingWithAsset, gameInstance as GameInstanceWithLevel);
    const proportionalInterests = (amount / currentQuantity) * totalInterests;
    // Arrondi supérieur pour éviter les centimes perdus qui resteraient en cash
    const amountReceived = Math.ceil(amount + proportionalInterests);
    const roundedInterests = amountReceived - amount;

    // 4. Exécuter la transaction
    return await this.prisma.$transaction(async (tx) => {
      const newQuantity = currentQuantity - amount;
      let updatedHolding: Holding | null = null;

      // 4.1 Mettre à jour ou supprimer le holding
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

      // 4.2 Créditer le wallet
      const wallet = await tx.wallet.findUnique({ where: { id: walletId } });
      const currentBalance = wallet?.amount ? Number(wallet.amount) : 0;
      await tx.wallet.update({
        where: { id: walletId },
        data: {
          amount: new Prisma.Decimal(currentBalance + amountReceived),
        },
      });

      // 4.3 Créer la transaction (historique)
      await tx.transaction.create({
        data: {
          walletId,
          assetId,
          gameInstanceId,
          type: "SELL",
          quantity: Math.floor(amount),
          unitPrice: new Prisma.Decimal(1),
          totalValue: new Prisma.Decimal(amountReceived),
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
   * Calcule les intérêts générés par un holding (pour les livrets à taux fixe)
   * Formule: montant × (taux/365) × jours_de_jeu_écoulés
   */
  calculateInterests(holding: HoldingWithAsset, gameInstance: GameInstanceWithLevel): number {
    const asset = holding.asset;
    const level = gameInstance.level;

    if (!level || !asset.rate) {
      return 0;
    }

    const annualRate = asset.rate; // Ex: 1.7 pour 1.7%

    // Temps réel écoulé depuis l'acquisition
    const elapsedRealSeconds = this.gameTimeService.calculateElapsedTimeSince(
      gameInstance,
      new Date(holding.acquiredAt)
    );

    // Conversion en jours de jeu
    const elapsedGameDays = this.gameTimeService.convertRealSecondsToGameDays(level, elapsedRealSeconds);

    // Calcul des intérêts: montant × (taux/100/365) × jours écoulés
    const quantity = holding.quantity ? Number(holding.quantity) : 0;
    const dailyRate = annualRate / 100 / 365;
    const interests = quantity * dailyRate * elapsedGameDays;

    return Math.max(0, interests);
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
    const items: PortfolioItem[] = holdings.map((holding) => {
      const holdingWithAsset = holding as HoldingWithAsset;
      const currentValue = holdingWithAsset.quantity ? Number(holdingWithAsset.quantity) : 0;
      const interests = this.calculateInterests(holdingWithAsset, gameInstance as GameInstanceWithLevel);
      const totalValue = currentValue + interests;

      return {
        holding: holdingWithAsset,
        currentValue,
        interests,
        totalValue,
      };
    });

    // 5. Calculer les totaux
    const totalInvested = items.reduce((sum, item) => sum + item.currentValue, 0);
    const totalInterests = items.reduce((sum, item) => sum + item.interests, 0);
    const totalValue = items.reduce((sum, item) => sum + item.totalValue, 0);
    const walletBalance = wallet.amount ? Number(wallet.amount) : 0;
    const netWorth = walletBalance + totalValue;

    return {
      items,
      totalInvested,
      totalInterests,
      totalValue,
      walletBalance,
      netWorth,
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
    const interests = this.calculateInterests(holdingWithAsset, gameInstance as GameInstanceWithLevel);
    const totalValue = currentValue + interests;

    return {
      holding: holdingWithAsset,
      currentValue,
      interests,
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
      const interests = this.calculateInterests(holdingWithAsset, gameInstance as GameInstanceWithLevel);

      if (interests > 0) {
        const currentQuantity = holdingWithAsset.quantity ? Number(holdingWithAsset.quantity) : 0;
        const newQuantity = currentQuantity + interests;

        await this.prisma.holding.update({
          where: { id: holding.id },
          data: {
            quantity: new Prisma.Decimal(newQuantity),
            lastInterestAt: new Date(),
          },
        });

        // Créer une transaction pour tracer les intérêts
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
    }
  }
}
