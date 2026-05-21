import type { Prisma, PrismaClient } from "@cashou/db-app";
import defaultPrisma from "../../database.ts";
import { ExpoPushService } from "./expo-push.service.ts";
import { broadcastToGame, broadcastGameState } from "../../ws/game-socket.ts";

type PrismaTx = Prisma.TransactionClient;

export interface PendingGameEventPayload {
  gameInstanceId: number;
  eventId: number;
  title: string;
  body: string;
}

interface ProcessEventResult {
  success: boolean;
  reason?: string;
  payload?: PendingGameEventPayload;
}

/**
 * Service for processing scheduled game events.
 * This service handles the actual triggering of a GameInstanceEvent,
 * including creating notifications, pausing the game, and sending push notifications.
 */
export class GameEventProcessorService {
  private prisma: PrismaClient;
  private expoPushService: ExpoPushService;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || defaultPrisma;
    this.expoPushService = new ExpoPushService();
  }

  private buildPendingPayload(
    gameInstanceId: number,
    event: { id: number; title: string | null; description: string | null }
  ): PendingGameEventPayload {
    return {
      gameInstanceId,
      eventId: event.id,
      title: event.title ?? "Nouvel événement",
      body: event.description ?? "Un événement requiert votre attention dans le jeu.",
    };
  }

  private async waitForPendingEvent(
    userId: string,
    attempts: number = 3,
    delayMs: number = 25
  ): Promise<PendingGameEventPayload | null> {
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const pendingEvent = await this.findPendingEventForUser(userId);
      if (pendingEvent) {
        return pendingEvent;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    return null;
  }

  private async releaseEventClaim(gameInstanceEventId: number): Promise<void> {
    await this.prisma.gameInstanceEvent.updateMany({
      where: {
        id: gameInstanceEventId,
        triggeredAt: null,
      },
      data: {
        processingStartedAt: null,
      },
    });
  }

  async findPendingEventForUser(userId: string): Promise<PendingGameEventPayload | null> {
    const gameInstance = await this.prisma.gameInstance.findFirst({
      where: {
        userId,
        isEnded: false,
        actionRequired: true,
        isPaused: true,
      },
      select: {
        id: true,
      },
    });

    if (!gameInstance) {
      return null;
    }

    const triggeredEvent = await this.prisma.gameInstanceEvent.findFirst({
      where: {
        gameInstanceId: gameInstance.id,
        triggeredAt: { not: null },
      },
      orderBy: {
        triggeredAt: "desc",
      },
      include: {
        levelEvent: {
          include: {
            event: {
              select: {
                id: true,
                title: true,
                description: true,
              },
            },
          },
        },
      },
    });

    if (!triggeredEvent?.levelEvent?.event) {
      return null;
    }

    return this.buildPendingPayload(gameInstance.id, triggeredEvent.levelEvent.event);
  }

  async recoverAndProcessNextDueEventForUser(
    userId: string
  ): Promise<PendingGameEventPayload | null> {
    const overdueEvent = await this.prisma.gameInstanceEvent.findFirst({
      where: {
        scheduledAt: { lte: new Date() },
        triggeredAt: null,
        processingStartedAt: null,
        gameInstance: {
          userId,
          isEnded: false,
          actionRequired: { not: true },
        },
      },
      orderBy: { scheduledAt: "asc" },
      select: { id: true },
    });

    if (!overdueEvent) {
      return this.waitForPendingEvent(userId, 2, 25);
    }

    const result = await this.processEvent(overdueEvent.id);

    if (result.success && result.payload) {
      return result.payload;
    }

    if (result.reason === "Event already being processed") {
      const pendingEvent = await this.waitForPendingEvent(userId);
      if (pendingEvent) {
        return pendingEvent;
      }
    }

    return this.findPendingEventForUser(userId);
  }

  /**
   * Process a single GameInstanceEvent.
   *
   * This function:
   * 1. Atomically claims the event so only one worker/fallback can process it
   * 2. Validates the event can be processed (not already triggered, game not ended)
   * 3. Creates a Notification (type=EVENT) in the database
   * 4. Marks the event as triggered (sets triggeredAt = now)
   * 5. Pauses the game (isPaused = true, actionRequired = true)
   * 6. Sends an Expo push notification if user has expoPushToken
   *
   * @param gameInstanceEventId - The ID of the GameInstanceEvent to process
   */
  async processEvent(gameInstanceEventId: number): Promise<ProcessEventResult> {
    const claimTimestamp = new Date();
    const claimResult = await this.prisma.gameInstanceEvent.updateMany({
      where: {
        id: gameInstanceEventId,
        triggeredAt: null,
        processingStartedAt: null,
      },
      data: {
        processingStartedAt: claimTimestamp,
      },
    });

    if (claimResult.count === 0) {
      const currentEvent = await this.prisma.gameInstanceEvent.findUnique({
        where: { id: gameInstanceEventId },
        select: {
          triggeredAt: true,
          processingStartedAt: true,
        },
      });

      if (!currentEvent) {
        return { success: false, reason: "Event not found" };
      }
      if (currentEvent.triggeredAt) {
        return { success: false, reason: "Event already triggered" };
      }
      if (currentEvent.processingStartedAt) {
        return { success: false, reason: "Event already being processed" };
      }
      return { success: false, reason: "Event could not be claimed" };
    }

    const gameInstanceEvent = await this.prisma.gameInstanceEvent.findUnique({
      where: { id: gameInstanceEventId },
      include: {
        gameInstance: {
          include: {
            user: {
              select: {
                id: true,
                expoPushToken: true,
              },
            },
          },
        },
        levelEvent: {
          include: {
            event: true,
          },
        },
      },
    });

    if (!gameInstanceEvent) {
      await this.releaseEventClaim(gameInstanceEventId);
      return { success: false, reason: "Event not found" };
    }

    const { gameInstance, levelEvent } = gameInstanceEvent;
    const event = levelEvent.event;

    if (!gameInstance || !event) {
      await this.releaseEventClaim(gameInstanceEventId);
      return { success: false, reason: "Missing gameInstance or event" };
    }

    const userId = gameInstance.userId;
    const expoPushToken = gameInstance.user?.expoPushToken;

    if (!userId) {
      await this.releaseEventClaim(gameInstanceEventId);
      return { success: false, reason: "Game has no user" };
    }

    try {
      await this.prisma.$transaction(async (tx: PrismaTx) => {
        const currentEvent = await tx.gameInstanceEvent.findUnique({
          where: { id: gameInstanceEventId },
          select: {
            triggeredAt: true,
            processingStartedAt: true,
          },
        });

        if (currentEvent?.triggeredAt) {
          throw new Error("Event already triggered");
        }
        if (!currentEvent?.processingStartedAt) {
          throw new Error("Event claim lost");
        }

        const currentGame = await tx.gameInstance.findUnique({
          where: { id: gameInstance.id },
          select: {
            isEnded: true,
            isPaused: true,
            actionRequired: true,
            pausedAt: true,
          },
        });

        if (!currentGame) {
          throw new Error("Game not found");
        }
        if (currentGame.isEnded) {
          throw new Error("Game has ended");
        }
        if (currentGame.isPaused && currentGame.actionRequired) {
          throw new Error("Game already has pending action");
        }

        const pauseTimestamp =
          currentGame.isPaused && currentGame.pausedAt
            ? currentGame.pausedAt
            : new Date();

        await tx.gameInstance.update({
          where: { id: gameInstance.id },
          data: {
            isPaused: true,
            actionRequired: true,
            pausedAt: pauseTimestamp,
          },
        });

        await tx.notification.create({
          data: {
            userId,
            title: event.title ?? "Nouvel événement",
            message:
              event.description ??
              "Un événement requiert votre attention dans le jeu.",
            type: "EVENT",
            gameInstanceId: gameInstance.id,
            eventId: event.id,
            isOpened: false,
            sentAt: new Date(),
          },
        });

        await tx.gameInstanceEvent.update({
          where: { id: gameInstanceEventId },
          data: {
            triggeredAt: new Date(),
            processingStartedAt: null,
          },
        });
      });
    } catch (transactionError) {
      if (
        transactionError instanceof Error &&
        transactionError.message !== "Event already triggered"
      ) {
        await this.releaseEventClaim(gameInstanceEventId);
      }

      if (transactionError instanceof Error) {
        if (transactionError.message === "Event already triggered") {
          return {
            success: false,
            reason: "Event already triggered by another process",
          };
        }
        if (transactionError.message === "Game has ended") {
          return { success: false, reason: "Game has ended" };
        }
        if (transactionError.message === "Game already has pending action") {
          return { success: false, reason: "Game already has pending action" };
        }
        if (transactionError.message === "Game not found") {
          return { success: false, reason: "Game not found" };
        }
        if (transactionError.message === "Event claim lost") {
          return { success: false, reason: "Event claim lost" };
        }
      }
      throw transactionError;
    }

    const payload = this.buildPendingPayload(gameInstance.id, event);

    broadcastToGame(String(gameInstance.id), {
      type: "game:event",
      payload: {
        eventId: String(event.id),
        isPaused: true,
        actionRequired: true,
      },
    });
    await broadcastGameState(String(gameInstance.id), this.prisma);

    console.log(
      `[GameEventProcessor] Processing event ${gameInstanceEventId} for game ${gameInstance.id}: userId=${userId}, expoPushToken=${expoPushToken ? "SET" : "NOT SET"}`
    );

    if (expoPushToken) {
      try {
        console.log(
          `[GameEventProcessor] Sending push to token: ${expoPushToken.substring(0, 20)}...`
        );
        const pushResult = await this.expoPushService.sendPushNotification({
          pushToken: expoPushToken,
          title: payload.title,
          body: payload.body,
          data: {
            type: "EVENT",
            gameInstanceId: gameInstance.id,
            eventId: event.id,
          },
          channelId: "default",
          sound: "default",
        });

        console.log(
          `[GameEventProcessor] Push result:`,
          JSON.stringify(pushResult)
        );

        if (pushResult.success && pushResult.ticket) {
          const ticketId = (pushResult.ticket as { id?: string })?.id;
          console.log(
            `[GameEventProcessor] ✅ Push notification sent successfully for event ${gameInstanceEventId}`
          );
          console.log(`[GameEventProcessor] 📱 Ticket ID: ${ticketId}`);
        } else {
          console.error(
            `[GameEventProcessor] ❌ Push failed for event ${gameInstanceEventId}: ${pushResult.error}`
          );
        }
      } catch (pushError) {
        console.error(
          `[GameEventProcessor] Exception while sending push for event ${gameInstanceEventId}:`,
          pushError
        );
      }
    } else {
      console.warn(
        `[GameEventProcessor] ⚠️ Skipping push for event ${gameInstanceEventId}: user ${userId} has no expoPushToken. Notification was created in DB.`
      );
    }

    return { success: true, payload };
  }
}
