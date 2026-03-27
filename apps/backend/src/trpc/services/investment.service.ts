import type { Holding, GameInstance, Asset, Level, PrismaClient } from "@cashou/db-app";
import { Prisma } from "@cashou/db-app";
import { TRPCError } from "@trpc/server";

import defaultPrisma from "../../database.ts";
import { HoldingService } from "./holding.service.ts";
import { WalletService } from "./wallet.service.ts";
import { GameTimeService } from "./game-time.service.ts";
import { AssetHistoryService } from "./asset-history.service.ts";
import type { BuySchema, SellSchema } from "../schemas-zod/investment-schema.ts";
import { gameCache, cached } from "../../lib/cache.ts";

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
  private assetHistoryService: AssetHistoryService;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || defaultPrisma;
    this.holdingService = new HoldingService(this.prisma);
    this.walletService = new WalletService(this.prisma);
    this.gameTimeService = new GameTimeService();
    this.assetHistoryService = new AssetHistoryService(this.prisma);
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

    // 5. Get current market price for this asset
    const currentPrice = await this.assetHistoryService.getCurrentPrice(assetId, gameInstanceId);
    const marketPrice = currentPrice ?? 10000; // fallback 100€ in cents

    // 6. Exécuter la transaction dans une transaction Prisma
    return await this.prisma.$transaction(async (tx) => {
      // 6.1 Débiter le wallet
      await tx.wallet.update({
        where: { id: walletId },
        data: {
          amount: new Prisma.Decimal(walletBalance - amount),
        },
      });

      // 6.2 Créer ou mettre à jour le holding
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

      // 6.3 Créer la transaction (historique) avec le vrai prix du marché
      await tx.transaction.create({
        data: {
          walletId,
          assetId,
          gameInstanceId,
          type: "BUY",
          quantity: Math.floor(amount),
          unitPrice: new Prisma.Decimal(marketPrice), // prix du marché en centimes
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
    const totalInterests = await this.calculateInterests(holdingWithAsset, gameInstance as GameInstanceWithLevel);
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
   * Calcule les intérêts/gains basés sur l'évolution du prix du marché.
   * Formule: quantity × (prixActuel / prixMoyenAchat - 1)
   * Le prix moyen d'achat est calculé à partir des transactions BUY.
   * Fallback sur le rate fixe si pas de données de prix.
   */
  async calculateInterests(holding: HoldingWithAsset, gameInstance: GameInstanceWithLevel): Promise<number> {
    const asset = holding.asset;
    const level = gameInstance.level;
    const quantity = holding.quantity ? Number(holding.quantity) : 0;

    if (!level || quantity === 0) {
      return 0;
    }

    // Try price-based calculation first
    const currentPrice = await this.assetHistoryService.getCurrentPrice(
      asset.id,
      gameInstance.id
    );

    if (currentPrice) {
      // Get average acquisition price from BUY transactions for this holding
      const buyTransactions = await this.prisma.transaction.findMany({
        where: {
          assetId: asset.id,
          gameInstanceId: gameInstance.id,
          walletId: holding.walletId,
          type: "BUY",
        },
        orderBy: { transactionDate: 'asc' },
      });

      if (buyTransactions.length > 0) {
        // Weighted average acquisition price
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
          // Return = quantity × (currentPrice / acquisitionPrice - 1)
          const returnRate = (currentPrice - avgAcquisitionPrice) / avgAcquisitionPrice;
          return Math.round(quantity * returnRate);
        }
      }

      // No buy transactions with price — estimate from history at acquisition time
      // Use the game start price as fallback acquisition price
      const history = await this.assetHistoryService.findForGame(asset.id, gameInstance.id);
      if (history.length > 0) {
        const historyStartDay = level.historyStartDay ?? 0;
        // Price at game start (when holdings could first be acquired)
        const startPoint = history[Math.min(historyStartDay, history.length - 1)];
        const startPrice = startPoint?.value ? Number(startPoint.value) : currentPrice;
        if (startPrice > 0) {
          const returnRate = (currentPrice - startPrice) / startPrice;
          return Math.round(quantity * returnRate);
        }
      }
    }

    // Fallback: rate-based calculation (for levels without price history)
    if (asset.rate) {
      const annualRate = asset.rate;
      const elapsedRealSeconds = this.gameTimeService.calculateElapsedTimeSince(
        gameInstance,
        new Date(holding.acquiredAt)
      );
      const elapsedGameDays = this.gameTimeService.convertRealSecondsToGameDays(level, elapsedRealSeconds);
      const dailyRate = annualRate / 100 / 365;
      return Math.max(0, quantity * dailyRate * elapsedGameDays);
    }

    return 0;
  }

  /**
   * Récupère le portefeuille complet d'un utilisateur avec calcul des intérêts
   */
  async getPortfolio(walletId: number, gameInstanceId: number): Promise<Portfolio> {
    const cacheKey = `portfolio:${gameInstanceId}:${walletId}`;
    return cached(gameCache, cacheKey, () => this._getPortfolioUncached(walletId, gameInstanceId));
  }

  private async _getPortfolioUncached(walletId: number, gameInstanceId: number): Promise<Portfolio> {
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
      const totalValue = currentValue + interests;

      items.push({
        holding: holdingWithAsset,
        currentValue,
        interests,
        totalValue,
      });
    }

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
    const interests = await this.calculateInterests(holdingWithAsset, gameInstance as GameInstanceWithLevel);
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
      const interests = await this.calculateInterests(holdingWithAsset, gameInstance as GameInstanceWithLevel);

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

  /**
   * Returns a lightweight snapshot of the portfolio for quick display
   */
  async getPortfolioSnapshot(walletId: number, gameInstanceId: number) {
    const cacheKey = `snapshot:${gameInstanceId}:${walletId}`;
    return cached(gameCache, cacheKey, async () => {
      const portfolio = await this.getPortfolio(walletId, gameInstanceId);
      return {
        totalValue: portfolio.totalValue,
        walletBalance: portfolio.walletBalance,
        holdings: portfolio.items.map((item) => ({
          assetId: item.holding.assetId,
          assetName: item.holding.asset.name,
          currentValue: item.currentValue,
          totalValue: item.totalValue,
          change: item.interests,
        })),
      };
    });
  }
}
