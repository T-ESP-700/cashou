import { prisma } from '../database';
import type { 
  LevelQuery,
  LevelWithRelations 
} from '../types/level.types';

export class LevelService {
  /**
   * Récupère tous les levels avec pagination et filtres optionnels
   */
  async getAllLevels(query: LevelQuery = {}) {
    const {
      number,
      includeUsers = false,
      includeGameInstances = false,
      includeQuiz = false,
      includeGoals = false,
      page = 1,
      limit = 10
    } = query;

    const skip = (page - 1) * limit;

    const where = {
      ...(number && { number })
    };

    const include = {
      users: includeUsers ? {
        select: {
          id: true,
          username: true,
          email: true
        }
      } : false,
      gameInstances: includeGameInstances ? {
        select: {
          id: true,
          type: true,
          isPaused: true
        }
      } : false,
      quiz: includeQuiz ? {
        select: {
          id: true,
          type: true,
          title: true
        }
      } : false,
      levelGoals: includeGoals ? {
        select: {
          id: true,
          goal: {
            select: {
              id: true,
              title: true,
              description: true
            }
          }
        }
      } : false
    };

    const [levels, total] = await Promise.all([
      prisma.level.findMany({
        where,
        include,
        skip,
        take: limit,
        orderBy: {
          number: 'asc'
        }
      }),
      prisma.level.count({ where })
    ]);

    return {
      data: levels,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }
}
