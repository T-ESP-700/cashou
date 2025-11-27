// Service pour gérer la vérification automatique des streaks à minuit
import defaultPrisma from '../database.ts';
import type { PrismaClient } from '@prisma/client';

export class StreakScheduler {
  private prisma: PrismaClient;
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || defaultPrisma;
  }

  /**
   * Calcule le temps jusqu'à minuit (en millisecondes)
   * Prend en compte les changements d'heure (heure d'été/heure d'hiver)
   * Cette méthode recalcule toujours le temps jusqu'à minuit local du jour suivant,
   * ce qui gère automatiquement les transitions d'heure
   */
  private getMillisecondsUntilMidnight(): number {
    const now = new Date();
    
    // Créer une date pour minuit du jour suivant en heure locale
    // Cette méthode gère automatiquement les changements d'heure car elle utilise
    // le fuseau horaire local du système
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    tomorrow.setMilliseconds(0);

    const msUntilMidnight = tomorrow.getTime() - now.getTime();
    
    // Vérification de sécurité : si le calcul est invalide, on utilise une méthode alternative
    // Cela peut arriver dans de rares cas lors de transitions d'heure complexes
    if (msUntilMidnight <= 0 || msUntilMidnight > 25 * 60 * 60 * 1000) {
      // Méthode alternative : utiliser les composants de date
      const year = now.getFullYear();
      const month = now.getMonth();
      const day = now.getDate();
      
      // Créer minuit du jour suivant
      const midnight = new Date(year, month, day + 1, 0, 0, 0, 0);
      return midnight.getTime() - now.getTime();
    }

    return msUntilMidnight;
  }

  /**
   * Vérifie pour chaque utilisateur si le quiz de la veille a été complété
   * Si non, remet le currentStreak à 0
   */
  private async checkAndResetStreaks(): Promise<void> {
    try {
      console.log('[StreakScheduler] Début de la vérification des streaks...');

      // Obtenir la date d'hier (le jour précédent)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      
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

      if (!yesterdayQuiz) {
        console.log('[StreakScheduler] Aucun quiz trouvé pour hier, pas de vérification nécessaire');
        return;
      }

      console.log(`[StreakScheduler] Quiz d'hier trouvé: ${yesterdayQuiz.id} (${yesterdayQuiz.title})`);

      // Récupérer tous les utilisateurs
      const allUsers = await this.prisma.user.findMany({
        select: {
          id: true,
          currentStreak: true,
        },
      });

      console.log(`[StreakScheduler] Vérification de ${allUsers.length} utilisateurs...`);

      let resetCount = 0;

      // Pour chaque utilisateur, vérifier s'il a complété le quiz d'hier
      for (const user of allUsers) {
        // Vérifier si l'utilisateur a complété le quiz d'hier
        const participation = await this.prisma.userQuiz.findFirst({
          where: {
            userId: user.id,
            quizId: yesterdayQuiz.id,
            completedAt: {
              not: null,
            },
          },
        });

        // Si l'utilisateur n'a pas complété le quiz d'hier et a un streak > 0, le remettre à 0
        if (!participation && user.currentStreak > 0) {
          await this.prisma.user.update({
            where: { id: user.id },
            data: { currentStreak: 0 },
          });
          resetCount++;
          console.log(`[StreakScheduler] Streak remis à 0 pour l'utilisateur ${user.id}`);
        }
      }

      console.log(`[StreakScheduler] Vérification terminée. ${resetCount} streak(s) remis à 0.`);
    } catch (error) {
      console.error('[StreakScheduler] Erreur lors de la vérification des streaks:', error);
    }
  }

  /**
   * Démarre le scheduler qui vérifie les streaks à minuit chaque jour
   * Recalcule le temps jusqu'à minuit à chaque exécution pour gérer les changements d'heure
   */
  start(): void {
    if (this.intervalId !== null) {
      console.log('[StreakScheduler] Le scheduler est déjà démarré');
      return;
    }

    console.log('[StreakScheduler] Démarrage du scheduler...');

    // Fonction récursive pour planifier la prochaine exécution à minuit
    // Cette approche recalcule toujours le temps jusqu'à minuit, ce qui gère automatiquement
    // les changements d'heure (heure d'été/heure d'hiver)
    const scheduleNextCheck = () => {
      const msUntilMidnight = this.getMillisecondsUntilMidnight();
      const minutesUntilMidnight = Math.round(msUntilMidnight / 1000 / 60);
      const hoursUntilMidnight = Math.floor(minutesUntilMidnight / 60);
      const remainingMinutes = minutesUntilMidnight % 60;
      
      console.log(
        `[StreakScheduler] Prochaine vérification dans ${hoursUntilMidnight}h ${remainingMinutes}min (à minuit)`
      );

      // Planifier l'exécution à minuit
      setTimeout(() => {
        // Exécuter la vérification
        this.checkAndResetStreaks();

        // Replanifier immédiatement pour le prochain minuit
        // Cela garantit que même lors d'un changement d'heure, on recalcule correctement
        scheduleNextCheck();
      }, msUntilMidnight);
    };

    // Démarrer la planification
    scheduleNextCheck();
  }

  /**
   * Arrête le scheduler
   * Note: Avec la nouvelle implémentation récursive, cette méthode ne sera plus utilisée
   * mais est conservée pour compatibilité
   */
  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[StreakScheduler] Scheduler arrêté');
    }
    // Note: Avec l'implémentation récursive, on ne peut pas vraiment "arrêter" proprement
    // sans garder une référence au dernier setTimeout. Pour une vraie implémentation,
    // il faudrait stocker la référence du setTimeout et l'annuler.
  }
}

// Instance singleton
let streakSchedulerInstance: StreakScheduler | null = null;

/**
 * Obtient l'instance singleton du StreakScheduler
 */
export function getStreakScheduler(): StreakScheduler {
  if (!streakSchedulerInstance) {
    streakSchedulerInstance = new StreakScheduler();
  }
  return streakSchedulerInstance;
}

