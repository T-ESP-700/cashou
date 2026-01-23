import { createContext, useCallback, useContext, useEffect, useMemo, useState, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import type { ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { trpc } from '@/lib/trpc';
import { trpcClient, setAuthErrorHandler, resetAuthErrorHandling } from '@/lib/trpc';
import { tokenStorage } from '@/lib/token-storage';

interface User {
  id: string;
  email: string;
  name: string | null;
  username: string | null;
  points: number;
  levelId: string | null;
  image: string | null;
  createdAt: string;
  currentStreak?: number;
  maxStreak?: number;
}

interface UseAuthReturn {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<UseAuthReturn | undefined>(undefined);

function useProvideAuth(): UseAuthReturn {
  const [hasToken, setHasToken] = useState<boolean | null>(null); // null = checking
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const isInitialCheckRef = useRef(true);

  // Check for token on mount
  useEffect(() => {
    const checkToken = async () => {
      const token = await tokenStorage.getToken();
      console.log('[useAuth] Token exists:', !!token);
      setHasToken(!!token);
      isInitialCheckRef.current = false;
    };
    checkToken();
  }, []);

  // Use tRPC + React Query for user fetch
  // Only enabled when we have confirmed a token exists
  const {
    data: userData,
    isLoading: isQueryLoading,
    error: queryError,
    refetch,
  } = trpc.auth.me.useQuery(undefined, {
    enabled: hasToken === true, // Only run query when we know token exists
    retry: (failureCount, error) => {
      // Don't retry on auth errors
      const errorMessage = error?.message?.toLowerCase() ?? '';
      if (
        errorMessage.includes('401') ||
        errorMessage.includes('unauthorized') ||
        errorMessage.includes('token')
      ) {
        return false;
      }
      // Retry network errors up to 3 times
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    staleTime: 1000 * 60 * 5, // Consider fresh for 5 minutes
  });

  // Extract user from response (backend returns { session, user })
  const user = useMemo(() => {
    if (!userData) return null;
    return (userData as any).user as User;
  }, [userData]);

  // Handle query errors
  useEffect(() => {
    if (queryError) {
      const errorMessage = queryError.message?.toLowerCase() ?? '';
      if (
        errorMessage.includes('401') ||
        errorMessage.includes('unauthorized') ||
        errorMessage.includes('token')
      ) {
        console.error('[useAuth] Authentication error, token invalid');
        setError('Session expired. Please login again.');
        // Token will be cleared by the tRPC error handler
      } else if (
        errorMessage.includes('network') ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('fetch')
      ) {
        setError('Network error. Please check your connection.');
      } else {
        setError(queryError.message ?? 'Failed to fetch user');
      }
    } else {
      setError(null);
    }
  }, [queryError]);

  const logout = useCallback(async (skipBackendCall = false) => {
    console.log('[useAuth] Logging out...', skipBackendCall ? '(skipping backend call)' : '');

    // Only call backend if we have a valid token and not triggered by 401
    if (!skipBackendCall) {
      const token = await tokenStorage.getToken();
      if (token) {
        try {
          // Call logout endpoint (with timeout) using vanilla client
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Logout timeout')), 5000)
          );

          await Promise.race([
            trpcClient.auth.logout.mutate(),
            timeoutPromise
          ]);

          console.log('[useAuth] Logout successful');
        } catch (err) {
          console.error('[useAuth] Logout backend error:', err);
          // Don't throw, always proceed with local cleanup
        }
      }
    }

    // Always clear local state and token
    await tokenStorage.removeToken();
    setHasToken(false);
    setError(null);

    // Clear all React Query cache
    queryClient.clear();

    // Reset the auth error handling flag so future 401s are handled
    resetAuthErrorHandling();
    console.log('[useAuth] Logout completed, local state cleared');
  }, [queryClient]);

  // Set up auth error handler for tRPC
  useEffect(() => {
    setAuthErrorHandler(() => {
      console.log('[useAuth] Auth error handler triggered, logging out (skip backend)...');
      // Skip backend call since we know the token is already invalid (401)
      logout(true);
    });
  }, [logout]);

  // Refresh user data when app returns to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && hasToken) {
        console.log('[useAuth] App became active, refreshing user data...');
        refetch();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [hasToken, refetch]);

  // Refresh function for external use
  const refreshUser = useCallback(async () => {
    console.log('[useAuth] Manual refresh triggered');
    await refetch();
  }, [refetch]);

  // Compute loading state
  // Loading if: checking for token OR (have token AND query is loading)
  const isLoading = hasToken === null || (hasToken === true && isQueryLoading);

  const contextValue = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: user !== null,
      error,
      refreshUser,
      logout,
    }),
    [user, isLoading, error, refreshUser, logout],
  );

  return contextValue;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useProvideAuth();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export function useAuth(): UseAuthReturn {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth doit être utilisé à l\'intérieur d\'un AuthProvider');
  }
  return context;
}
