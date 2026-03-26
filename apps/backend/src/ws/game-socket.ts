import type { ServerWebSocket } from "bun";
import type { PrismaClient } from "@cashou/db-app";
import defaultPrisma from "../database.ts";

export type GameSocketData = {
  userId: string;
  gameInstanceId: string;
};

export type GameSocketEvent =
  | { type: "game:event"; payload: { eventId: string; isPaused: boolean; actionRequired: boolean } }
  | { type: "game:end"; payload: { gameInstanceId: string } }
  | { type: "game:pause"; payload: { reason: string } }
  | { type: "game:resume"; payload: Record<string, never> }
  | { type: "game:notification"; payload: { id: string; title: string; body: string } }
  | { type: "game:error"; payload: { message: string } };

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

export function switchGameRoom(
  ws: ServerWebSocket<GameSocketData>,
  nextGameInstanceId: string
) {
  if (ws.data.gameInstanceId && ws.data.gameInstanceId !== nextGameInstanceId) {
    leaveGame(ws);
  }

  ws.data.gameInstanceId = nextGameInstanceId;
  joinGame(ws);
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

export async function canUserJoinGame(
  userId: string,
  gameInstanceId: string,
  prismaClient: Pick<PrismaClient, "gameInstance"> = defaultPrisma
): Promise<boolean> {
  const numericGameInstanceId = Number(gameInstanceId);

  if (!Number.isInteger(numericGameInstanceId) || numericGameInstanceId <= 0) {
    return false;
  }

  const gameInstance = await prismaClient.gameInstance.findUnique({
    where: { id: numericGameInstanceId },
    select: { userId: true },
  });

  return !!gameInstance && gameInstance.userId === userId;
}

export function clearGameRoomsForTests() {
  gameRooms.clear();
}

export function getRoomSize(gameInstanceId: string): number {
  return gameRooms.get(gameInstanceId)?.size ?? 0;
}
