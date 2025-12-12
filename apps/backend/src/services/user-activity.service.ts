// Service pour gérer la vérification de l'activité utilisateur et des streaks à la connexion
import defaultPrisma from '../database.ts';
import type { PrismaClient } from '@cashou/db-app';

export class UserActivityService {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || defaultPrisma;
  }

  /**
   * Vérifie et met à jour l'activité de l'utilisateur et les streaks
   * Cette fonction est appelée à chaque connexion de l'utilisateur
   * @param userId - Identifiant de l'utilisateur (string)
   */
  async checkAndUpdateUserActivity(userId: string): Promise<void> {
    try {
      const now = new Date();
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);
      const todayEnd = new Date(today);
      todayEnd.setHours(23, 59, 59, 999);

      // Récupérer l'utilisateur avec lastActivity
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          lastActivity: true,
          currentStreak: true,
        },
      });

      if (!user) {
        return; // Utilisateur introuvable
      }

      // Cas 1: lastActivity est null → le remplir avec la date/heure actuelle
      if (!user.lastActivity) {
        await this.prisma.user.update({
          where: { id: userId },
          data: { lastActivity: now },
        });
        return;
      }

      // Cas 2: lastActivity n'est pas null
      const lastActivityDate = new Date(user.lastActivity);
      const lastActivityDay = new Date(lastActivityDate);
      lastActivityDay.setHours(0, 0, 0, 0);

      // Si c'est la date du jour → mettre à jour avec la date/heure actuelle
      if (lastActivityDay.getTime() === today.getTime()) {
        await this.prisma.user.update({
          where: { id: userId },
          data: { lastActivity: now },
        });
        return;
      }

      // Si c'est une date antérieure → vérifier le quiz de la veille
      if (lastActivityDay.getTime() < today.getTime()) {
        // Calculer la date d'hier
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayEnd = new Date(yesterday);
        yesterdayEnd.setHours(23, 59, 59, 999);

        // Trouver le quiz Daily d'hier
        const yesterdayQuiz = await this.prisma.quiz.findFirst({
          where: {
            type: 'DAILY',
            OR: [
              {
                date: {
                  gte: yesterday,
                  lte: yesterdayEnd,
                },
              },
              {
                date: null,
                createdAt: {
                  gte: yesterday,
                  lte: yesterdayEnd,
                },
              },
            ],
          },
        });

        // Si un quiz existe pour hier, vérifier s'il a été complété
        let shouldResetStreak = false;
        if (yesterdayQuiz) {
          const participation = await this.prisma.userQuiz.findFirst({
            where: {
              userId: userId,
              quizId: yesterdayQuiz.id,
              completedAt: {
                not: null,
              },
            },
          });

          // Si l'utilisateur n'a pas complété le quiz d'hier et a un streak > 0, le remettre à 0
          if (!participation && user.currentStreak > 0) {
            shouldResetStreak = true;
          }
        }
        // Si aucun quiz n'existe pour hier, on ne fait rien (pas de remise à zéro du streak)

        // Mettre à jour lastActivity et éventuellement currentStreak
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            lastActivity: now,
            ...(shouldResetStreak && { currentStreak: 0 }),
          },
        });
      }
    } catch (error) {
      console.error('[UserActivityService] Erreur lors de la vérification de l\'activité:', error);
      // Ne pas bloquer la connexion en cas d'erreur
    }
  }
}

// Instance singleton
let userActivityServiceInstance: UserActivityService | null = null;

/**
 * Obtient l'instance singleton du UserActivityService
 */
export function getUserActivityService(): UserActivityService {
  if (!userActivityServiceInstance) {
    userActivityServiceInstance = new UserActivityService();
  }
  return userActivityServiceInstance;
}

