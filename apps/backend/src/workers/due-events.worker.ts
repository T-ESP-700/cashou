import prisma from "../database.ts";
import { ExpoPushService } from "../trpc/services/expo-push.service.ts";
import { GameInstanceEventService } from "../trpc/services/game-instance-event.service.ts";

const expoPushService = new ExpoPushService();
const gameInstanceEventService = new GameInstanceEventService(prisma);

/**
 * Process all due GameInstanceEvents.
 *
 * This worker function:
 * 1. Finds all events where scheduledAt <= now AND triggeredAt IS NULL
 *    AND gameInstance.isEnded = false AND gameInstance.userId IS NOT NULL
 * 2. For each due event:
 *    - Creates a Notification (type=EVENT) in the database
 *    - Marks the event as triggered (sets triggeredAt = now)
 *    - Sends an Expo push notification if user has expoPushToken
 *
 * Note: We process events even for paused games, as the game being paused
 * is often a result of the event triggering, not a reason to skip processing.
 *
 * All database operations for a single event are wrapped in a transaction for atomicity.
 * Push notifications are sent outside the transaction since they're external API calls.
 *
 * This function is designed to be called periodically (e.g., via setInterval or cron).
 * It's safe to call frequently as it only processes events that haven't been triggered yet.
 */
export async function processDueGameInstanceEvents(): Promise<{
  processed: number;
  errors: number;
}> {
  const dueEvents = await gameInstanceEventService.findDueEvents();

  if (dueEvents.length === 0) {
    return { processed: 0, errors: 0 };
  }

  console.log(`[DueEventsWorker] Found ${dueEvents.length} due events to process`);

  let processed = 0;
  let errors = 0;

  for (const gameInstanceEvent of dueEvents) {
    try {
      const { gameInstance, levelEvent } = gameInstanceEvent;
      const event = levelEvent.event;

      if (!gameInstance || !event) {
        console.warn(
          `[DueEventsWorker] Skipping event ${gameInstanceEvent.id}: missing gameInstance or event`
        );
        continue;
      }

      const userId = gameInstance.userId;
      const expoPushToken = gameInstance.user?.expoPushToken;

      // Validate we have the necessary data
      if (!userId) {
        console.warn(
          `[DueEventsWorker] Skipping event ${gameInstanceEvent.id}: gameInstance has no userId`
        );
        continue;
      }

      // Use a transaction to create notification and mark event as triggered atomically
      // This prevents race conditions where multiple cron runs could process the same event
      try {
        await prisma.$transaction(async (tx) => {
          // Double-check the event hasn't been triggered by another process (race condition protection)
          const currentEvent = await tx.gameInstanceEvent.findUnique({
            where: { id: gameInstanceEvent.id },
            select: { triggeredAt: true },
          });

          if (currentEvent?.triggeredAt) {
            console.warn(
              `[DueEventsWorker] Event ${gameInstanceEvent.id} already triggered by another process, skipping`
            );
            // Throw to abort transaction, but catch outside to continue processing other events
            throw new Error("Event already triggered");
          }

          // Pause the game and require user action so gameplay freezes immediately
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

          // 1. Create Notification in the database
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

          // 2. Mark the event as triggered (AFTER notification is created)
          await tx.gameInstanceEvent.update({
            where: { id: gameInstanceEvent.id },
            data: { triggeredAt: new Date() },
          });
        });
      } catch (transactionError) {
        // If event was already triggered by another process, skip it and continue
        if (transactionError instanceof Error && transactionError.message === "Event already triggered") {
          console.log(
            `[DueEventsWorker] Skipping event ${gameInstanceEvent.id} - already processed`
          );
          continue;
        }
        // Re-throw other errors to be caught by outer try-catch
        throw transactionError;
      }

      // 3. Send Expo push notification (outside transaction since it's external)
      // Note: Even if push fails, the event is marked as triggered to prevent duplicate processing
      console.log(
        `[DueEventsWorker] Processing event ${gameInstanceEvent.id} for game ${gameInstance.id}: userId=${userId}, expoPushToken=${expoPushToken ? 'SET' : 'NOT SET'}`
      );

      if (expoPushToken) {
        try {
          console.log(`[DueEventsWorker] Sending push to token: ${expoPushToken.substring(0, 20)}...`);
          const pushResult = await expoPushService.sendPushNotification({
            pushToken: expoPushToken,
            title: event.title ?? "Nouvel événement",
            body: event.description ?? "Un événement requiert votre attention dans le jeu.",
            data: {
              type: "EVENT",
              gameInstanceId: gameInstance.id,
              eventId: event.id,
            },
            channelId: "default", // Explicit channelId for Android
            sound: "default",
          });

          console.log(`[DueEventsWorker] Push result:`, JSON.stringify(pushResult));

          if (pushResult.success && pushResult.ticket) {
            const ticketId = (pushResult.ticket as { id?: string })?.id;
            console.log(`[DueEventsWorker] ✅ Push notification sent successfully for event ${gameInstanceEvent.id}`);
            console.log(`[DueEventsWorker] 📱 Ticket ID: ${ticketId}`);
            console.log(`[DueEventsWorker] 📱 Note: If using Expo Go, push notifications may not work. Use a development build instead.`);

            // Note: Receipts are only available after some delay (usually 15+ minutes)
            // For immediate testing, check Expo dashboard or use a development build
          } else {
            console.error(`[DueEventsWorker] ❌ Push failed for event ${gameInstanceEvent.id}: ${pushResult.error}`);
          }
        } catch (pushError) {
          // Log but don't fail the event - the notification was created
          console.error(
            `[DueEventsWorker] Exception while sending push for event ${gameInstanceEvent.id}:`,
            pushError
          );
        }
      } else {
        console.warn(
          `[DueEventsWorker] ⚠️ Skipping push for event ${gameInstanceEvent.id}: user ${userId} has no expoPushToken. Notification was created in DB.`
        );
      }

      processed++;
      console.log(
        `[DueEventsWorker] Processed event ${gameInstanceEvent.id} for game ${gameInstance.id}`
      );
    } catch (error) {
      errors++;
      console.error(
        `[DueEventsWorker] Error processing event ${gameInstanceEvent.id}:`,
        error
      );
    }
  }

  console.log(
    `[DueEventsWorker] Completed: ${processed} processed, ${errors} errors`
  );

  return { processed, errors };
}

/**
 * Check if the game_instance_events table exists.
 * Used on startup to skip worker if migrations haven't run yet.
 */
export async function checkGameInstanceEventsTableExists(): Promise<boolean> {
  try {
    const result = await prisma.$queryRaw<{ exists: boolean }[]>`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'game_instance_events'
      ) as exists
    `;
    return result[0]?.exists ?? false;
  } catch {
    return false;
  }
}
