import { getApiBaseUrl, getWsBaseUrl } from "./api-config";

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

  // Échange le token de session (header Authorization) contre un ticket éphémère.
  // Le token ne transite jamais dans l'URL du WebSocket. Renvoie null en cas d'échec.
  async function fetchWsTicket(): Promise<string | null> {
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/ws-ticket`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { ticket?: string };
      return data.ticket ?? null;
    } catch {
      return null;
    }
  }

  function scheduleReconnect() {
    if (isIntentionallyClosed) return;
    if (reconnectTimeout) clearTimeout(reconnectTimeout);
    // Reconnect after 2 seconds (un nouveau ticket sera redemandé à ce moment-là).
    reconnectTimeout = setTimeout(() => {
      void connect();
    }, 2000);
  }

  async function connect() {
    if (isIntentionallyClosed) return;

    // Un ticket frais est requis à CHAQUE (re)connexion (usage unique, ~30 s).
    const ticket = await fetchWsTicket();
    if (!ticket || isIntentionallyClosed) {
      scheduleReconnect();
      return;
    }

    const wsUrl = `${getWsBaseUrl()}/ws/game?ticket=${encodeURIComponent(ticket)}`;
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
      scheduleReconnect();
    };

    ws.onerror = (error) => {
      console.warn("[game-socket] Error:", error);
      // onclose will fire after onerror, which handles reconnection
    };
  }

  void connect();

  // Return cleanup function
  return () => {
    isIntentionallyClosed = true;
    if (reconnectTimeout) clearTimeout(reconnectTimeout);
    ws?.close();
  };
}
