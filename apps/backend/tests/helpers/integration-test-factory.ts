/**
 * Factory pour créer des données de test pour les tests d'intégration
 * Simplifie la création d'entités de test avec des valeurs par défaut cohérentes
 */

import type { 
  User, Level, GameInstance, Wallet, Asset, Holding, Market, 
  Field, Submarket, Event, LevelEvent, Goal, LevelGoal, PrismaClient 
} from "@cashou/db-app";
import { Prisma } from "@cashou/db-app";

export class IntegrationTestFactory {
  private counter = 0;

  constructor(private prisma: PrismaClient) {}

  /**
   * Génère un identifiant unique pour éviter les collisions
   */
  private uniqueId(): string {
    return `test-${Date.now()}-${this.counter++}`;
  }

  /**
   * Crée un utilisateur de test
   */
  async createUser(data?: Partial<User>): Promise<User> {
    const uniqueSuffix = this.uniqueId();
    const userData: any = {
      email: data?.email ?? `user-${uniqueSuffix}@test.com`,
      username: data?.username ?? `user${uniqueSuffix}`,
      name: data?.name ?? "Test User",
      emailVerified: data?.emailVerified ?? true,
      expoPushToken: data?.expoPushToken ?? null,
      points: data?.points ?? 0,
      currentStreak: data?.currentStreak ?? 0,
      maxStreak: data?.maxStreak ?? 0,
    };
    
    // N'ajouter levelId que s'il est fourni explicitement
    if (data?.levelId !== undefined) {
      userData.levelId = data.levelId;
    }
    
    return this.prisma.user.create({ data: userData });
  }

  /**
   * Crée un niveau de test
   */
  async createLevel(data?: Partial<Level>): Promise<Level> {
    return this.prisma.level.create({
      data: {
        title: data?.title ?? `Level ${this.uniqueId()}`,
        number: data?.number ?? 1,
        duration: data?.duration ?? 30,
        speed: data?.speed ?? 1,
        startBalance: data?.startBalance ?? 10000,
        description: data?.description ?? null,
        pointsRequired: data?.pointsRequired ?? null,
      },
    });
  }

  /**
   * Crée un marché de test
   */
  async createMarket(data?: Partial<Market>): Promise<Market> {
    return this.prisma.market.create({
      data: {
        title: data?.title ?? `Market ${this.uniqueId()}`,
        description: data?.description ?? null,
      },
    });
  }

  /**
   * Crée un champ de test
   */
  async createField(data: { marketId: number } & Partial<Field>): Promise<Field> {
    return this.prisma.field.create({
      data: {
        marketId: data.marketId,
        name: data.name ?? `Field ${this.uniqueId()}`,
      },
    });
  }

  /**
   * Crée un sous-marché de test
   */
  async createSubmarket(data: { marketId: number } & Partial<Submarket>): Promise<Submarket> {
    return this.prisma.submarket.create({
      data: {
        marketId: data.marketId,
        gameInstanceId: data.gameInstanceId ?? null,
        title: data.title ?? `Submarket ${this.uniqueId()}`,
        description: data.description ?? null,
      },
    });
  }

  /**
   * Crée un asset de test (avec field/market/submarket automatiques si non fournis)
   */
  async createAsset(data?: Partial<Asset> & { fieldId?: number; marketId?: number; submarketId?: number }): Promise<Asset> {
    // Créer les dépendances si non fournies
    let fieldId = data?.fieldId;
    let marketId = data?.marketId;
    let submarketId = data?.submarketId;

    if (!marketId) {
      const market = await this.prisma.market.create({
        data: { title: `Market ${this.uniqueId()}` },
      });
      marketId = market.id;
    }

    if (!fieldId) {
      const field = await this.prisma.field.create({
        data: { name: `Field ${this.uniqueId()}`, marketId },
      });
      fieldId = field.id;
    }

    if (!submarketId) {
      const submarket = await this.prisma.submarket.create({
        data: { title: `Submarket ${this.uniqueId()}`, marketId },
      });
      submarketId = submarket.id;
    }

    return this.prisma.asset.create({
      data: {
        title: data?.title ?? `Asset ${this.uniqueId()}`,
        symbol: data?.symbol ?? `TST${this.counter}`,
        fieldId,
        marketId,
        submarketId,
        rate: data?.rate !== undefined ? data.rate : 1.0, // Respecter null explicite
        description: data?.description ?? null,
        maxAmount: data?.maxAmount ?? new Prisma.Decimal(100000),
        minAmount: data?.minAmount ?? new Prisma.Decimal(100),
      },
    });
  }

  /**
   * Crée une instance de jeu de test (avec wallet + gameUser automatiques)
   */
  async createGameInstance(data: { userId: string; levelId: number } & Partial<GameInstance>): Promise<GameInstance> {
    const gameInstance = await this.prisma.gameInstance.create({
      data: {
        userId: data.userId,
        levelId: data.levelId,
        type: data.type ?? null,
        startBalance: data.startBalance ?? 10000,
        isPaused: data.isPaused ?? false,
        pausedAt: data.pausedAt ?? null,
        actionRequired: data.actionRequired ?? false,
        totalPausedDuration: data.totalPausedDuration ?? 0,
        currentEventIndex: data.currentEventIndex ?? 0,
        isEnded: data.isEnded ?? false,
        endedAt: data.endedAt ?? null,
        marketId: data.marketId ?? null,
        createdAt: data.createdAt ?? undefined, // Utiliser la date par défaut de Prisma
      },
    });

    // Créer automatiquement un gameUser et un wallet (comme le vrai système)
    await this.prisma.gameUser.create({
      data: {
        userId: data.userId,
        gameInstanceId: gameInstance.id,
        isCreator: true,
        status: "ACTIVE",
      },
    });

    await this.prisma.wallet.create({
      data: {
        userId: data.userId,
        gameInstanceId: gameInstance.id,
        amount: data.startBalance ?? 10000,
      },
    });

    return gameInstance;
  }

  /**
   * Crée un wallet de test
   */
  async createWallet(data: { gameInstanceId: number } & Partial<Wallet>): Promise<Wallet> {
    return this.prisma.wallet.create({
      data: {
        gameInstanceId: data.gameInstanceId,
        amount: data.amount ?? new Prisma.Decimal(10000),
      },
    });
  }

  /**
   * Crée un holding de test
   */
  async createHolding(data: { 
    walletId: number; 
    assetId: number; 
    gameInstanceId: number 
  } & Partial<Holding>): Promise<Holding> {
    return this.prisma.holding.create({
      data: {
        walletId: data.walletId,
        assetId: data.assetId,
        gameInstanceId: data.gameInstanceId,
        quantity: data.quantity ?? new Prisma.Decimal(1000),
        acquiredAt: data.acquiredAt ?? new Date(),
      },
    });
  }

  /**
   * Crée un événement de test
   */
  async createEvent(data?: Partial<Event>): Promise<Event> {
    return this.prisma.event.create({
      data: {
        title: data?.title ?? `Event ${this.uniqueId()}`,
        description: data?.description ?? null,
        hasImpact: data?.hasImpact ?? null,
      },
    });
  }

  /**
   * Crée un événement de niveau de test
   */
  async createLevelEvent(data: {
    levelId: number;
    eventId: number;
  } & Partial<LevelEvent>): Promise<LevelEvent> {
    return this.prisma.levelEvent.create({
      data: {
        levelId: data.levelId,
        eventId: data.eventId,
        triggerPercent: data.triggerPercent ?? 50,
        position: data.position ?? 1,
      },
    });
  }

  /**
   * Crée un objectif de test
   */
  async createGoal(data?: Partial<Goal>): Promise<Goal> {
    return this.prisma.goal.create({
      data: {
        title: data?.title ?? `Goal ${this.uniqueId()}`,
        description: data?.description ?? null,
        goalType: data?.goalType ?? "net_worth",
        goalValue: data?.goalValue ?? 15000,
      },
    });
  }

  /**
   * Crée un objectif de niveau de test
   */
  async createLevelGoal(data: {
    levelId: number;
    goalId: number;
  } & Partial<LevelGoal>): Promise<LevelGoal> {
    return this.prisma.levelGoal.create({
      data: {
        levelId: data.levelId,
        goalId: data.goalId,
      },
    });
  }

  /**
   * Crée un setup complet pour tester investment service
   * Retourne user, level, gameInstance, wallet, market, field, submarket, asset
   */
  async createInvestmentTestSetup(overrides?: {
    startBalance?: number;
    assetRate?: number;
    assetMaxAmount?: number;
    assetMinAmount?: number;
  }) {
    // Créer les entités de base
    const market = await this.createMarket({});
    const field = await this.createField({ marketId: market.id });
    const submarket = await this.createSubmarket({ marketId: market.id });
    
    // Créer le level AVANT le user (FK constraint)
    const level = await this.createLevel({
      startBalance: overrides?.startBalance ?? 10000,
    });
    
    const user = await this.createUser({
      levelId: level.id, // Lier l'utilisateur au level
    });
    
    const gameInstance = await this.createGameInstance({
      userId: user.id,
      levelId: level.id,
      startBalance: overrides?.startBalance ?? 10000,
    });
    
    const wallet = await this.createWallet({
      gameInstanceId: gameInstance.id,
      amount: new Prisma.Decimal(overrides?.startBalance ?? 10000),
    });
    
    const asset = await this.createAsset({
      fieldId: field.id,
      marketId: market.id,
      submarketId: submarket.id,
      rate: overrides?.assetRate ?? 2.0,
      maxAmount: overrides?.assetMaxAmount 
        ? new Prisma.Decimal(overrides.assetMaxAmount) 
        : new Prisma.Decimal(50000),
      minAmount: overrides?.assetMinAmount 
        ? new Prisma.Decimal(overrides.assetMinAmount) 
        : new Prisma.Decimal(100),
    });
    
    return {
      user,
      level,
      gameInstance,
      wallet,
      market,
      field,
      submarket,
      asset,
    };
  }

  /**
   * Nettoie toutes les données de test (dans l'ordre pour respecter les contraintes FK)
   */
  async cleanup() {
    // Ordre important pour respecter les foreign keys
    await this.prisma.transaction.deleteMany({});
    await this.prisma.holding.deleteMany({});
    await this.prisma.wallet.deleteMany({});
    await this.prisma.gameInstanceEvent.deleteMany({});
    await this.prisma.notification.deleteMany({});
    await this.prisma.gameUser.deleteMany({});
    await this.prisma.gameInstance.deleteMany({});
    await this.prisma.user.deleteMany({}); // Supprimer les users AVANT les levels (FK)
    await this.prisma.levelGoal.deleteMany({});
    await this.prisma.levelEvent.deleteMany({});
    await this.prisma.goal.deleteMany({});
    await this.prisma.event.deleteMany({});
    await this.prisma.assetHistory.deleteMany({});
    await this.prisma.asset.deleteMany({});
    await this.prisma.submarket.deleteMany({});
    await this.prisma.field.deleteMany({});
    await this.prisma.market.deleteMany({});
    await this.prisma.level.deleteMany({});
  }
}
