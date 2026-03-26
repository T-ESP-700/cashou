import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../';
import { auth } from '@cashou/auth/server';
import { TRPCError } from '@trpc/server';
import { prisma } from '@cashou/db-app';
import { getUserActivityService } from '../../services/user-activity.service';
import { GameTimeService } from '../services/game-time.service';
import { GameEndTriggerService } from '../services/game-end-trigger.service';
import { GameEventProcessorService } from '../services/game-event-processor.service';
import { LevelCompletionService } from '../services/level-completion.service';

const gameEventProcessorService = new GameEventProcessorService(prisma);

export const authRouter = router({
  // Register a new user
  register: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(8),
        name: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const result = await auth.api.signUpEmail({
          body: {
            email: input.email,
            password: input.password,
            name: input.name || '',
          },
          headers: ctx.req.headers,
        });

        return {
          success: true,
          user: result.user,
          token: result.token,
        };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Registration failed';
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message,
        });
      }
    }),

  // Login
  login: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const result = await auth.api.signInEmail({
          body: {
            email: input.email,
            password: input.password,
          },
          headers: ctx.req.headers,
        });

        // Vérifier et mettre à jour l'activité de l'utilisateur après connexion
        if (result.user?.id) {
          const activityService = getUserActivityService();
          await activityService.checkAndUpdateUserActivity(result.user.id);
        }

        return {
          success: true,
          user: result.user,
          token: result.token,
        };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Invalid credentials';
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message,
        });
      }
    }),

  // Logout
  logout: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      await auth.api.signOut({
        headers: ctx.req.headers,
      });

      return { success: true };
    } catch {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Logout failed',
      });
    }
  }),

  // Get current user
  me: protectedProcedure.query(async ({ ctx }) => {
    // Vérifier et mettre à jour l'activité de l'utilisateur à chaque appel
    const activityService = getUserActivityService();
    await activityService.checkAndUpdateUserActivity(ctx.session.user.id);

    // Récupérer l'utilisateur complet depuis la base de données pour avoir tous les champs (currentStreak, maxStreak, etc.)
    const fullUser = await prisma.user.findUnique({
      where: { id: ctx.session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        createdAt: true,
        updatedAt: true,
        emailVerified: true,
        username: true,
        discriminator: true,
        lastActivity: true,
        levelId: true,
        badges: true,
        points: true,
        currentStreak: true,
        maxStreak: true,
      },
    });

    if (!fullUser) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'User not found',
      });
    }

    return {
      user: fullUser,
      session: ctx.session,
    };
  }),

  // Request password reset
  forgotPassword: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        await auth.api.forgetPassword({
          body: {
            email: input.email,
            redirectTo: (process.env.FRONTEND_URL || 'http://localhost:3000') + '/reset-password',
          },
        });

        return {
          success: true,
          message: 'Password reset email sent',
        };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to send reset email';
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message,
        });
      }
    }),

  // Reset password
  resetPassword: publicProcedure
    .input(
      z.object({
        token: z.string(),
        newPassword: z.string().min(8),
      })
    )
    .mutation(async ({ input }) => {
      try {
        await auth.api.resetPassword({
          body: {
            token: input.token,
            newPassword: input.newPassword,
          },
        });

        return {
          success: true,
          message: 'Password reset successful',
        };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to reset password';
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message,
        });
      }
    }),

  // Get home screen data (user + game info)
  getHomeData: protectedProcedure.query(async ({ ctx }) => {
    // Récupérer l'utilisateur avec son niveau et sa partie en cours
    const user = await prisma.user.findUnique({
      where: { id: ctx.session.user.id },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        points: true,
        currentStreak: true,
        maxStreak: true,
        levelId: true,
        level: {
          select: {
            id: true,
            number: true,
            title: true,
            description: true,
            startBalance: true,
            duration: true,
            speed: true,
          },
        },
        gameInstances: {
          where: {
            // Récupérer uniquement les parties non terminées
            isEnded: false,
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            isPaused: true,
            actionRequired: true,
            startBalance: true,
            createdAt: true,
            levelId: true,
            totalPausedDuration: true,
            pausedAt: true,
            isEnded: true,
            level: {
              select: {
                number: true,
                title: true,
                duration: true,
                speed: true,
              },
            },
            wallets: {
              select: {
                amount: true,
              },
            },
          },
        },
      },
    });

    // Récupérer aussi la dernière partie terminée pour afficher l'état "terminé"
    const lastCompletedGame = await prisma.gameInstance.findFirst({
      where: {
        userId: ctx.session.user.id,
        isEnded: true,
      },
      orderBy: { endedAt: 'desc' },
      select: {
        id: true,
        levelId: true,
        endedAt: true,
        level: {
          select: {
            id: true,
            number: true,
            title: true,
          },
        },
      },
    });

    const levelCompletionService = new LevelCompletionService();
    const lastCompletedStars =
      lastCompletedGame?.levelId != null
        ? await levelCompletionService.getCompletion(ctx.session.user.id, lastCompletedGame.levelId)
        : null;

    if (!user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'User not found',
      });
    }

    // Calculer la progression du niveau actuel si une partie est en cours
    const activeGameFromDb = user.gameInstances[0] || null;
    let activeGame: typeof activeGameFromDb | null = activeGameFromDb;
    let levelProgression = 0;
    let currentReturn = 0;

    // Vérifier si la partie aurait dû se terminer (safety net)
    // On soustrait les pauses pour ne pas terminer prématurément une partie en pause
    if (activeGame && activeGame.level) {
      const gameTimeService = new GameTimeService();
      const totalDurationSeconds = gameTimeService.calculateTotalDuration(activeGame.level as Parameters<typeof gameTimeService.calculateTotalDuration>[0]);
      const realElapsedSeconds = Math.floor((Date.now() - new Date(activeGame.createdAt).getTime()) / 1000);
      let effectiveElapsedSeconds = realElapsedSeconds - (activeGame.totalPausedDuration ?? 0);
      // Soustraire aussi la pause en cours si le jeu est actuellement en pause
      if (activeGame.isPaused && activeGame.pausedAt) {
        const currentPauseDuration = Math.floor((Date.now() - new Date(activeGame.pausedAt).getTime()) / 1000);
        effectiveElapsedSeconds -= currentPauseDuration;
      }
      effectiveElapsedSeconds = Math.max(0, effectiveElapsedSeconds);
      const shouldHaveEnded = effectiveElapsedSeconds >= totalDurationSeconds;

      console.log(`[getHomeData] Game ${activeGame.id} time check:`, {
        levelDuration: activeGame.level.duration,
        levelSpeed: activeGame.level.speed,
        totalDurationSeconds,
        realElapsedSeconds,
        effectiveElapsedSeconds,
        totalPausedDuration: activeGame.totalPausedDuration ?? 0,
        isPaused: activeGame.isPaused,
        shouldHaveEnded,
        isEnded: activeGame.isEnded,
      });

      if (shouldHaveEnded && !activeGame.isEnded) {
        // La partie aurait dû se terminer mais le job n'a pas été exécuté
        const gameId = activeGame.id;
        console.log(`[GAME-ENDED] getHomeData safety net: gameInstanceId=${gameId}, levelId=${activeGame.levelId}, userId=${ctx.session.user.id}, effectiveElapsedSeconds=${effectiveElapsedSeconds}, totalDurationSeconds=${totalDurationSeconds}, totalPausedDuration=${activeGame.totalPausedDuration ?? 0}, reason=SAFETY_NET_AUTO_END (time expired but job missed)`);
        try {
          const gameEndTriggerService = new GameEndTriggerService();
          await gameEndTriggerService.triggerGameEnd(gameId);
          // La partie est maintenant terminée, on ne la retourne plus comme active
          activeGame = null;
        } catch (error) {
          console.error(`[getHomeData] Failed to trigger game end for ${gameId}:`, error);
        }
      }
    }

    if (activeGame && activeGame.wallets.length > 0) {
      const currentBalance = Number(activeGame.wallets[0]?.amount || 0);
      const startBalance = Number(activeGame.startBalance || 10000);

      // Calcul du rendement (pourcentage de gain/perte par rapport au capital initial)
      currentReturn = startBalance > 0
        ? Math.round(((currentBalance - startBalance) / startBalance) * 100)
        : 0;

      // Progression basée sur le temps écoulé ou autres critères
      // Pour l'instant, on utilise une logique simple basée sur le rendement
      levelProgression = Math.min(100, Math.max(0, 50 + currentReturn));
    }

    return {
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        points: user.points,
        currentStreak: user.currentStreak,
        maxStreak: user.maxStreak,
      },
      level: user.level,
      activeGame: activeGame ? {
        id: activeGame.id,
        isPaused: activeGame.isPaused,
        actionRequired: activeGame.actionRequired,
        levelNumber: activeGame.level?.number || user.level?.number || 1,
        levelTitle: activeGame.level?.title || user.level?.title,
        progression: levelProgression,
        currentReturn,
      } : null,
      // Dernière partie terminée (pour afficher l'état "terminé" si pas de partie active)
      lastCompletedGame: lastCompletedGame ? {
        id: lastCompletedGame.id,
        levelId: lastCompletedGame.levelId,
        levelNumber: lastCompletedGame.level?.number,
        levelTitle: lastCompletedGame.level?.title,
        endedAt: lastCompletedGame.endedAt,
        stars: lastCompletedStars?.stars ?? 0,
        mandatoryGoalsMet: lastCompletedStars?.mandatoryGoalsMet,
        bonusGoalsMet: lastCompletedStars?.bonusGoalsMet,
        quizPassed: lastCompletedStars?.quizPassed,
      } : null,
    };
  }),

  // Get pending event that requires user action (fallback for when push notification didn't work)
  // Also self-heals: if pg-boss missed an overdue event, processes it inline
  getPendingEvent: protectedProcedure.query(async ({ ctx }) => {
    console.log(`[getPendingEvent] Called for user ${ctx.session.user.id}`);
    const pendingEvent = await gameEventProcessorService.findPendingEventForUser(
      ctx.session.user.id
    );

    console.log(
      `[getPendingEvent] Path 1 — pending event:`,
      pendingEvent ? `game=${pendingEvent.gameInstanceId}, event=${pendingEvent.eventId}` : 'null'
    );

    if (pendingEvent) {
      return pendingEvent;
    }

    const recoveredEvent =
      await gameEventProcessorService.recoverAndProcessNextDueEventForUser(
        ctx.session.user.id
      );

    console.log(
      `[getPendingEvent] Path 2 — recovered event:`,
      recoveredEvent
        ? `game=${recoveredEvent.gameInstanceId}, event=${recoveredEvent.eventId}`
        : 'null'
    );

    return recoveredEvent;
  }),

  // Get pending GAME_END notification that hasn't been seen yet (fallback for push)
  getPendingGameEnd: protectedProcedure.query(async ({ ctx }) => {
    const unseenNotification = await prisma.notification.findFirst({
      where: {
        userId: ctx.session.user.id,
        type: 'GAME_END',
        isOpened: false,
      },
      orderBy: { sentAt: 'desc' },
      select: { gameInstanceId: true },
    });

    if (!unseenNotification?.gameInstanceId) return null;
    return { gameInstanceId: unseenNotification.gameInstanceId };
  }),
});
