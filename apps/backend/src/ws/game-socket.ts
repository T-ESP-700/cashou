import type { ServerWebSocket } from "bun";

export type GameSocketData = {
  userId: string;
  gameInstanceId: string;
};

export type GameSocketEvent =
  | { type: "game:event"; payload: { eventId: string; isPaused: boolean; actionRequired: boolean } }
  | { type: "game:end"; payload: { gameInstanceId: string } }
  | { type: "game:pause"; payload: { reason: string } }
  | { type: "game:resume"; payload: Record<string, never> }
  | { type: "game:notification"; payload: { id: string; title: string; body: string } };

// Map gameInstanceId -> set of connections
const gameRooms = new Map<string, Set<ServerWebSocket<GameSocketData>>>();

export function joinGame(ws: ServerWebSocket<GameSocketData>) {
  const { gameInstanceId } = ws.data;
  if (!gameInstanceId) return;
  if (!gameRooms.has(gameInstanceId)) {
    gameRooms.set(gameInstanceId, new Set());
  }
  gameRooms.get(gameInstanceId)!.add(ws);
}

export function leaveGame(ws: ServerWebSocket<GameSocketData>) {
  const { gameInstanceId } = ws.data;
  if (!gameInstanceId) return;
  gameRooms.get(gameInstanceId)?.delete(ws);
  // Clean up empty rooms
  if (gameRooms.get(gameInstanceId)?.size === 0) {
    gameRooms.delete(gameInstanceId);
  }
}

export function broadcastToGame(gameInstanceId: string, event: GameSocketEvent) {
  const room = gameRooms.get(gameInstanceId);
  if (!room || room.size === 0) return;
  const message = JSON.stringify(event);
  for (const ws of room) {
    try {
      ws.send(message);
    } catch {
      // Connection dead, remove it
      room.delete(ws);
    }
  }
}

export function getActiveConnections(): number {
  let count = 0;
  for (const room of gameRooms.values()) {
    count += room.size;
  }
  return count;
}
