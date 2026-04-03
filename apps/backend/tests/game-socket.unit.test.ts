// tests/game-socket.unit.test.ts
// Unit tests for the WebSocket game room management logic
import { describe, it, expect, beforeEach } from "bun:test";

// ── Re-implement the game socket logic for isolated testing ──────────────
type GameSocketEvent =
  | { type: "game:event"; payload: { eventId: string; isPaused: boolean; actionRequired: boolean } }
  | { type: "game:end"; payload: { gameInstanceId: string } }
  | { type: "game:pause"; payload: { reason: string } }
  | { type: "game:resume"; payload: Record<string, never> }
  | { type: "game:notification"; payload: { id: string; title: string; body: string } };

type MockWS = {
  data: { userId: string; gameInstanceId: string };
  sentMessages: string[];
  dead: boolean;
  send: (message: string) => void;
};

function createMockWS(userId: string, gameInstanceId: string, dead = false): MockWS {
  const ws: MockWS = {
    data: { userId, gameInstanceId },
    sentMessages: [],
    dead,
    send(message: string) {
      if (this.dead) throw new Error("Connection dead");
      this.sentMessages.push(message);
    },
  };
  return ws;
}

// Room management (mirrors game-socket.ts)
const gameRooms = new Map<string, Set<MockWS>>();

function joinGame(ws: MockWS) {
  const { gameInstanceId } = ws.data;
  if (!gameInstanceId) return;
  if (!gameRooms.has(gameInstanceId)) {
    gameRooms.set(gameInstanceId, new Set());
  }
  gameRooms.get(gameInstanceId)!.add(ws);
}

function leaveGame(ws: MockWS) {
  const { gameInstanceId } = ws.data;
  if (!gameInstanceId) return;
  gameRooms.get(gameInstanceId)?.delete(ws);
  if (gameRooms.get(gameInstanceId)?.size === 0) {
    gameRooms.delete(gameInstanceId);
  }
}

function broadcastToGame(gameInstanceId: string, event: GameSocketEvent) {
  const room = gameRooms.get(gameInstanceId);
  if (!room || room.size === 0) return;
  const message = JSON.stringify(event);
  for (const ws of room) {
    try {
      ws.send(message);
    } catch {
      room.delete(ws);
    }
  }
}

function getActiveConnections(): number {
  let count = 0;
  for (const room of gameRooms.values()) {
    count += room.size;
  }
  return count;
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe("Game Socket Room Management", () => {
  beforeEach(() => {
    gameRooms.clear();
  });

  describe("joinGame()", () => {
    it("should create a room and add the connection", () => {
      const ws = createMockWS("user1", "game1");
      joinGame(ws);

      expect(gameRooms.has("game1")).toBe(true);
      expect(gameRooms.get("game1")!.size).toBe(1);
    });

    it("should add multiple connections to the same room", () => {
      const ws1 = createMockWS("user1", "game1");
      const ws2 = createMockWS("user2", "game1");
      joinGame(ws1);
      joinGame(ws2);

      expect(gameRooms.get("game1")!.size).toBe(2);
    });

    it("should handle connections to different rooms", () => {
      const ws1 = createMockWS("user1", "game1");
      const ws2 = createMockWS("user2", "game2");
      joinGame(ws1);
      joinGame(ws2);

      expect(gameRooms.get("game1")!.size).toBe(1);
      expect(gameRooms.get("game2")!.size).toBe(1);
      expect(getActiveConnections()).toBe(2);
    });

    it("should ignore connections with empty gameInstanceId", () => {
      const ws = createMockWS("user1", "");
      joinGame(ws);

      expect(gameRooms.size).toBe(0);
    });
  });

  describe("leaveGame()", () => {
    it("should remove connection from room", () => {
      const ws = createMockWS("user1", "game1");
      joinGame(ws);
      leaveGame(ws);

      expect(gameRooms.has("game1")).toBe(false); // Room cleaned up
    });

    it("should clean up empty rooms", () => {
      const ws1 = createMockWS("user1", "game1");
      const ws2 = createMockWS("user2", "game1");
      joinGame(ws1);
      joinGame(ws2);
      leaveGame(ws1);

      expect(gameRooms.has("game1")).toBe(true);
      expect(gameRooms.get("game1")!.size).toBe(1);

      leaveGame(ws2);
      expect(gameRooms.has("game1")).toBe(false);
    });
  });

  describe("broadcastToGame()", () => {
    it("should send event to all connections in a room", () => {
      const ws1 = createMockWS("user1", "game1");
      const ws2 = createMockWS("user2", "game1");
      joinGame(ws1);
      joinGame(ws2);

      const event: GameSocketEvent = {
        type: "game:end",
        payload: { gameInstanceId: "game1" },
      };
      broadcastToGame("game1", event);

      expect(ws1.sentMessages).toEqual([JSON.stringify(event)]);
      expect(ws2.sentMessages).toEqual([JSON.stringify(event)]);
    });

    it("should not send to connections in other rooms", () => {
      const ws1 = createMockWS("user1", "game1");
      const ws2 = createMockWS("user2", "game2");
      joinGame(ws1);
      joinGame(ws2);

      broadcastToGame("game1", {
        type: "game:pause",
        payload: { reason: "event" },
      });

      expect(ws1.sentMessages.length).toBe(1);
      expect(ws2.sentMessages.length).toBe(0);
    });

    it("should remove dead connections during broadcast", () => {
      const ws1 = createMockWS("user1", "game1");
      const ws2 = createMockWS("user2", "game1", true); // Dead connection
      joinGame(ws1);
      joinGame(ws2);

      broadcastToGame("game1", {
        type: "game:resume",
        payload: {},
      });

      expect(ws1.sentMessages.length).toBe(1);
      expect(gameRooms.get("game1")!.size).toBe(1); // Dead ws2 removed
    });

    it("should handle broadcast to non-existent room gracefully", () => {
      // Should not throw
      broadcastToGame("nonexistent", {
        type: "game:end",
        payload: { gameInstanceId: "nonexistent" },
      });
    });

    it("should broadcast all event types correctly", () => {
      const ws = createMockWS("user1", "game1");
      joinGame(ws);

      const events: GameSocketEvent[] = [
        { type: "game:event", payload: { eventId: "1", isPaused: true, actionRequired: true } },
        { type: "game:end", payload: { gameInstanceId: "game1" } },
        { type: "game:pause", payload: { reason: "user_action" } },
        { type: "game:resume", payload: {} },
        { type: "game:notification", payload: { id: "1", title: "Test", body: "Body" } },
      ];

      for (const event of events) {
        broadcastToGame("game1", event);
      }

      expect(ws.sentMessages.length).toBe(5);
      for (let i = 0; i < events.length; i++) {
        expect(JSON.parse(ws.sentMessages[i])).toEqual(events[i]);
      }
    });
  });

  describe("getActiveConnections()", () => {
    it("should return 0 for empty rooms", () => {
      expect(getActiveConnections()).toBe(0);
    });

    it("should count connections across all rooms", () => {
      joinGame(createMockWS("u1", "g1"));
      joinGame(createMockWS("u2", "g1"));
      joinGame(createMockWS("u3", "g2"));

      expect(getActiveConnections()).toBe(3);
    });
  });
});
