import type { PrismaClient } from "@cashou/db-app";
import defaultPrisma from "../../database.ts";
import { ExpoPushService } from "./expo-push.service.ts";
import { broadcastToGame } from "../../ws/game-socket.ts";

interface ProcessEventResult {
  success: boolean;
  reason?: string;
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

  /**
   * Process a single GameInstanceEvent.
   *
   * This function:
   * 1. Validates the event can be processed (not already triggered, game not ended)
   * 2. Creates a Notification (type=EVENT) in the database
   * 3. Marks the event as triggered (sets triggeredAt = now)
   * 4. Pauses the game (isPaused = true, actionRequired = true)
   * 5. Sends an Expo push notification if user has expoPushToken
   *
   * @param gameInstanceEventId - The ID of the GameInstanceEvent to process
   */
  async processEvent(gameInstanceEventId: number): Promise<ProcessEventResult> {
    // Fetch the event with all necessary relations
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
      return { success: false, reason: "Event not found" };
    }

    // Check if already triggered
    if (gameInstanceEvent.triggeredAt) {
      return { success: false, reason: "Event already triggered" };
    }

    const { gameInstance, levelEvent } = gameInstanceEvent;
    const event = levelEvent.event;

    if (!gameInstance || !event) {
      return { success: false, reason: "Missing gameInstance or event" };
    }

    // Check if game is ended
    if (gameInstance.isEnded) {
      return { success: false, reason: "Game has ended" };
    }

    // Check if game is already paused with action required (another event pending)
    // Manual pause (actionRequired=false) should NOT block events from firing
    if (gameInstance.isPaused && gameInstance.actionRequired) {
      return { success: false, reason: "Game already has pending action" };
    }

    const userId = gameInstance.userId;
    const expoPushToken = gameInstance.user?.expoPushToken;

    if (!userId) {
      return { success: false, reason: "Game has no user" };
    }

    // Use a transaction to ensure atomicity
    try {
      await this.prisma.$transaction(async (tx) => {
        // Double-check the event hasn't been triggered (race condition protection)
        const currentEvent = await tx.gameInstanceEvent.findUnique({
          where: { id: gameInstanceEventId },
          select: { triggeredAt: true },
        });

        if (currentEvent?.triggeredAt) {
          throw new Error("Event already triggered");
        }

        // Check if game has ended (race condition protection against concurrent triggerGameEnd)
        const currentGame = await tx.gameInstance.findUnique({
          where: { id: gameInstance.id },
          select: { isEnded: true },
        });
        if (currentGame?.isEnded) {
          throw new Error("Game has ended");
        }

        // Pause the game and require user action
        const pauseTimestamp =
          gameInstance.isPaused && gameInstance.pausedAt
            ? gameInstance.pausedAt
            : new Date();

        await tx.gameInstance.update({
          where: { id: gameInstance.id },
          data: {
            isPaused: true,
            actionRequired: true,
            pausedAt: pauseTimestamp,
          },
        });

        // Create Notification in the database
        await tx.notification.create({
          data: {
            userId,
            title: event.title ?? "Nouvel événement",
            message: event.description ?? "Un événement requiert votre attention dans le jeu.",
            type: "EVENT",
            gameInstanceId: gameInstance.id,
            eventId: event.id,
            isOpened: false,
            sentAt: new Date(),
          },
        });

        // Event impacts are now applied on-the-fly to prices (not holdings).
        // The AssetHistoryService.findForGame() applies coefs when returning price data.
        // Holdings quantities remain unchanged — gains/losses come from price evolution.

        // Mark the event as triggered
        await tx.gameInstanceEvent.update({
          where: { id: gameInstanceEventId },
          data: { triggeredAt: new Date() },
        });
      });
    } catch (transactionError) {
      if (transactionError instanceof Error) {
        if (transactionError.message === "Event already triggered") {
          return { success: false, reason: "Event already triggered by another process" };
        }
        if (transactionError.message === "Game has ended") {
          return { success: false, reason: "Game has ended" };
        }
      }
      throw transactionError;
    }

    // Broadcast event to WebSocket clients
    broadcastToGame(String(gameInstance.id), {
      type: "game:event",
      payload: {
        eventId: String(event.id),
        isPaused: true,
        actionRequired: true,
      },
    });

    // Send Expo push notification (outside transaction since it's external)
    console.log(
      `[GameEventProcessor] Processing event ${gameInstanceEventId} for game ${gameInstance.id}: userId=${userId}, expoPushToken=${expoPushToken ? 'SET' : 'NOT SET'}`
    );

    if (expoPushToken) {
      try {
        console.log(`[GameEventProcessor] Sending push to token: ${expoPushToken.substring(0, 20)}...`);
        const pushResult = await this.expoPushService.sendPushNotification({
          pushToken: expoPushToken,
          title: event.title ?? "Nouvel événement",
          body: event.description ?? "Un événement requiert votre attention dans le jeu.",
          data: {
            type: "EVENT",
            gameInstanceId: gameInstance.id,
            eventId: event.id,
          },
          channelId: "default",
          sound: "default",
        });

        console.log(`[GameEventProcessor] Push result:`, JSON.stringify(pushResult));

        if (pushResult.success && pushResult.ticket) {
          const ticketId = (pushResult.ticket as { id?: string })?.id;
          console.log(`[GameEventProcessor] ✅ Push notification sent successfully for event ${gameInstanceEventId}`);
          console.log(`[GameEventProcessor] 📱 Ticket ID: ${ticketId}`);
        } else {
          console.error(`[GameEventProcessor] ❌ Push failed for event ${gameInstanceEventId}: ${pushResult.error}`);
        }
      } catch (pushError) {
        // Log but don't fail the event - the notification was created
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

    return { success: true };
  }
}
