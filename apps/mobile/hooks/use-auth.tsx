import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import type { ReactNode } from 'react';
import { trpcClient } from '@/lib/trpc';
import { tokenStorage } from '@/lib/token-storage';

interface User {
  id: string;
  email: string;
  name: string | null;
  points: number;
  levelId: string | null;
  image: string | null;
  createdAt: string;
  currentStreak?: number;
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
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = useCallback(async () => {
    try {
      console.log('[useAuth] Starting fetchUser...');
      setIsLoading(true);
      setError(null);

      // Check if token exists
      const token = await tokenStorage.getToken();
      console.log('[useAuth] Token exists:', !!token);
      if (!token) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      // Fetch user data from backend
      console.log('[useAuth] Fetching user data from backend...');
      const response = await trpcClient.auth.me.query();
      console.log('[useAuth] User data received:', response);
      // Extract user from response (backend returns { session, user })
      const userData = (response as any).user as User;
      console.log('[useAuth] Extracted user:', userData);
      console.log('[useAuth] currentStreak value from backend:', userData?.currentStreak);
      console.log('[useAuth] Setting user state with currentStreak:', userData?.currentStreak);
      setUser(userData);
      console.log('[useAuth] User state updated');
    } catch (err) {
      console.error('[useAuth] Failed to fetch user:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch user');
      setUser(null);
      // Clear invalid token
      await tokenStorage.removeToken();
    } finally {
      setIsLoading(false);
      console.log('[useAuth] fetchUser completed');
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      setIsLoading(true);
      // Call logout endpoint
      await trpcClient.auth.logout.mutate();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      // Always clear local state and token
      await tokenStorage.removeToken();
      setUser(null);
      setIsLoading(false);
    }
  }, []);

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

