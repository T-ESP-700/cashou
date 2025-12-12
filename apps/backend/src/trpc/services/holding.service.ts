import type { Holding, PrismaClient } from "@cashou/db-app";
import { Prisma } from "@cashou/db-app";

import defaultPrisma from "../../database.ts";
import type {
  HoldingCreateSchema,
  HoldingUpdateSchema,
} from "../schemas-zod/holding-schema.ts";

export class HoldingService {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || defaultPrisma;
  }

  /**
   * Récupère tous les holdings
   */
  async findAll(): Promise<Holding[]> {
    return this.prisma.holding.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        asset: true,
        wallet: true,
        gameInstance: true,
      },
    });
  }

  /**
   * Récupère un holding par son ID
   */
  async findOne(id: number): Promise<Holding | null> {
    return this.prisma.holding.findUnique({
      where: { id },
      include: {
        asset: true,
        wallet: true,
        gameInstance: true,
      },
    });
  }

  /**
   * Récupère un holding par wallet et asset (unique constraint)
   */
  async findByWalletAndAsset(walletId: number, assetId: number): Promise<Holding | null> {
    return this.prisma.holding.findUnique({
      where: {
        walletId_assetId: {
          walletId,
          assetId,
        },
      },
      include: {
        asset: true,
        wallet: true,
        gameInstance: true,
      },
    });
  }

  /**
   * Récupère tous les holdings d'un wallet
   */
  async findByWallet(walletId: number): Promise<Holding[]> {
    return this.prisma.holding.findMany({
      where: { walletId },
      orderBy: { createdAt: "desc" },
      include: {
        asset: true,
      },
    });
  }

  /**
   * Récupère tous les holdings d'une instance de jeu
   */
  async findByGameInstance(gameInstanceId: number): Promise<Holding[]> {
    return this.prisma.holding.findMany({
      where: { gameInstanceId },
      orderBy: { createdAt: "desc" },
      include: {
        asset: true,
        wallet: true,
      },
    });
  }

  /**
   * Récupère tous les holdings d'un asset
   */
  async findByAsset(assetId: number): Promise<Holding[]> {
    return this.prisma.holding.findMany({
      where: { assetId },
      orderBy: { createdAt: "desc" },
      include: {
        wallet: true,
        gameInstance: true,
      },
    });
  }

  /**
   * Crée un holding
   */
  async create(data: HoldingCreateSchema): Promise<Holding> {
    const normalizedData = {
      ...data,
      quantity: new Prisma.Decimal(data.quantity),
      acquiredAt: data.acquiredAt || new Date(),
    };

    return this.prisma.holding.create({
      data: normalizedData,
      include: {
        asset: true,
        wallet: true,
        gameInstance: true,
      },
    });
  }

  /**
   * Met à jour un holding
   */
  async update(id: number, data: Partial<HoldingUpdateSchema>): Promise<Holding> {
    const normalizedData: Record<string, unknown> = { ...data };

    if (data.quantity !== undefined) {
      normalizedData.quantity = new Prisma.Decimal(data.quantity);
    }

    return this.prisma.holding.update({
      where: { id },
      data: normalizedData,
      include: {
        asset: true,
        wallet: true,
        gameInstance: true,
      },
    });
  }

  /**
   * Met à jour la quantité d'un holding
   */
  async updateQuantity(id: number, quantity: number): Promise<Holding> {
    return this.prisma.holding.update({
      where: { id },
      data: { quantity: new Prisma.Decimal(quantity) },
      include: {
        asset: true,
        wallet: true,
        gameInstance: true,
      },
    });
  }

  /**
   * Ajoute une quantité au holding existant
   */
  async addQuantity(id: number, amountToAdd: number): Promise<Holding> {
    const holding = await this.findOne(id);
    if (!holding) throw new Error("Holding introuvable");

    const currentQuantity = holding.quantity ? Number(holding.quantity) : 0;
    const newQuantity = currentQuantity + amountToAdd;

    return this.prisma.holding.update({
      where: { id },
      data: { quantity: new Prisma.Decimal(newQuantity) },
      include: {
        asset: true,
        wallet: true,
        gameInstance: true,
      },
    });
  }

  /**
   * Soustrait une quantité du holding existant
   */
  async subtractQuantity(id: number, amountToSubtract: number): Promise<Holding> {
    const holding = await this.findOne(id);
    if (!holding) throw new Error("Holding introuvable");

    const currentQuantity = holding.quantity ? Number(holding.quantity) : 0;
    const newQuantity = currentQuantity - amountToSubtract;

    if (newQuantity < 0) {
      throw new Error("Quantité insuffisante");
    }

    return this.prisma.holding.update({
      where: { id },
      data: { quantity: new Prisma.Decimal(newQuantity) },
      include: {
        asset: true,
        wallet: true,
        gameInstance: true,
      },
    });
  }

  /**
   * Supprime un holding
   */
  async delete(id: number): Promise<Holding> {
    return this.prisma.holding.delete({ where: { id } });
  }

  /**
   * Met à jour la date du dernier calcul d'intérêts
   */
  async updateLastInterestAt(id: number, date: Date = new Date()): Promise<Holding> {
    return this.prisma.holding.update({
      where: { id },
      data: { lastInterestAt: date },
    });
  }
}
