import { prisma } from '../database';
import type { 
  QuizQuery,
  QuizWithRelations 
} from '../types/quiz.types';

export class QuizService {
  /**
   * Récupère tous les quiz avec pagination et filtres optionnels
   */
  async getAllQuiz(query: QuizQuery = {}) {
    const {
      type,
      levelId,
      includeLevel = false,
      includeUserQuiz = false,
      includeQuestions = false,
      page = 1,
      limit = 10
    } = query;

    const skip = (page - 1) * limit;

    const where = {
      ...(type && { type }),
      ...(levelId && { levelId })
    };

    const include = {
      level: includeLevel ? {
        select: {
          id: true,
          title: true,
          number: true
        }
      } : false,
      userQuiz: includeUserQuiz ? {
        select: {
          id: true,
          userId: true,
          completedAt: true,
          isCorrect: true
        }
      } : false,
      quizQuestions: includeQuestions ? {
        select: {
          id: true,
          questionId: true,
          position: true,
          question: {
            select: {
              id: true,
              text: true
            }
          }
        },
        orderBy: {
          position: 'asc' as const
        }
      } : false
    };

    const [quiz, total] = await Promise.all([
      prisma.quiz.findMany({
        where,
        include,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc'
        }
      }),
      prisma.quiz.count({ where })
    ]);

    return {
      data: quiz,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }
}
