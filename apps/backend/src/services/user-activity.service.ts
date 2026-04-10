// Service pour gérer la vérification de l'activité utilisateur et des streaks à la connexion
import defaultPrisma from '../database.ts';
import type { PrismaClient } from '@prisma/client';

const LAST_ACTIVITY_THROTTLE_MS = 60 * 1000;
const PARIS_DATE_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Paris',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export class UserActivityService {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || defaultPrisma;
  }

  private getParisDateKey(date: Date): string {
    return PARIS_DATE_FORMATTER.format(date);
  }

  /**
   * Vérifie et met à jour l'activité de l'utilisateur et les streaks
   * Cette fonction est appelée à chaque connexion de l'utilisateur
   * @param userId - Identifiant de l'utilisateur (string)
   */
  async checkAndUpdateUserActivity(userId: string): Promise<void> {
    try {
      const now = new Date();
      const todayParisKey = this.getParisDateKey(now);

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
      const lastActivityParisKey = this.getParisDateKey(lastActivityDate);

      if (lastActivityParisKey === todayParisKey) {
        // Si l'activité du jour a déjà été touchée très récemment, éviter un UPDATE inutile.
        if (now.getTime() - lastActivityDate.getTime() < LAST_ACTIVITY_THROTTLE_MS) {
          return;
        }

        await this.prisma.user.update({
          where: { id: userId },
          data: { lastActivity: now },
        });
        return;
      }

      // Si c'est une date antérieure → vérifier le quiz de la veille
      if (lastActivityDate.getTime() < now.getTime()) {
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayParisKey = this.getParisDateKey(yesterday);

        // Trouver le quiz Daily d'hier (date Paris)
        const dailyQuizzes = await this.prisma.quiz.findMany({
          where: { type: 'DAILY' },
          select: { id: true, date: true, createdAt: true },
          orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
          take: 120,
        });
        const yesterdayQuiz = dailyQuizzes.find((quiz) => {
          const refDate = quiz.date ?? quiz.createdAt;
          return this.getParisDateKey(new Date(refDate)) === yesterdayParisKey;
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
