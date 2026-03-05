import { createContext, useCallback, useContext, useEffect, useMemo, useState, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import type { ReactNode } from 'react';
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

// Configuration for retry logic
const RETRY_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000, // 1 second
  backoffMultiplier: 2, // Exponential backoff
};

function useProvideAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const retryCountRef = useRef(0);
  const isInitialLoadRef = useRef(true);

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const isNetworkError = (err: any): boolean => {
    // Check for common network error patterns
    return (
      err instanceof TypeError &&
      (err.message === 'Network request failed' || err.message.includes('fetch'))
    ) || (
      err?.message?.includes('network') ||
      err?.message?.includes('timeout') ||
      err?.message?.includes('ECONNREFUSED')
    );
  };

  const isAuthError = (err: any): boolean => {
    // Check for 401 Unauthorized or token invalid errors
    return (
      err?.message?.includes('401') ||
      err?.message?.includes('Unauthorized') ||
      err?.message?.includes('token') ||
      err?.data?.code === 'UNAUTHORIZED'
    );
  };

  const fetchUser = useCallback(async (forceRetry = false) => {
    try {
      console.log('[useAuth] Starting fetchUser...');

      // Only set loading on initial load or forced refresh
      if (isInitialLoadRef.current || forceRetry) {
        setIsLoading(true);
      }

      setError(null);

      // Check if token exists
      const token = await tokenStorage.getToken();
      console.log('[useAuth] Token exists:', !!token);
      if (!token) {
        setUser(null);
        setIsLoading(false);
        isInitialLoadRef.current = false;
        retryCountRef.current = 0;
        return;
      }

      // Fetch user data from backend with retry logic
      let lastError: any = null;
      let attempt = 0;

      while (attempt <= RETRY_CONFIG.maxRetries) {
        try {
          console.log(`[useAuth] Fetching user data (attempt ${attempt + 1}/${RETRY_CONFIG.maxRetries + 1})...`);
          const response = await trpcClient.auth.me.query();
          console.log('[useAuth] User data received:', response);

          // Extract user from response (backend returns { session, user })
          const userData = (response as any).user as User;
          console.log('[useAuth] Extracted user:', userData);
          setUser(userData);
          console.log('[useAuth] User state updated');

          // Reset retry count on success
          retryCountRef.current = 0;
          isInitialLoadRef.current = false;
          return;
        } catch (err) {
          lastError = err;

          // Check if it's an auth error (token invalid/expired)
          // This is a normal flow — silently clear and redirect to login
          if (isAuthError(err)) {
            console.log('[useAuth] Token expired or invalid, clearing session');
            setUser(null);
            await tokenStorage.removeToken();
            break; // Don't retry on auth errors
          }

          // Check if it's a network error and we should retry
          if (isNetworkError(err) && attempt < RETRY_CONFIG.maxRetries) {
            const delay = RETRY_CONFIG.retryDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt);
            console.warn(`[useAuth] Network error, retrying in ${delay}ms...`, err);
            await sleep(delay);
            attempt++;
            continue;
          }

          // Other errors or max retries reached
          throw err;
        }
      }

      // If we get here, we've exhausted retries
      throw lastError;
    } catch (err) {
      if (isNetworkError(err)) {
        console.warn('[useAuth] Network error during fetchUser:', err);
        setError('Network error. Please check your connection.');
      } else if (isAuthError(err)) {
        // Auth errors are already handled in the retry loop above
        console.log('[useAuth] Token expired or invalid, session cleared');
      } else {
        console.error('[useAuth] Unexpected error during fetchUser:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch user');
        setUser(null);
        await tokenStorage.removeToken();
      }
    } finally {
      setIsLoading(false);
      isInitialLoadRef.current = false;
      console.log('[useAuth] fetchUser completed');
    }
  }, []);

  const logout = useCallback(async (skipBackendCall = false) => {
    try {
      setIsLoading(true);
      console.log('[useAuth] Logging out...', skipBackendCall ? '(skipping backend call)' : '');

      // Only call backend if we have a valid token and not triggered by 401
      if (!skipBackendCall) {
        const token = await tokenStorage.getToken();
        if (token) {
          try {
            // Call logout endpoint (with timeout)
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
    } finally {
      // Always clear local state and token
      await tokenStorage.removeToken();
      setUser(null);
      setError(null);
      setIsLoading(false);
      isInitialLoadRef.current = true; // Reset for next login
      retryCountRef.current = 0;
      // Reset the auth error handling flag so future 401s are handled
      resetAuthErrorHandling();
      console.log('[useAuth] Logout completed, local state cleared');
    }
  }, []);

  // Set up auth error handler for tRPC
  useEffect(() => {
    setAuthErrorHandler(() => {
      console.log('[useAuth] Auth error handler triggered, logging out (skip backend)...');
      // Skip backend call since we know the token is already invalid (401)
      logout(true);
    });
  }, [logout]);

  // Fetch user on mount
  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Rafraîchir les données utilisateur quand l'app revient au premier plan
  // Cela permet de mettre à jour le streak automatiquement
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && user) {
        // L'app revient au premier plan et l'utilisateur est connecté
        console.log('[useAuth] App became active, refreshing user data...');
        fetchUser();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [fetchUser, user]);

  const contextValue = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: user !== null,
      error,
      refreshUser: fetchUser,
      logout,
    }),
    [user, isLoading, error, fetchUser, logout],
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
