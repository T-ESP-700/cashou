import { describe, it, expect } from "bun:test";

process.env.SKIP_PRISMA_INIT = "1";

const {
  GameEventProcessorService,
} = await import("../../src/trpc/services/game-event-processor.service.ts");

describe("GameEventProcessorService", () => {
  it("does not duplicate notifications when worker processing overlaps fallback recovery", async () => {
    const state = {
      game: {
        id: 1,
        userId: "user-1",
        isEnded: false,
        isPaused: false,
        actionRequired: false,
        pausedAt: null as Date | null,
      },
      user: {
        id: "user-1",
        expoPushToken: null as string | null,
      },
      event: {
        id: 7,
        gameInstanceId: 1,
        scheduledAt: new Date(Date.now() - 1_000),
        processingStartedAt: null as Date | null,
        triggeredAt: null as Date | null,
      },
      notifications: [] as Array<{ gameInstanceId: number; eventId: number }>,
      eventDefinition: {
        id: 99,
        title: "Alerte",
        description: "Body",
      },
    };

    const buildIncludedEvent = () => ({
      id: state.event.id,
      gameInstanceId: state.event.gameInstanceId,
      scheduledAt: state.event.scheduledAt,
      processingStartedAt: state.event.processingStartedAt,
      triggeredAt: state.event.triggeredAt,
      gameInstance: {
        ...state.game,
        user: state.user,
      },
      levelEvent: {
        event: state.eventDefinition,
      },
    });

    const prisma = {
      gameInstanceEvent: {
        updateMany: async ({
          where,
          data,
        }: {
          where: { id: number; triggeredAt?: null; processingStartedAt?: null };
          data: { processingStartedAt: Date | null };
        }) => {
          if (where.id !== state.event.id || state.event.triggeredAt) {
            return { count: 0 };
          }

          if (
            where.processingStartedAt === null &&
            state.event.processingStartedAt !== null
          ) {
            return { count: 0 };
          }

          state.event.processingStartedAt = data.processingStartedAt;
          return { count: 1 };
        },
        findUnique: async ({ include, select }: { include?: unknown; select?: { triggeredAt?: boolean; processingStartedAt?: boolean } }) => {
          if (select) {
            return {
              triggeredAt: state.event.triggeredAt,
              processingStartedAt: state.event.processingStartedAt,
            };
          }

          if (include) {
            return buildIncludedEvent();
          }

          return null;
        },
        findFirst: async ({
          where,
          select,
          include,
        }: {
          where?: { triggeredAt?: { not: null }; processingStartedAt?: null };
          select?: { id: true };
          include?: unknown;
        }) => {
          if (select) {
            if (
              state.event.triggeredAt === null &&
              state.event.processingStartedAt === null &&
              state.game.userId === "user-1" &&
              state.game.actionRequired !== true
            ) {
              return { id: state.event.id };
            }
            return null;
          }

          if (include && where?.triggeredAt?.not === null && state.event.triggeredAt) {
            return {
              id: state.event.id,
              levelEvent: {
                event: state.eventDefinition,
              },
            };
          }

          return null;
        },
      },
      gameInstance: {
        findUnique: async () => ({
          isEnded: state.game.isEnded,
          isPaused: state.game.isPaused,
          actionRequired: state.game.actionRequired,
          pausedAt: state.game.pausedAt,
        }),
        findFirst: async () => {
          if (state.game.actionRequired && state.game.isPaused) {
            return { id: state.game.id };
          }
          return null;
        },
        update: async ({
          data,
        }: {
          data: { isPaused: boolean; actionRequired: boolean; pausedAt: Date | null };
        }) => {
          state.game.isPaused = data.isPaused;
          state.game.actionRequired = data.actionRequired;
          state.game.pausedAt = data.pausedAt;
          return { ...state.game };
        },
      },
      notification: {
        create: async ({
          data,
        }: {
          data: { gameInstanceId: number; eventId: number };
        }) => {
          await new Promise((resolve) => setTimeout(resolve, 20));
          state.notifications.push(data);
          return data;
        },
      },
      $transaction: async <T>(callback: (tx: any) => Promise<T>) =>
        callback({
          gameInstanceEvent: {
            findUnique: async () => ({
              triggeredAt: state.event.triggeredAt,
              processingStartedAt: state.event.processingStartedAt,
            }),
            update: async ({
              data,
            }: {
              data: { triggeredAt: Date; processingStartedAt: null };
            }) => {
              state.event.triggeredAt = data.triggeredAt;
              state.event.processingStartedAt = data.processingStartedAt;
              return buildIncludedEvent();
            },
          },
          gameInstance: {
            findUnique: async () => ({
              isEnded: state.game.isEnded,
              isPaused: state.game.isPaused,
              actionRequired: state.game.actionRequired,
              pausedAt: state.game.pausedAt,
            }),
            update: async ({
              data,
            }: {
              data: { isPaused: boolean; actionRequired: boolean; pausedAt: Date | null };
            }) => {
              state.game.isPaused = data.isPaused;
              state.game.actionRequired = data.actionRequired;
              state.game.pausedAt = data.pausedAt;
              return { ...state.game };
            },
          },
          notification: prisma.notification,
        }),
    };

    const service = new GameEventProcessorService(prisma as never);
    (service as any).expoPushService = {
      sendPushNotification: async () => ({ success: true }),
    };

    const workerPromise = service.processEvent(7);
    await new Promise((resolve) => setTimeout(resolve, 1));
    const fallbackPromise = service.recoverAndProcessNextDueEventForUser("user-1");

    const [workerResult, fallbackResult] = await Promise.all([
      workerPromise,
      fallbackPromise,
    ]);
    const pendingEvent = await service.findPendingEventForUser("user-1");

    expect(workerResult.success).toBe(true);
    expect(fallbackResult).toEqual({
      gameInstanceId: 1,
      eventId: 99,
      title: "Alerte",
      body: "Body",
    });
    expect(pendingEvent).toEqual({
      gameInstanceId: 1,
      eventId: 99,
      title: "Alerte",
      body: "Body",
    });
    expect(state.notifications).toHaveLength(1);
  });
});
