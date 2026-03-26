import { describe, it, expect } from "bun:test";

process.env.SKIP_PRISMA_INIT = "1";

const { GameEndTriggerService } = await import(
  "../../src/trpc/services/game-end-trigger.service.ts"
);

describe("GameEndTriggerService", () => {
  it("claims game end atomically and prevents duplicate side effects", async () => {
    const state = {
      isEnded: false,
      endingStartedAt: null as Date | null,
    };
    let endGameCalls = 0;
    let notificationCalls = 0;

    const prisma = {
      gameInstance: {
        updateMany: async ({ data }: { data: { endingStartedAt?: Date | null } }) => {
          if (data.endingStartedAt === null) {
            state.endingStartedAt = null;
            return { count: state.isEnded ? 0 : 1 };
          }

          if (state.isEnded || state.endingStartedAt) {
            return { count: 0 };
          }

          state.endingStartedAt = data.endingStartedAt ?? null;
          return { count: 1 };
        },
        findUnique: async () => ({
          id: 1,
          userId: "user-1",
          levelId: 1,
          isEnded: state.isEnded,
          endingStartedAt: state.endingStartedAt,
          user: {
            id: "user-1",
            expoPushToken: null,
          },
          level: {
            id: 1,
            number: 1,
          },
        }),
      },
      level: {
        findFirst: async () => null,
      },
      user: {
        update: async () => null,
      },
    };

    const service = new GameEndTriggerService(prisma as never);

    (service as any).endGameService = {
      endGame: async () => {
        endGameCalls += 1;
        await new Promise((resolve) => setTimeout(resolve, 20));
        state.isEnded = true;

        return {
          success: false,
          gameInstanceId: 1,
          startBalance: 100,
          walletBalance: 90,
          assetsValue: 0,
          totalValue: 90,
          goals: [],
          message: "Terminé",
          modal: {
            type: "PRIMARY_FAILURE",
            title: "Fin",
            primaryMessage: "Fin",
            secondaryMessage: null,
          },
        };
      },
    };
    (service as any).notificationService = {
      create: async () => {
        notificationCalls += 1;
      },
    };
    (service as any).expoPushService = {
      sendPushNotification: async () => ({ success: true }),
    };

    const [first, second] = await Promise.all([
      service.triggerGameEnd(1),
      service.triggerGameEnd(1),
    ]);

    expect(endGameCalls).toBe(1);
    expect(notificationCalls).toBe(1);
    expect(first.gameInstanceId).toBe(1);
    expect(second.gameInstanceId).toBe(1);
  });
});
