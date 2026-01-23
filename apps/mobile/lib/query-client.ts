import { QueryClient } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Query Client Configuration
 *
 * Default cache settings optimized for mobile:
 * - staleTime: 5 minutes - data considered fresh, no refetch
 * - gcTime: 30 minutes - data kept in cache for reuse
 * - retry: 2 - retry failed requests (except auth errors)
 */
export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes - data considered fresh
        gcTime: 1000 * 60 * 30, // 30 minutes - cache retention (was cacheTime)
        retry: 2, // Retry failed requests twice
        refetchOnWindowFocus: false, // Mobile: no window focus events
        refetchOnReconnect: true, // Refetch when network reconnects
        networkMode: 'offlineFirst', // Use cache first, then fetch
      },
      mutations: {
        retry: 1, // Retry mutations once on network failure
        networkMode: 'offlineFirst',
      },
    },
  });

/**
 * Persister for React Query cache
 * Stores query cache in AsyncStorage for offline support
 *
 * Configuration:
 * - maxAge: 24 hours - cached data expires after 1 day
 * - throttleTime: 1 second - debounce writes to storage
 */
export const queryPersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'cashou-query-cache',
  throttleTime: 1000, // 1 second - debounce storage writes
});

/**
 * Persist options for PersistQueryClientProvider
 */
export const persistOptions = {
  persister: queryPersister,
  maxAge: 1000 * 60 * 60 * 24, // 24 hours - cache expires after 1 day
  dehydrateOptions: {
    // Only persist successful queries
    shouldDehydrateQuery: (query: any) => {
      // Don't persist queries that are:
      // - In error state
      // - Auth-related (sensitive data)
      const queryKey = query.queryKey?.[0];
      const isAuthQuery = Array.isArray(queryKey) && queryKey[0] === 'auth' && queryKey[1] === 'me';

      return query.state.status === 'success' && !isAuthQuery;
    },
  },
};

/**
 * Cache time recommendations by data type:
 *
 * | Data Type | staleTime | Reason |
 * |-----------|-----------|--------|
 * | User profile (auth.me) | 5 min | Updated occasionally |
 * | Home data (auth.getHomeData) | 2 min | Shows current state |
 * | Quiz content | 10 min | Rarely changes |
 * | Game instance | 30 sec | Frequently updated |
 * | Wallet/Holdings | 30 sec | Real-time portfolio |
 * | Level info | 10 min | Static content |
 */
