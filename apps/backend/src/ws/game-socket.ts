import type { ServerWebSocket } from "bun";
import type { PrismaClient } from "@cashou/db-app";
import defaultPrisma from "../database.ts";
import { buildGameStateSnapshot, type GameStateSnapshot } from "./game-state-snapshot.ts";

export type GameSocketData = {
  userId: string;
  gameInstanceId: string;
};

export type GameSocketEvent =
  | { type: "game:state"; payload: GameStateSnapshot }
  | { type: "game:tick"; payload: GameStateSnapshot }
  | { type: "game:event"; payload: { eventId: string; isPaused: boolean; actionRequired: boolean } }
  | { type: "game:end"; payload: { gameInstanceId: string } }
  | { type: "game:pause"; payload: { reason: string } }
  | { type: "game:resume"; payload: Record<string, never> }
  | { type: "game:notification"; payload: { id: string; title: string; body: string } }
  | { type: "game:error"; payload: { message: string } };

// Map gameInstanceId -> set of connections
const gameRooms = new Map<string, Set<ServerWebSocket<GameSocketData>>>();

// Central ticker handle
let tickerInterval: ReturnType<typeof setInterval> | null = null;

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

/**
 * Send an event to a single WebSocket connection (e.g. on join).
 */
export function sendToSocket(ws: ServerWebSocket<GameSocketData>, event: GameSocketEvent) {
  try {
    ws.send(JSON.stringify(event));
  } catch {
    // Connection dead
  }
}

export function getActiveConnections(): number {
  let count = 0;
  for (const room of gameRooms.values()) {
    count += room.size;
  }
  return count;
}

/**
 * Returns all active room IDs (gameInstanceIds with at least one connection).
 */
export function getActiveRoomIds(): string[] {
  return Array.from(gameRooms.keys()).filter(
    (id) => (gameRooms.get(id)?.size ?? 0) > 0
  );
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

/**
 * Broadcast a game:state snapshot to all clients in a room.
 * Loads the game instance from DB and computes the canonical snapshot.
 */
export async function broadcastGameState(
  gameInstanceId: string,
  prismaClient: PrismaClient = defaultPrisma
): Promise<void> {
  const room = gameRooms.get(gameInstanceId);
  if (!room || room.size === 0) return;

  const numericId = Number(gameInstanceId);
  if (!Number.isInteger(numericId) || numericId <= 0) return;

  const gameInstance = await prismaClient.gameInstance.findUnique({
    where: { id: numericId },
    include: { level: true },
  });

  if (!gameInstance) return;

  const snapshot = buildGameStateSnapshot(gameInstance);
  if (!snapshot) return;

  broadcastToGame(gameInstanceId, { type: "game:state", payload: snapshot });
}

/**
 * Start the central 1s ticker that broadcasts game:tick to all active rooms.
 * Only emits for games that are not paused and not ended.
 */
export function startTicker(prismaClient: PrismaClient = defaultPrisma) {
  if (tickerInterval) return; // Already running

  tickerInterval = setInterval(async () => {
    const roomIds = getActiveRoomIds();
    if (roomIds.length === 0) return;

    // Process all rooms concurrently
    await Promise.allSettled(
      roomIds.map(async (gameInstanceId) => {
        try {
          const numericId = Number(gameInstanceId);
          if (!Number.isInteger(numericId) || numericId <= 0) return;

          const gameInstance = await prismaClient.gameInstance.findUnique({
            where: { id: numericId },
            include: { level: true },
          });

          if (!gameInstance) return;

          // Only tick for active games (not paused, not ended)
          if (gameInstance.isPaused || gameInstance.isEnded) return;

          const snapshot = buildGameStateSnapshot(gameInstance);
          if (!snapshot) return;

          broadcastToGame(gameInstanceId, { type: "game:tick", payload: snapshot });
        } catch (err) {
          console.error(`[Ticker] Error broadcasting tick for room ${gameInstanceId}:`, err);
        }
      })
    );
  }, 1000);
}

/**
 * Stop the central ticker (for graceful shutdown).
 */
export function stopTicker() {
  if (tickerInterval) {
    clearInterval(tickerInterval);
    tickerInterval = null;
  }
}

export function clearGameRoomsForTests() {
  stopTicker();
  gameRooms.clear();
}

export function getRoomSize(gameInstanceId: string): number {
  return gameRooms.get(gameInstanceId)?.size ?? 0;
}
