import type { GameInstance, Level, LevelEvent } from "@cashou/db-app";

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
    const now = new Date();
    const startTime = new Date(gameInstance.createdAt);

    // Total real time since start
    let totalElapsed = Math.floor(
      (now.getTime() - startTime.getTime()) / 1000
    );

    // Subtract accumulated pause duration
    const pausedDuration = gameInstance.totalPausedDuration ?? 0;
    totalElapsed -= pausedDuration;

    // If currently paused, also subtract current pause duration
    if (gameInstance.isPaused && gameInstance.pausedAt) {
      const currentPauseDuration = Math.floor(
        (now.getTime() - new Date(gameInstance.pausedAt).getTime()) / 1000
      );
      totalElapsed -= currentPauseDuration;
    }

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
}
