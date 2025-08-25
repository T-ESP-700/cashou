import { prisma } from '../database';
import type { 
  CreateMarketDto, 
  UpdateMarketDto, 
  MarketQuery,
  MarketWithRelations 
} from '../types/market.types';

export class MarketService {
  /**
   * Récupère tous les markets avec pagination et filtres optionnels
   */
  async getAllMarkets(query: MarketQuery = {}) {
    const {
      name,
      includeSubmarkets = false,
      includeAssets = false,
      includeFields = false,
      page = 1,
      limit = 10
    } = query;

    const skip = (page - 1) * limit;

    const where = {
      ...(name && {
        name: {
          contains: name,
          mode: 'insensitive' as const
        }
      })
    };

    const include = {
      submarkets: includeSubmarkets ? {
        select: {
          id: true,
          name: true,
          description: true
        }
      } : false,
      assets: includeAssets ? {
        select: {
          id: true,
          title: true,
          symbol: true
        }
      } : false,
      fields: includeFields ? {
        select: {
          id: true,
          title: true
        }
      } : false
    };

    const [markets, total] = await Promise.all([
      prisma.market.findMany({
        where,
        include,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc'
        }
      }),
      prisma.market.count({ where })
    ]);

    return {
      data: markets,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Récupère un market par son ID
   */
  async getMarketById(id: number, includeRelations = false): Promise<MarketWithRelations | null> {
    const include = includeRelations ? {
      submarkets: {
        select: {
          id: true,
          name: true,
          description: true
        }
      },
      assets: {
        select: {
          id: true,
          title: true,
          symbol: true
        }
      },
      fields: {
        select: {
          id: true,
          title: true
        }
      }
    } : undefined;

    return await prisma.market.findUnique({
      where: { id },
      include
    });
  }

  /**
   * Crée un nouveau market
   */
  async createMarket(data: CreateMarketDto) {
    return await prisma.market.create({
      data: {
        name: data.name,
        description: data.description,
        currentTrends: data.currentTrends,
        dataSource: data.dataSource
      }
    });
  }

  /**
   * Met à jour un market existant
   */
  async updateMarket(id: number, data: UpdateMarketDto) {
    return await prisma.market.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.currentTrends !== undefined && { currentTrends: data.currentTrends }),
        ...(data.dataSource !== undefined && { dataSource: data.dataSource })
      }
    });
  }

  /**
   * Supprime un market
   */
  async deleteMarket(id: number) {
    return await prisma.market.delete({
      where: { id }
    });
  }

  /**
   * Vérifie si un market existe
   */
  async marketExists(id: number): Promise<boolean> {
    const market = await prisma.market.findUnique({
      where: { id },
      select: { id: true }
    });
    return !!market;
  }

  /**
   * Récupère les statistiques d'un market
   */
  async getMarketStats(id: number) {
    const [submarketCount, assetCount, fieldCount] = await Promise.all([
      prisma.submarket.count({ where: { marketId: id } }),
      prisma.asset.count({ where: { marketId: id } }),
      prisma.field.count({ where: { marketId: id } })
    ]);

    return {
      submarketCount,
      assetCount,
      fieldCount
    };
  }

  /**
   * Recherche des markets par nom ou description
   */
  async searchMarkets(searchTerm: string, limit = 10) {
    return await prisma.market.findMany({
      where: {
        OR: [
          {
            name: {
              contains: searchTerm,
              mode: 'insensitive'
            }
          },
          {
            description: {
              contains: searchTerm,
              mode: 'insensitive'
            }
          }
        ]
      },
      take: limit,
      orderBy: {
        name: 'asc'
      }
    });
  }
}
