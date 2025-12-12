import Expo, {
  type ExpoPushMessage,
  type ExpoPushTicket,
  type ExpoPushErrorTicket,
} from "expo-server-sdk";

export interface PushNotificationPayload {
  pushToken: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  badge?: number;
  sound?: "default" | null;
  channelId?: string;
}

export interface PushNotificationResult {
  success: boolean;
  ticket?: ExpoPushTicket;
  error?: string;
}

export class ExpoPushService {
  private expo: Expo;

  constructor() {
    this.expo = new Expo();
  }

  /**
   * Validate an Expo push token
   */
  isValidPushToken(token: string): boolean {
    return Expo.isExpoPushToken(token);
  }

  /**
   * Send a single push notification
   */
  async sendPushNotification(
    payload: PushNotificationPayload
  ): Promise<PushNotificationResult> {
    const { pushToken, title, body, data, badge, sound = "default", channelId = "default" } = payload;

    if (!this.isValidPushToken(pushToken)) {
      console.warn(`Invalid Expo push token: ${pushToken}`);
      return {
        success: false,
        error: `Invalid Expo push token: ${pushToken}`,
      };
    }

    const message: ExpoPushMessage = {
      to: pushToken,
      sound,
      title,
      body,
      data,
      badge,
      channelId,
    };

    try {
      const tickets = await this.expo.sendPushNotificationsAsync([message]);
      const ticket = tickets[0];

      if (!ticket) {
        return {
          success: false,
          error: "No ticket returned from Expo",
        };
      }

      // Check if ticket indicates an error
      if ((ticket as ExpoPushErrorTicket).status === "error") {
        const errorTicket = ticket as ExpoPushErrorTicket;
        console.error(
          `Push notification error: ${errorTicket.message}`,
          errorTicket.details
        );
        return {
          success: false,
          ticket,
          error: errorTicket.message,
        };
      }

      return {
        success: true,
        ticket,
      };
    } catch (error) {
      console.error("Error sending push notification:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Send push notifications to multiple users
   */
  async sendBulkPushNotifications(
    payloads: PushNotificationPayload[]
  ): Promise<PushNotificationResult[]> {
    const messages: ExpoPushMessage[] = payloads
      .filter((p) => this.isValidPushToken(p.pushToken))
      .map(({ pushToken, title, body, data, badge, sound = "default" }) => ({
        to: pushToken,
        sound,
        title,
        body,
        data,
        badge,
      }));

    if (messages.length === 0) {
      return [];
    }

    // Expo recommends chunking messages
    const chunks = this.expo.chunkPushNotifications(messages);
    const results: PushNotificationResult[] = [];

    for (const chunk of chunks) {
      try {
        const chunkTickets = await this.expo.sendPushNotificationsAsync(chunk);

        for (const ticket of chunkTickets) {
          if ((ticket as ExpoPushErrorTicket).status === "error") {
            const errorTicket = ticket as ExpoPushErrorTicket;
            results.push({
              success: false,
              ticket,
              error: errorTicket.message,
            });
          } else {
            results.push({
              success: true,
              ticket,
            });
          }
        }
      } catch (error) {
        console.error("Error sending push notification chunk:", error);
        // Add failure results for all messages in this chunk
        for (let i = 0; i < chunk.length; i++) {
          results.push({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }
    }

    return results;
  }

  /**
   * Check push notification receipts for delivery status
   * Should be called after some delay (e.g., 15 minutes) from sending
   */
  async checkReceipts(
    ticketIds: string[]
  ): Promise<Map<string, { delivered: boolean; error?: string }>> {
    const results = new Map<string, { delivered: boolean; error?: string }>();

    const receiptIdChunks =
      this.expo.chunkPushNotificationReceiptIds(ticketIds);

    for (const chunk of receiptIdChunks) {
      try {
        const receipts = await this.expo.getPushNotificationReceiptsAsync(
          chunk
        );

        for (const [receiptId, receipt] of Object.entries(receipts)) {
          if (receipt.status === "ok") {
            results.set(receiptId, { delivered: true });
          } else if (receipt.status === "error") {
            results.set(receiptId, {
              delivered: false,
              error: receipt.message,
            });

            // Handle specific error types
            if (receipt.details?.error === "DeviceNotRegistered") {
              // The device is no longer registered, should remove the token
              console.warn(
                `Device not registered for receipt ${receiptId}, token should be removed`
              );
            }
          }
        }
      } catch (error) {
        console.error("Error checking push notification receipts:", error);
      }
    }

    return results;
  }
}
