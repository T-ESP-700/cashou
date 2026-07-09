import { afterEach, describe, expect, it } from "bun:test";

process.env.SKIP_PRISMA_INIT = "1";

const { GameInstanceService } = await import(
  "../../src/trpc/services/game-instance.service.ts"
);
const { GameInstanceEventService } = await import(
  "../../src/trpc/services/game-instance-event.service.ts"
);

const originalShiftScheduledEvents =
  GameInstanceEventService.prototype.shiftScheduledEvents;

afterEach(() => {
  GameInstanceEventService.prototype.shiftScheduledEvents =
    originalShiftScheduledEvents;
});

describe("GameInstanceService.resume", () => {
  it("shifts pending events once and re-schedules once after resume", async () => {
    let shiftedCalls = 0;
    let rescheduleCalls = 0;
    let updateCalls = 0;

    GameInstanceEventService.prototype.shiftScheduledEvents = async function () {
      shiftedCalls += 1;
    };

    const pausedAt = new Date(Date.now() - 5_000);
    const prisma = {
      gameInstance: {
        findUnique: async () => ({
          id: 1,
          levelId: 1,
          isEnded: false,
          isPaused: true,
          pausedAt,
          totalPausedDuration: 12,
          level: { id: 1 },
        }),
      },
      gameInstanceEvent: {
        count: async () => 2,
      },
      $transaction: async <T>(callback: (tx: any) => Promise<T>) =>
        callback({
          gameInstance: {
            update: async ({ data }: { data: { isPaused: boolean; pausedAt: null; totalPausedDuration: number } }) => {
              updateCalls += 1;
              return {
                id: 1,
                ...data,
              };
            },
          },
          gameInstanceEvent: {
            update: async () => null,
          },
          // resume() clôt l'intervalle de pause via endPause(…, tx), en SQL brut.
          $queryRaw: async () => [],
          $executeRaw: async () => 0,
        }),
    };

    const service = new GameInstanceService(prisma as never);
    (service as any).gameEventTriggerService = {
      rescheduleAfterResume: async () => {
        rescheduleCalls += 1;
      },
    };

    const result = await service.resume(1);

    expect(shiftedCalls).toBe(1);
    expect(rescheduleCalls).toBe(1);
    expect(updateCalls).toBe(1);
    expect(result.isPaused).toBe(false);
  });
});
