import type { QueryClient } from '@tanstack/react-query';

/**
 * Centralized cache invalidation utilities for React Query.
 *
 * These functions group related query invalidations to ensure
 * data consistency across the app after mutations.
 *
 * Key principle: invalidateQueries marks data as stale, but React Query
 * only refetches when the data is actually needed (component mounted + subscribed).
 * This is much more efficient than calling refetch() directly.
 */
export const CacheInvalidation = {
  /**
   * After a game ends - invalidates all game-related data and user stats.
   * Used by: useEndGame hook
   */
  gameEnded: (queryClient: QueryClient) => {
    // Invalidate game instance data (for current game screen)
    queryClient.invalidateQueries({ queryKey: [['gameInstance']] });
    // Invalidate holdings (needed for game summary)
    queryClient.invalidateQueries({ queryKey: [['holding']] });
    // Invalidate wallet (needed for game summary)
    queryClient.invalidateQueries({ queryKey: [['wallet']] });
    // Invalidate home data (user might have leveled up)
    queryClient.invalidateQueries({ queryKey: [['auth', 'getHomeData']] });
    // Invalidate user data (points might have changed)
    queryClient.invalidateQueries({ queryKey: [['auth', 'me']] });
  },

  /**
   * After completing a quiz - invalidates quiz status and user streak data.
   * Used by: completeQuizMutation in daily-quiz.tsx
   */
  quizCompleted: (queryClient: QueryClient) => {
    // Invalidate all quiz-related queries
    queryClient.invalidateQueries({ queryKey: [['userQuiz']] });
    // Invalidate daily quiz status check
    queryClient.invalidateQueries({ queryKey: [['userQuiz', 'hasDoneDailyTodayForCurrentUser']] });
    // Invalidate home data (streak display)
    queryClient.invalidateQueries({ queryKey: [['auth', 'getHomeData']] });
    // Invalidate user data (streak might have changed)
    queryClient.invalidateQueries({ queryKey: [['auth', 'me']] });
  },

  /**
   * After buying or selling an investment - invalidates holdings and wallet.
   * Used by: useBuyInvestment, useSellInvestment hooks
   */
  investmentChanged: (queryClient: QueryClient) => {
    // Invalidate holdings for the game instance
    queryClient.invalidateQueries({ queryKey: [['holding']] });
    // Invalidate wallet balance
    queryClient.invalidateQueries({ queryKey: [['wallet']] });
  },

  /**
   * After user authentication changes - clears all cached data.
   * Used by: logout, login
   */
  authChanged: (queryClient: QueryClient) => {
    queryClient.clear();
  },

  /**
   * Force refresh home screen data - use ONLY for manual "pull to refresh" actions.
   * DO NOT use on screen focus - let React Query handle staleness automatically.
   *
   * Note: invalidateQueries immediately triggers refetch for active queries,
   * so this should only be called when the user explicitly requests a refresh.
   */
  forceRefreshHome: (queryClient: QueryClient) => {
    queryClient.invalidateQueries({ queryKey: [['auth', 'getHomeData']] });
    queryClient.invalidateQueries({ queryKey: [['userQuiz', 'hasDoneDailyTodayForCurrentUser']] });
  },
};
