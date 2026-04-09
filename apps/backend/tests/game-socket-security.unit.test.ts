import { afterEach, describe, expect, it } from "bun:test";

process.env.SKIP_PRISMA_INIT = "1";

const {
  canUserJoinGame,
  clearGameRoomsForTests,
  getRoomSize,
  switchGameRoom,
} = await import("../src/ws/game-socket.ts");

afterEach(() => {
  clearGameRoomsForTests();
});

describe("Game socket security helpers", () => {
  it("authorizes joins only for the game owner", async () => {
    const prisma = {
      gameInstance: {
        findUnique: async ({ where }: { where: { id: number } }) => {
          if (where.id === 1) {
            return { userId: "user-1" };
          }
          if (where.id === 2) {
            return { userId: "user-2" };
          }
          return null;
        },
      },
    };

    expect(await canUserJoinGame("user-1", "1", prisma as never)).toBe(true);
    expect(await canUserJoinGame("user-1", "2", prisma as never)).toBe(false);
    expect(await canUserJoinGame("user-1", "abc", prisma as never)).toBe(false);
  });

  it("removes the socket from the previous room on a second join", () => {
    const ws = {
      data: {
        userId: "user-1",
        gameInstanceId: "",
      },
      send() {},
    };

    switchGameRoom(ws as never, "1");
    expect(getRoomSize("1")).toBe(1);

    switchGameRoom(ws as never, "2");
    expect(getRoomSize("1")).toBe(0);
    expect(getRoomSize("2")).toBe(1);
  });
});
