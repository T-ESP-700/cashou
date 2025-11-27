import { useState, useEffect, useCallback } from 'react';
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

export function useAuth(): UseAuthReturn {
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
      setUser(userData);
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

  return {
    user,
    isLoading,
    isAuthenticated: user !== null,
    error,
    refreshUser: fetchUser,
    logout,
  };
}
