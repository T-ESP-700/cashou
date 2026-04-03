import { getBackendHost } from "./api-config";

const PORT = 3000;

export interface GameStateSnapshot {
  gameInstanceId: string;
  serverNow: string;
  gameDate: string;
  isPaused: boolean;
  isEnded: boolean;
  actionRequired: boolean;
  currentEventIndex: number;
  totalPausedDuration: number;
  pausedAt: string | null;
  createdAt: string;
  duration: number;
  speed: number;
}

export type GameSocketEvent =
  | { type: "game:state"; payload: GameStateSnapshot }
  | { type: "game:tick"; payload: GameStateSnapshot }
  | { type: "game:event"; payload: { eventId: string; isPaused: boolean; actionRequired: boolean } }
  | { type: "game:end"; payload: { gameInstanceId: string } }
  | { type: "game:pause"; payload: { reason: string } }
  | { type: "game:resume"; payload: Record<string, never> }
  | { type: "game:notification"; payload: { id: string; title: string; body: string } };

type DisconnectFn = () => void;

export function connectGameSocket(
  gameInstanceId: string,
  token: string,
  onMessage: (event: GameSocketEvent) => void,
  onConnectionChange?: (connected: boolean) => void,
): DisconnectFn {
  let ws: WebSocket | null = null;
  let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  let isIntentionallyClosed = false;

  function connect() {
    const host = getBackendHost();
    const wsUrl = `ws://${host}:${PORT}/ws/game?token=${encodeURIComponent(token)}`;

    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      onConnectionChange?.(true);
      ws?.send(JSON.stringify({ type: "join", payload: { gameInstanceId } }));
    };

    ws.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data as string) as GameSocketEvent;
        onMessage(event);
      } catch {
        console.warn("[game-socket] Failed to parse message:", e.data);
      }
    };

    ws.onclose = () => {
      onConnectionChange?.(false);
      if (!isIntentionallyClosed) {
        // Reconnect after 2 seconds
        reconnectTimeout = setTimeout(connect, 2000);
      }
    };

    ws.onerror = (error) => {
      console.warn("[game-socket] Error:", error);
      // onclose will fire after onerror, which handles reconnection
    };
  }

  connect();

  // Return cleanup function
  return () => {
    isIntentionallyClosed = true;
    if (reconnectTimeout) clearTimeout(reconnectTimeout);
    ws?.close();
  };
}
