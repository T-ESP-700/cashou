import type { GameInstance, Level, LevelEvent, PrismaClient } from "@cashou/db-app";
import defaultPrisma from "../../database.ts";
import { GamePauseIntervalService } from "./game-pause-interval.service.ts";

export interface GameTimeInfo {
  /** Total game duration in real seconds */
  totalDurationSeconds: number;
  /** Elapsed real seconds (excluding pauses) */
  elapsedSeconds: number;
  /** Remaining real seconds until game end */
  remainingSeconds: number;
  /** Has the game ended? */
  hasEnded: boolean;
  /** Progress percentage (0-100) */
  progressPercent: number;
}

export interface NextEventInfo {
  /** The next event to trigger */
  levelEvent: LevelEvent;
  /** Delay in seconds until this event should trigger */
  delaySeconds: number;
}

type GameInstanceWithLevel = GameInstance & {
  level: Level | null;
};

type LevelEventWithEvent = LevelEvent & {
  event?: { id: number; title: string | null } | null;
};

export class GameTimeService {
  private prisma: PrismaClient;
  private pauseIntervalService: GamePauseIntervalService;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || defaultPrisma;
    this.pauseIntervalService = new GamePauseIntervalService(this.prisma);
  }

  /**
   * Calculate total game duration in real seconds
   * Formula: (duration / speed) * 86400
   * Where duration is in game days and speed is multiplier
   */
  calculateTotalDuration(level: Level): number {
    const duration = level.duration ?? 30; // Default 30 game days
    const speed = level.speed ?? 1; // Default speed 1x

    // (game_days / speed_multiplier) * seconds_per_day
    return Math.floor((duration / speed) * 86400);
  }

  /**
   * Calculate elapsed time considering pauses
   * Uses createdAt as game start time
   */
  calculateElapsedTime(gameInstance: GameInstanceWithLevel): number {
    // If paused without pausedAt (created in preparation mode, never started), elapsed = 0
    if (gameInstance.isPaused && !gameInstance.pausedAt && !gameInstance.isEnded) {
      return 0;
    }

    const referenceTime =
      gameInstance.isEnded && gameInstance.endedAt
        ? new Date(gameInstance.endedAt)
        : gameInstance.isPaused && gameInstance.pausedAt
          ? new Date(gameInstance.pausedAt)
          : new Date();
    const startTime = new Date(gameInstance.createdAt);

    // Total real time since start (clock frozen at referenceTime when paused/ended)
    let totalElapsed = Math.floor(
      (referenceTime.getTime() - startTime.getTime()) / 1000
    );

    // Subtract accumulated pause duration from completed pauses
    const pausedDuration = gameInstance.totalPausedDuration ?? 0;
    totalElapsed -= pausedDuration;

    return Math.max(0, totalElapsed);
  }

  /**
   * Calculate real time in seconds for a given percentage of game duration
   */
  calculateTimeForPercent(level: Level, percent: number): number {
    const totalDuration = this.calculateTotalDuration(level);
    return Math.floor((totalDuration * percent) / 100);
  }

  /**
   * Get complete time info for a game instance
   */
  calculateTimeInfo(gameInstance: GameInstanceWithLevel): GameTimeInfo {
    if (!gameInstance.level) {
      return {
        totalDurationSeconds: 0,
        elapsedSeconds: 0,
        remainingSeconds: 0,
        hasEnded: false,
        progressPercent: 0,
      };
    }

    const totalDurationSeconds = this.calculateTotalDuration(
      gameInstance.level
    );
    const elapsedSeconds = this.calculateElapsedTime(gameInstance);
    const remainingSeconds = Math.max(0, totalDurationSeconds - elapsedSeconds);
    const hasEnded = elapsedSeconds >= totalDurationSeconds;
    const progressPercent = Math.min(
      100,
      (elapsedSeconds / totalDurationSeconds) * 100
    );

    return {
      totalDurationSeconds,
      elapsedSeconds,
      remainingSeconds,
      hasEnded,
      progressPercent,
    };
  }

  /**
   * Get the next event to trigger based on current game state
   * Returns null if no more events or game has ended
   */
  getNextEventInfo(
    gameInstance: GameInstanceWithLevel,
    levelEvents: LevelEventWithEvent[]
  ): NextEventInfo | null {
    if (!gameInstance.level || gameInstance.isEnded) {
      return null;
    }

    // Sort events by position
    const sortedEvents = [...levelEvents].sort(
      (a, b) => a.position - b.position
    );

    // Get the next event based on currentEventIndex
    const currentIndex = gameInstance.currentEventIndex ?? 0;
    const nextEvent = sortedEvents[currentIndex];

    if (!nextEvent) {
      return null; // No more events
    }

    const totalDuration = this.calculateTotalDuration(gameInstance.level);
    const elapsedSeconds = this.calculateElapsedTime(gameInstance);

    // Calculate when this event should trigger
    const eventTriggerTime = Math.floor(
      (totalDuration * nextEvent.triggerPercent) / 100
    );

    // Calculate delay from now
    const delaySeconds = Math.max(0, eventTriggerTime - elapsedSeconds);

    return {
      levelEvent: nextEvent,
      delaySeconds,
    };
  }

  /**
   * Calculate remaining time until game end (100% duration)
   * Used after the last event to schedule game end
   */
  getRemainingTimeUntilEnd(gameInstance: GameInstanceWithLevel): number {
    if (!gameInstance.level) {
      return 0;
    }

    const totalDuration = this.calculateTotalDuration(gameInstance.level);
    const elapsedSeconds = this.calculateElapsedTime(gameInstance);

    return Math.max(0, totalDuration - elapsedSeconds);
  }

  /**
   * Check if an event should have already triggered
   * based on elapsed time vs event trigger percentage
   */
  shouldEventHaveTriggered(
    gameInstance: GameInstanceWithLevel,
    levelEvent: LevelEvent
  ): boolean {
    if (!gameInstance.level) {
      return false;
    }

    const totalDuration = this.calculateTotalDuration(gameInstance.level);
    const elapsedSeconds = this.calculateElapsedTime(gameInstance);
    const eventTriggerTime = Math.floor(
      (totalDuration * levelEvent.triggerPercent) / 100
    );

    return elapsedSeconds >= eventTriggerTime;
  }

  /**
   * Calculate elapsed time since a specific date (e.g., holding acquisition)
   * considering game pauses
   * @param gameInstance - The game instance with level
   * @param sinceDate - The date to calculate elapsed time from
   * @returns Elapsed real seconds since the given date (excluding pauses)
   */
  async calculateElapsedTimeSince(
    gameInstance: GameInstanceWithLevel,
    sinceDate: Date
  ): Promise<number> {
    // If paused without pausedAt (never started), elapsed = 0
    if (gameInstance.isPaused && !gameInstance.pausedAt && !gameInstance.isEnded) {
      return 0;
    }

    const now = gameInstance.isEnded && gameInstance.endedAt
      ? new Date(gameInstance.endedAt)
      : gameInstance.isPaused && gameInstance.pausedAt
        ? new Date(gameInstance.pausedAt)
        : new Date();
    const startTime = new Date(sinceDate);
    const gameStartTime = new Date(gameInstance.createdAt);

    // If sinceDate is before game start, use game start
    const effectiveStartTime = startTime < gameStartTime ? gameStartTime : startTime;
    const effectiveEndTime =
      gameInstance.isPaused && gameInstance.pausedAt
        ? new Date(gameInstance.pausedAt)
        : now;

    if (effectiveEndTime <= effectiveStartTime) {
      return 0;
    }

    const grossElapsed = Math.floor(
      (effectiveEndTime.getTime() - effectiveStartTime.getTime()) / 1000
    );

    const { pausedSeconds, intervalCount } =
      await this.pauseIntervalService.getPausedSecondsWithinWindow(
        gameInstance.id,
        effectiveStartTime,
        effectiveEndTime,
      );

    if (intervalCount > 0) {
      return Math.max(0, grossElapsed - pausedSeconds);
    }

    // Fallback for legacy games created before pause intervals existed.
    let totalElapsed = grossElapsed;
    const pausedDuration = gameInstance.totalPausedDuration ?? 0;
    const gameElapsedSinceCreation = Math.floor(
      (effectiveEndTime.getTime() - gameStartTime.getTime()) / 1000
    );
    if (gameElapsedSinceCreation > 0) {
      const pauseFraction =
        (effectiveEndTime.getTime() - effectiveStartTime.getTime()) /
        (effectiveEndTime.getTime() - gameStartTime.getTime());
      const pauseToSubtract = Math.floor(pausedDuration * pauseFraction);
      totalElapsed -= pauseToSubtract;
    }

    return Math.max(0, totalElapsed);
  }

  /**
   * Convert real elapsed seconds to game days
   * @param level - The level with speed configuration
   * @param realSeconds - Real seconds elapsed
   * @returns Game days elapsed
   */
  convertRealSecondsToGameDays(level: Level, realSeconds: number): number {
    const speed = level.speed ?? 1;
    // Real seconds to game days: realSeconds * speed / 86400
    return (realSeconds * speed) / 86400;
  }
}
