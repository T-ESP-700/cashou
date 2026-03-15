type CacheEntry<T> = {
  data: T;
  timestamp: number;
  ttl: number;
};

const cache = new Map<string, CacheEntry<unknown>>();

/**
 * Cache-aside pattern: returns cached data if fresh, otherwise fetches and caches
 */
export async function cachedQuery<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number = 5000,
): Promise<T> {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (entry && Date.now() - entry.timestamp < entry.ttl) {
    return entry.data;
  }
  const data = await fetcher();
  cache.set(key, { data, timestamp: Date.now(), ttl: ttlMs });
  return data;
}

/**
 * Stale-while-revalidate: returns stale data immediately, revalidates in background
 */
export async function swr<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number = 5000,
): Promise<T> {
  const entry = cache.get(key) as CacheEntry<T> | undefined;

  if (entry) {
    if (Date.now() - entry.timestamp > entry.ttl) {
      // Stale: revalidate in background
      fetcher()
        .then((data) => {
          cache.set(key, { data, timestamp: Date.now(), ttl: ttlMs });
        })
        .catch(() => {
          // Keep stale data on error
        });
    }
    return entry.data;
  }

  // No cache at all: must fetch
  const data = await fetcher();
  cache.set(key, { data, timestamp: Date.now(), ttl: ttlMs });
  return data;
}

/**
 * Invalidate cache entries by exact key or prefix
 */
export function invalidateCache(prefix?: string) {
  if (!prefix) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}

/**
 * Set a value directly in the cache (useful after mutations)
 */
export function setCacheEntry<T>(key: string, data: T, ttlMs: number = 5000) {
  cache.set(key, { data, timestamp: Date.now(), ttl: ttlMs });
}

/**
 * Get cache stats for debugging
 */
export function getCacheStats() {
  let fresh = 0;
  let stale = 0;
  const now = Date.now();
  for (const [, entry] of cache) {
    if (now - entry.timestamp < entry.ttl) fresh++;
    else stale++;
  }
  return { total: cache.size, fresh, stale };
}
