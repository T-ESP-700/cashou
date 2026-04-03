import type { PrismaClient } from "@cashou/db-app";
import defaultPrisma from "../../database.ts";
import { EndGameService, type EndGameResult } from "./end-game.service.ts";
import { NotificationService } from "./notification.service.ts";
import { ExpoPushService } from "./expo-push.service.ts";

export class GameEndTriggerService {
  private prisma: PrismaClient;
  private endGameService: EndGameService;
  private notificationService: NotificationService;
  private expoPushService: ExpoPushService;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || defaultPrisma;
    this.endGameService = new EndGameService(this.prisma);
    this.notificationService = new NotificationService(this.prisma);
    this.expoPushService = new ExpoPushService();
  }

  private buildAlreadyEndedResult(gameInstanceId: number): EndGameResult {
    return {
      success: false,
      gameInstanceId,
      startBalance: 0,
      walletBalance: 0,
      assetsValue: 0,
      totalValue: 0,
      goals: [],
      message: "La partie est déjà terminée",
      modal: {
        type: "PRIMARY_FAILURE",
        title: "Dommage !",
        primaryMessage: "La partie est déjà terminée.",
        secondaryMessage: null,
      },
    };
  }

  /**
   * Trigger game end:
   * 1. Mark game as ended (isPaused=true, isEnded=true, endedAt=now)
   * 2. Validate goals via EndGameService
   * 3. Create DB notification (type GAME_END)
   * 4. Send Expo push notification
   */
  async triggerGameEnd(gameInstanceId: number): Promise<EndGameResult> {
    const claimedAt = new Date();
    const claimResult = await this.prisma.gameInstance.updateMany({
      where: {
        id: gameInstanceId,
        isEnded: false,
        endingStartedAt: null,
      },
      data: {
        endingStartedAt: claimedAt,
        actionRequired: false,
      },
    });

    // Fetch game instance with user
    const gameInstance = await this.prisma.gameInstance.findUnique({
      where: { id: gameInstanceId },
      include: {
        user: true,
        level: true,
      },
    });

    if (!gameInstance) {
      throw new Error(`GameInstance ${gameInstanceId} not found`);
    }

    if (claimResult.count === 0) {
      console.log(`GameInstance ${gameInstanceId} already ended`);
      return this.buildAlreadyEndedResult(gameInstanceId);
    }

    console.log(`[GAME-ENDED] triggerGameEnd: gameInstanceId=${gameInstanceId}, levelId=${gameInstance.levelId}, userId=${gameInstance.userId}, reason=TRIGGER_GAME_END (time elapsed or scheduled job)`);
    let endGameResult: EndGameResult;

    try {
      endGameResult = await this.endGameService.endGame(gameInstanceId);
    } catch (error) {
      await this.prisma.gameInstance.updateMany({
        where: {
          id: gameInstanceId,
          isEnded: false,
        },
        data: {
          endingStartedAt: null,
        },
      });
      throw error;
    }

    console.log(
      `[GameEndTrigger] Goals validation for game ${gameInstanceId}: ${endGameResult.success ? "SUCCESS" : "FAILED"}`
    );

    // 2.5. Si tous les objectifs sont validés, passer au niveau suivant
    if (endGameResult.success && gameInstance.userId && gameInstance.levelId) {
      const nextLevel = await this.prisma.level.findFirst({
        where: {
          number: {
            gt: gameInstance.level?.number ?? 0,
          },
        },
        orderBy: { number: 'asc' },
      });

      if (nextLevel) {
        await this.prisma.user.update({
          where: { id: gameInstance.userId },
          data: { levelId: nextLevel.id },
        });
        console.log(
          `[GameEndTrigger] User ${gameInstance.userId} advanced to level ${nextLevel.number}`
        );
      } else {
        console.log(
          `[GameEndTrigger] User ${gameInstance.userId} completed all levels!`
        );
      }
    }

    // 3. Create notification message based on results
    const title = endGameResult.success
      ? "Niveau terminé - Objectifs atteints !"
      : "Niveau terminé - Objectifs non atteints";

    const goalsText = endGameResult.goals
      .map((g) => `${g.validated ? "✓" : "✗"} ${g.title}`)
      .join("\n");

    const message = `${endGameResult.message}\n\nObjectifs:\n${goalsText}`;

    // 4. Create DB notification
    if (gameInstance.userId) {
      await this.notificationService.create({
        user_id: gameInstance.userId,
        title,
        message,
        type: "GAME_END",
        game_instance_id: gameInstanceId,
        is_open: false,
        sent_at: new Date(),
      });

      // 5. Send Expo push notification
      if (gameInstance.user?.expoPushToken) {
        const pushBody = endGameResult.success
          ? `Bravo ! Total: ${endGameResult.totalValue}€`
          : `Total: ${endGameResult.totalValue}€. Réessayez !`;

        await this.expoPushService.sendPushNotification({
          pushToken: gameInstance.user.expoPushToken,
          title,
          body: pushBody,
          data: {
            type: "GAME_END",
            gameInstanceId,
            success: endGameResult.success,
            totalValue: endGameResult.totalValue,
          },
        });
      }
    }

    console.log(
      `[GameEndTrigger] Game ${gameInstanceId} ended. Success: ${endGameResult.success}`
    );

    return endGameResult;
  }

  /**
   * Check if a game has ended naturally (time elapsed)
   * and trigger end if needed
   */
  async checkAndTriggerEndIfNeeded(
    gameInstanceId: number
  ): Promise<EndGameResult | null> {
    const gameInstance = await this.prisma.gameInstance.findUnique({
      where: { id: gameInstanceId },
      include: { level: true },
    });

    if (!gameInstance || gameInstance.isEnded) {
      return null;
    }

    // Game should be ended, trigger it
    return this.triggerGameEnd(gameInstanceId);
  }
}
