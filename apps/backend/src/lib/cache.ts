import { LRUCache } from "lru-cache";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CacheValue = Record<string, any> | any[] | string | number | boolean;

// Cache for quasi-static data (levels, goals, markets, quiz questions)
// Invalidated manually on backoffice mutations
export const staticCache = new LRUCache<string, CacheValue>({
  max: 500,
  ttl: 1000 * 60 * 10, // 10 minutes
});

// Cache for game session data (portfolio, wallet, holdings)
// Short TTL because it changes during gameplay
export const gameCache = new LRUCache<string, CacheValue>({
  max: 2000,
  ttl: 1000 * 3, // 3 seconds
});

// Cache for expensive computations (end-game results, market overview)
export const computeCache = new LRUCache<string, CacheValue>({
  max: 200,
  ttl: 1000 * 30, // 30 seconds
});

// Cache-aside pattern helper
export async function cached<T>(
  cache: LRUCache<string, CacheValue>,
  key: string,
  fn: () => Promise<T>,
): Promise<T> {
  const hit = cache.get(key) as T | undefined;
  if (hit !== undefined) return hit;
  const result = await fn();
  cache.set(key, result as CacheValue);
  return result;
}

// Invalidate all keys matching a prefix
export function invalidateByPrefix(
  cache: LRUCache<string, CacheValue>,
  prefix: string,
) {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}
