// Import depuis @cashou/db-app (et non @prisma/client) car Bun crée des copies séparées
// de @prisma/client par contexte de résolution, ce qui cause des types incompatibles
import type { Wallet, PrismaClient } from "@cashou/db-app";
import { Prisma } from "@cashou/db-app";

import defaultPrisma from "../../database.ts";
import type {
  WalletCreateSchema,
  WalletUpdateSchema,
} from "../schemas-zod/wallet-schema.ts";

export class WalletService {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || defaultPrisma;
  }

  /**
   * Récupère tous les portefeuilles
   * @returns Promise<Wallet[]> - Liste complète des portefeuilles triés par date de création décroissante
   */
  async findAll(): Promise<Wallet[]> {
    return this.prisma.wallet.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        // user: true,
        gameInstance: true,
      },
    });
  }

  /**
   * Récupère un portefeuille par son ID
   * @param id - Identifiant du portefeuille
   */
  async findOne(id: number): Promise<Wallet | null> {
    return this.prisma.wallet.findUnique({
      where: { id },
      include: {
        // user: true,
        gameInstance: true,
      },
    });
  }

  /**
   * Crée un portefeuille
   * @param data - Données validées par Zod
   */

   async create(data: WalletCreateSchema): Promise<Wallet> {
     // 🧹 Normalize amount for Prisma.Decimal
     const normalizedData = {
       ...data,
       amount:
         data.amount === null || data.amount === undefined
           ? null
           : new Prisma.Decimal(
               typeof data.amount === "string"
                 ? (data.amount as string).replace(/,/g, "")
                 : String(data.amount)
             ),
     };

     // 💾 Create the wallet record
     const wallet = await this.prisma.wallet.create({ data: normalizedData });

     // 🌱 Seed non-empty starting assets configured on the level (ex: Livret A déjà
     // provisionné). Ce sont des Holding créés directement, sans Transaction : ce
     // n'est pas un achat du joueur, juste l'état initial de la partie.
     if (wallet.gameInstanceId) {
       await this.seedStartingHoldings(wallet.gameInstanceId, wallet.id);
     }

     // 🔢 Convert Decimal to number for API output
     return {
       ...wallet,
       amount: wallet.amount ? Number(wallet.amount) : wallet.amount,
     } as unknown as Wallet;
   }

   private async seedStartingHoldings(gameInstanceId: number, walletId: number): Promise<void> {
     const gameInstance = await this.prisma.gameInstance.findUnique({
       where: { id: gameInstanceId },
       select: { levelId: true },
     });
     if (!gameInstance?.levelId) return;

     const startingHoldings = await this.prisma.levelStartingHolding.findMany({
       where: { levelId: gameInstance.levelId },
     });
     if (startingHoldings.length === 0) return;

     await this.prisma.holding.createMany({
       data: startingHoldings.map((sh) => ({
         walletId,
         assetId: sh.assetId,
         gameInstanceId,
         quantity: sh.quantity,
       })),
       skipDuplicates: true,
     });
   }

  /**
   * Met à jour un portefeuille
   * @param id - ID du portefeuille
   * @param data - Données validées par Zod
   */
  async update(id: number, data: Partial<WalletUpdateSchema>): Promise<Wallet> {
    return this.prisma.wallet.update({
      where: { id },
      data,
    });
  }

  /**
   * Supprime un portefeuille
   * @param id - Identifiant du portefeuille
   */
  async delete(id: number): Promise<Wallet> {
    return this.prisma.wallet.delete({ where: { id } });
  }

  /**
   * Récupère tous les portefeuilles d'un utilisateur
   * @param userId - Identifiant de l'utilisateur
   */
  async findByUser(userId: string): Promise<Wallet[]> {
    return this.prisma.wallet.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Récupère tous les portefeuilles d’une instance de jeu
   * @param gameInstanceId - Identifiant de l’instance de jeu
   */
  async findByGameInstance(gameInstanceId: number): Promise<Wallet[]> {
    return this.prisma.wallet.findMany({
      where: { gameInstanceId },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Met à jour le montant du portefeuille
   * @param id - Identifiant du portefeuille
   * @param amount - Nouveau montant
   */
  async updateAmount(id: number, amount: number): Promise<Wallet> {
    return this.prisma.wallet.update({
      where: { id },
      data: { amount: amount.toString() },
    });
  }

  /**
   * Ajoute un montant au portefeuille
   * @param id - Identifiant du portefeuille
   * @param amountToAdd - Montant à ajouter
   */
  async addAmount(id: number, amountToAdd: number): Promise<Wallet> {
    return this.prisma.wallet.update({
      where: { id },
      data: { amount: { increment: amountToAdd } },
    });
  }
}
