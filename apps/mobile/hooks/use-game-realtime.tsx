import React, { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { connectGameSocket, type GameSocketEvent, type GameStateSnapshot } from '../lib/game-socket';
import { tokenStorage } from '../lib/token-storage';
import { invalidateGameCaches } from '../lib/query-cache';
import { useNotifications } from './use-notifications';

export interface GameRealtimeState {
  /** Active game instance ID */
  gameInstanceId: number | null;
  /** Current game date from server */
  gameDate: Date | null;
  /** Is the game paused? */
  isPaused: boolean;
  /** Is the game ended? */
  isEnded: boolean;
  /** Is an action required (event pending)? */
  actionRequired: boolean;
  /** Last server sync timestamp */
  lastServerSyncAt: Date | null;
  /** WebSocket connection status */
  isConnected: boolean;
  /** Full latest snapshot from server */
  lastSnapshot: GameStateSnapshot | null;
}

interface GameRealtimeContextType {
  state: GameRealtimeState;
  /** Set the active game instance ID (opens socket) */
  setGameInstanceId: (id: number | null) => void;
  /** Formatted game date for header display */
  formattedGameDate: string | null;
}

const defaultState: GameRealtimeState = {
  gameInstanceId: null,
  gameDate: null,
  isPaused: true,
  isEnded: false,
  actionRequired: false,
  lastServerSyncAt: null,
  isConnected: false,
  lastSnapshot: null,
};

const GameRealtimeContext = createContext<GameRealtimeContextType | undefined>(undefined);

function formatDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

export function GameRealtimeProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GameRealtimeState>(defaultState);
  const [gameInstanceId, setGameInstanceIdState] = useState<number | null>(null);
  const { triggerPendingEventCheck } = useNotifications();
  const disconnectRef = useRef<(() => void) | null>(null);

  const setGameInstanceId = useCallback((id: number | null) => {
    setGameInstanceIdState(id);
    if (!id) {
      setState(defaultState);
    }
  }, []);

  // Handle snapshot updates (from game:state and game:tick)
  const handleSnapshot = useCallback((snapshot: GameStateSnapshot) => {
    setState(prev => ({
      ...prev,
      gameInstanceId: Number(snapshot.gameInstanceId),
      gameDate: new Date(snapshot.gameDate),
      isPaused: snapshot.isPaused,
      isEnded: snapshot.isEnded,
      actionRequired: snapshot.actionRequired,
      lastServerSyncAt: new Date(),
      lastSnapshot: snapshot,
    }));
  }, []);

  // Handle socket events with cache invalidation
  const handleSocketEvent = useCallback((event: GameSocketEvent) => {
    const gid = gameInstanceId;

    switch (event.type) {
      case 'game:state':
      case 'game:tick':
        handleSnapshot(event.payload);
        break;

      case 'game:event':
        console.log('[GameRealtime] game:event received, triggering event check');
        triggerPendingEventCheck();
        break;

      case 'game:pause':
        console.log('[GameRealtime] game:pause received');
        setState(prev => ({ ...prev, isPaused: true }));
        break;

      case 'game:resume':
        console.log('[GameRealtime] game:resume received');
        setState(prev => ({ ...prev, isPaused: false, actionRequired: false }));
        if (gid) {
          invalidateGameCaches(gid);
        }
        break;

      case 'game:end':
        console.log('[GameRealtime] game:end received');
        setState(prev => ({ ...prev, isEnded: true, isPaused: true }));
        if (gid) {
          invalidateGameCaches(gid);
        }
        break;
    }
  }, [gameInstanceId, handleSnapshot, triggerPendingEventCheck]);

  // Stable ref for the event handler to avoid socket reconnections
  const handleSocketEventRef = useRef(handleSocketEvent);
  handleSocketEventRef.current = handleSocketEvent;

  // Manage WebSocket connection lifecycle
  useEffect(() => {
    if (!gameInstanceId) {
      disconnectRef.current?.();
      disconnectRef.current = null;
      return;
    }

    let cancelled = false;

    const setup = async () => {
      const token = await tokenStorage.getToken();
      if (!token || cancelled) return;

      disconnectRef.current?.();
      disconnectRef.current = connectGameSocket(
        gameInstanceId.toString(),
        token,
        (event) => handleSocketEventRef.current(event),
        (connected) => {
          if (!cancelled) {
            setState(prev => ({ ...prev, isConnected: connected }));
          }
        },
      );
    };

    setup();

    return () => {
      cancelled = true;
      disconnectRef.current?.();
      disconnectRef.current = null;
    };
  }, [gameInstanceId]);

  const formattedGameDate = state.gameDate ? formatDate(state.gameDate) : null;

  return (
    <GameRealtimeContext.Provider value={{ state, setGameInstanceId, formattedGameDate }}>
      {children}
    </GameRealtimeContext.Provider>
  );
}

export function useGameRealtime(): GameRealtimeContextType {
  const context = useContext(GameRealtimeContext);
  if (!context) {
    throw new Error('useGameRealtime must be used within a GameRealtimeProvider');
  }
  return context;
}
