import type { Transaction, PrismaClient } from "@prisma/client";
import defaultPrisma from "../database.ts";
import type {
  TransactionCreateSchema,
  TransactionUpdateSchema,
} from "../schemas-zod/transaction-schema.ts";

export class TransactionService {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || defaultPrisma;
  }

  /**
   * Récupère toutes les transactions
   * @returns Promise<Transaction[]> - Liste complète des transactions triées par date de création décroissante
   */
  async findAll(): Promise<Transaction[]> {
    return this.prisma.transaction.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        wallet: true,
        asset: true,
        gameInstance: true,
      },
    });
  }

  /**
   * Récupère une transaction spécifique par son ID
   * @param id - Identifiant unique de la transaction
   * @returns Promise<Transaction | null> - La transaction trouvée ou null si inexistante
   */
  async findOne(id: number): Promise<Transaction | null> {
    return this.prisma.transaction.findUnique({
      where: { id },
      include: {
        wallet: true,
        asset: true,
        gameInstance: true,
      },
    });
  }

  /**
   * Crée une nouvelle transaction
   * @param data - Données validées par Zod
   * @returns Promise<Transaction> - La transaction créée
   */
  async create(data: TransactionCreateSchema): Promise<Transaction> {
    return this.prisma.transaction.create({ data });
  }

  /**
   * Met à jour une transaction existante
   * @param id - Identifiant de la transaction
   * @param data - Données partielles validées par Zod
   * @returns Promise<Transaction> - La transaction mise à jour
   */
  async update(
    id: number,
    data: Partial<TransactionUpdateSchema>
  ): Promise<Transaction> {
    return this.prisma.transaction.update({
      where: { id },
      data,
    });
  }

  /**
   * Supprime une transaction
   * @param id - Identifiant de la transaction
   * @returns Promise<Transaction> - La transaction supprimée (pour confirmation)
   */
  async delete(id: number): Promise<Transaction> {
    return this.prisma.transaction.delete({ where: { id } });
  }

  /**
   * Récupère toutes les transactions d’un portefeuille spécifique
   * @param walletId - Identifiant du portefeuille
   * @returns Promise<Transaction[]> - Liste des transactions liées au portefeuille
   */
  async findByWallet(walletId: number): Promise<Transaction[]> {
    return this.prisma.transaction.findMany({
      where: { walletId },
      orderBy: { transactionDate: "desc" },
      include: {
        asset: true,
        gameInstance: true,
      },
    });
  }

  /**
   * Récupère toutes les transactions d’un actif spécifique
   * @param assetId - Identifiant de l’actif
   * @returns Promise<Transaction[]> - Liste des transactions liées à cet actif
   */
  async findByAsset(assetId: number): Promise<Transaction[]> {
    return this.prisma.transaction.findMany({
      where: { assetId },
      orderBy: { transactionDate: "desc" },
    });
  }

  /**
   * Récupère les transactions par type (achat, vente, récompense, etc.)
   * @param type - Type de transaction
   * @returns Promise<Transaction[]> - Liste des transactions de ce type
   */
  async findByType(type: string): Promise<Transaction[]> {
    return this.prisma.transaction.findMany({
      where: { type },
      orderBy: { transactionDate: "desc" },
    });
  }

  /**
   * Calcule la valeur totale des transactions pour un portefeuille donné
   * @param walletId - Identifiant du portefeuille
   * @returns Promise<number> - Valeur totale (somme des totalValue)
   */
  async getTotalValueByWallet(walletId: number): Promise<number> {
    const transactions = await this.prisma.transaction.findMany({
      where: { walletId },
      select: { totalValue: true },
    });

    return transactions.reduce((sum, t) => {
      const value = t.totalValue ? Number(t.totalValue) : 0;
      return sum + value;
    }, 0);
  }
}
