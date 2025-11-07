import type { GameInstance, PrismaClient } from "@prisma/client";
import defaultPrisma from "../database.ts";
import type {
  GameInstanceCreateSchema,
  GameInstanceUpdateSchema,
} from "../schemas-zod/game-instance-schema.ts";

export class GameInstanceService {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || defaultPrisma;
  }

  /**
   * Récupère toutes les instances de jeu
   */
  async findAll(): Promise<GameInstance[]> {
    return this.prisma.gameInstance.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: true,
        level: true,
        wallets: true,
        transactions: true,
      },
    });
  }

  /**
   * Récupère une instance de jeu par ID
   */
  async findOne(id: number): Promise<GameInstance | null> {
    return this.prisma.gameInstance.findUnique({
      where: { id },
      include: {
        user: true,
        level: true,
        wallets: true,
        transactions: true,
      },
    });
  }

  /**
   * Crée une nouvelle instance de jeu
   */
  async create(data: GameInstanceCreateSchema): Promise<GameInstance> {
    return this.prisma.gameInstance.create({ data });
  }

  /**
   * Met à jour une instance existante
   */
  async update(id: number, data: Partial<GameInstanceUpdateSchema>): Promise<GameInstance> {
    return this.prisma.gameInstance.update({
      where: { id },
      data,
    });
  }

  /**
   * Supprime une instance de jeu
   */
  async delete(id: number): Promise<GameInstance> {
    return this.prisma.gameInstance.delete({ where: { id } });
  }

  /**
   * Récupère toutes les instances d’un utilisateur
   */
  async findByUser(userId: number): Promise<GameInstance[]> {
    return this.prisma.gameInstance.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Récupère toutes les instances d’un niveau
   */
  async findByLevel(levelId: number): Promise<GameInstance[]> {
    return this.prisma.gameInstance.findMany({
      where: { levelId },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Met en pause une instance de jeu
   */
  async pause(id: number): Promise<GameInstance> {
    return this.prisma.gameInstance.update({
      where: { id },
      data: { isPaused: true, pausedAt: new Date() },
    });
  }

  /**
   * Reprend une instance de jeu mise en pause
   */
  async resume(id: number): Promise<GameInstance> {
    return this.prisma.gameInstance.update({
      where: { id },
      data: { isPaused: false, pausedAt: null },
    });
  }

  /**
   * Met à jour le statut d’action requise
   */
  async setActionRequired(id: number, required: boolean): Promise<GameInstance> {
    return this.prisma.gameInstance.update({
      where: { id },
      data: { actionRequired: required },
    });
  }
}
