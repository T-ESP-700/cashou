import type { GameInstance, Level } from "@cashou/db-app";
import { GameTimeService } from "../trpc/services/game-time.service.ts";

const GAME_START_DATE = new Date("2024-01-01T00:00:00.000Z");

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

type GameInstanceWithLevel = GameInstance & {
  level: Level | null;
};

const gameTimeService = new GameTimeService();

/**
 * Build a lightweight canonical snapshot of the game state.
 * This is the single source of truth pushed to clients via WebSocket.
 */
export function buildGameStateSnapshot(
  gameInstance: GameInstanceWithLevel
): GameStateSnapshot | null {
  if (!gameInstance.level) return null;

  const level = gameInstance.level;
  const duration = level.duration ?? 30;
  const speed = level.speed ?? 1;

  const timeInfo = gameTimeService.calculateTimeInfo(gameInstance);
  const totalDurationSeconds = timeInfo.totalDurationSeconds;

  // Calculate game date from elapsed time
  let gameDaysElapsed: number;
  if (gameInstance.isEnded) {
    gameDaysElapsed = duration;
  } else if (totalDurationSeconds > 0) {
    gameDaysElapsed = (duration * timeInfo.progressPercent) / 100;
  } else {
    gameDaysElapsed = 0;
  }

  const gameDate = new Date(GAME_START_DATE);
  gameDate.setDate(gameDate.getDate() + Math.floor(gameDaysElapsed));

  return {
    gameInstanceId: String(gameInstance.id),
    serverNow: new Date().toISOString(),
    gameDate: gameDate.toISOString(),
    isPaused: gameInstance.isPaused ?? false,
    isEnded: gameInstance.isEnded,
    actionRequired: gameInstance.actionRequired ?? false,
    currentEventIndex: gameInstance.currentEventIndex ?? 0,
    totalPausedDuration: gameInstance.totalPausedDuration ?? 0,
    pausedAt: gameInstance.pausedAt
      ? new Date(gameInstance.pausedAt).toISOString()
      : null,
    createdAt: new Date(gameInstance.createdAt).toISOString(),
    duration,
    speed,
  };
}
