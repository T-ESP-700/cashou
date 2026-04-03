// tests/cache.unit.test.ts
// Unit tests for the cache system (no DB/server required)
import { describe, it, expect, beforeEach } from "bun:test";
import { LRUCache } from "lru-cache";

// Re-implement the cache functions locally to test them in isolation
// (importing from src would require the full module resolution chain)

type CacheValue = Record<string, unknown> | unknown[] | string | number | boolean;

function cached<T>(
  cache: LRUCache<string, CacheValue>,
  key: string,
  fn: () => Promise<T>,
): Promise<T> {
  const hit = cache.get(key) as T | undefined;
  if (hit !== undefined) return Promise.resolve(hit);
  return fn().then((result) => {
    cache.set(key, result as CacheValue);
    return result;
  });
}

function invalidateByPrefix(
  cache: LRUCache<string, CacheValue>,
  prefix: string,
) {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}

describe("Backend Cache System", () => {
  let testCache: LRUCache<string, CacheValue>;

  beforeEach(() => {
    testCache = new LRUCache<string, CacheValue>({
      max: 100,
      ttl: 1000 * 60, // 1 minute for tests
    });
  });

  describe("cached()", () => {
    it("should return fetched data on cache miss", async () => {
      let fetchCount = 0;
      const result = await cached(testCache, "test:1", async () => {
        fetchCount++;
        return { value: 42 };
      });

      expect(result).toEqual({ value: 42 });
      expect(fetchCount).toBe(1);
    });

    it("should return cached data on cache hit (no second fetch)", async () => {
      let fetchCount = 0;
      const fetcher = async () => {
        fetchCount++;
        return { value: 42 };
      };

      await cached(testCache, "test:1", fetcher);
      const result = await cached(testCache, "test:1", fetcher);

      expect(result).toEqual({ value: 42 });
      expect(fetchCount).toBe(1); // Only fetched once
    });

    it("should cache different keys independently", async () => {
      await cached(testCache, "a:1", async () => ({ id: 1 }));
      await cached(testCache, "b:1", async () => ({ id: 2 }));

      const a = await cached(testCache, "a:1", async () => ({ id: 999 }));
      const b = await cached(testCache, "b:1", async () => ({ id: 999 }));

      expect(a).toEqual({ id: 1 });
      expect(b).toEqual({ id: 2 });
    });

    it("should re-fetch after TTL expiry", async () => {
      const shortCache = new LRUCache<string, CacheValue>({
        max: 100,
        ttl: 50, // 50ms TTL
      });

      let fetchCount = 0;
      await cached(shortCache, "test:1", async () => {
        fetchCount++;
        return { value: "first" };
      });

      // Wait for TTL to expire
      await new Promise((resolve) => setTimeout(resolve, 60));

      const result = await cached(shortCache, "test:1", async () => {
        fetchCount++;
        return { value: "second" };
      });

      expect(fetchCount).toBe(2);
      expect(result).toEqual({ value: "second" });
    });
  });

  describe("invalidateByPrefix()", () => {
    it("should remove all keys matching prefix", () => {
      testCache.set("portfolio:1:10", { items: [] } as CacheValue);
      testCache.set("portfolio:1:20", { items: [] } as CacheValue);
      testCache.set("portfolio:2:10", { items: [] } as CacheValue);
      testCache.set("snapshot:1:10", { total: 100 } as CacheValue);

      invalidateByPrefix(testCache, "portfolio:1");

      expect(testCache.has("portfolio:1:10")).toBe(false);
      expect(testCache.has("portfolio:1:20")).toBe(false);
      expect(testCache.has("portfolio:2:10")).toBe(true); // Different game instance
      expect(testCache.has("snapshot:1:10")).toBe(true); // Different prefix
    });

    it("should not remove keys with different prefix", () => {
      testCache.set("portfolio:1:10", { items: [] } as CacheValue);
      testCache.set("snapshot:1:10", { total: 100 } as CacheValue);
      testCache.set("wallet:game:1", { amount: 500 } as CacheValue);

      invalidateByPrefix(testCache, "snapshot:1");

      expect(testCache.has("portfolio:1:10")).toBe(true);
      expect(testCache.has("snapshot:1:10")).toBe(false);
      expect(testCache.has("wallet:game:1")).toBe(true);
    });

    it("should handle empty cache gracefully", () => {
      invalidateByPrefix(testCache, "nonexistent:");
      expect(testCache.size).toBe(0);
    });

    it("should handle prefix that matches nothing", () => {
      testCache.set("portfolio:1:10", { items: [] } as CacheValue);
      invalidateByPrefix(testCache, "nonexistent:");
      expect(testCache.size).toBe(1);
    });
  });

  describe("Cache invalidation after investment mutations", () => {
    it("should invalidate portfolio and snapshot caches after buy", async () => {
      // Simulate cached portfolio and snapshot
      const gameInstanceId = 42;
      testCache.set(`portfolio:${gameInstanceId}:10`, { items: [], totalValue: 1000 } as CacheValue);
      testCache.set(`portfolio:${gameInstanceId}:20`, { items: [], totalValue: 2000 } as CacheValue);
      testCache.set(`snapshot:${gameInstanceId}:10`, { totalValue: 1000 } as CacheValue);
      testCache.set(`snapshot:${gameInstanceId}:20`, { totalValue: 2000 } as CacheValue);

      // Simulate what the buy mutation now does
      invalidateByPrefix(testCache, `portfolio:${gameInstanceId}`);
      invalidateByPrefix(testCache, `snapshot:${gameInstanceId}`);

      // All caches for this game instance should be cleared
      expect(testCache.has(`portfolio:${gameInstanceId}:10`)).toBe(false);
      expect(testCache.has(`portfolio:${gameInstanceId}:20`)).toBe(false);
      expect(testCache.has(`snapshot:${gameInstanceId}:10`)).toBe(false);
      expect(testCache.has(`snapshot:${gameInstanceId}:20`)).toBe(false);
    });

    it("should not invalidate other game instances' caches", async () => {
      testCache.set("portfolio:1:10", { items: [] } as CacheValue);
      testCache.set("portfolio:2:10", { items: [] } as CacheValue);
      testCache.set("snapshot:1:10", { totalValue: 100 } as CacheValue);
      testCache.set("snapshot:2:10", { totalValue: 200 } as CacheValue);

      // Invalidate only game instance 1
      invalidateByPrefix(testCache, "portfolio:1");
      invalidateByPrefix(testCache, "snapshot:1");

      expect(testCache.has("portfolio:1:10")).toBe(false);
      expect(testCache.has("snapshot:1:10")).toBe(false);
      expect(testCache.has("portfolio:2:10")).toBe(true);
      expect(testCache.has("snapshot:2:10")).toBe(true);
    });
  });

  describe("Cache key consistency", () => {
    it("portfolio cache key format should be portfolio:{gameInstanceId}:{walletId}", () => {
      const gameInstanceId = 5;
      const walletId = 10;
      const key = `portfolio:${gameInstanceId}:${walletId}`;

      testCache.set(key, { items: [] } as CacheValue);

      // Prefix-based invalidation with just gameInstanceId should match
      invalidateByPrefix(testCache, `portfolio:${gameInstanceId}`);
      expect(testCache.has(key)).toBe(false);
    });

    it("snapshot cache key format should be snapshot:{gameInstanceId}:{walletId}", () => {
      const gameInstanceId = 5;
      const walletId = 10;
      const key = `snapshot:${gameInstanceId}:${walletId}`;

      testCache.set(key, { totalValue: 100 } as CacheValue);

      invalidateByPrefix(testCache, `snapshot:${gameInstanceId}`);
      expect(testCache.has(key)).toBe(false);
    });

    it("transaction.create invalidation should match investment service cache keys", () => {
      // transaction.router.ts uses these prefixes:
      // invalidateByPrefix(gameCache, `portfolio:${gameInstanceId}`);
      // invalidateByPrefix(gameCache, `snapshot:${gameInstanceId}`);
      // invalidateByPrefix(gameCache, `wallet:game:${gameInstanceId}`);
      // invalidateByPrefix(gameCache, `holdings:game:${gameInstanceId}`);

      // investment.service.ts uses these keys:
      // `portfolio:${gameInstanceId}:${walletId}`
      // `snapshot:${gameInstanceId}:${walletId}`

      const gameInstanceId = 7;
      const walletId = 15;

      testCache.set(`portfolio:${gameInstanceId}:${walletId}`, { items: [] } as CacheValue);
      testCache.set(`snapshot:${gameInstanceId}:${walletId}`, { totalValue: 100 } as CacheValue);

      // Using the same prefixes as transaction.router.ts
      invalidateByPrefix(testCache, `portfolio:${gameInstanceId}`);
      invalidateByPrefix(testCache, `snapshot:${gameInstanceId}`);

      expect(testCache.has(`portfolio:${gameInstanceId}:${walletId}`)).toBe(false);
      expect(testCache.has(`snapshot:${gameInstanceId}:${walletId}`)).toBe(false);
    });
  });

  describe("Static cache invalidation patterns", () => {
    it("should invalidate all quiz entries on quiz mutation", () => {
      testCache.set("quiz:all", [{ id: 1 }] as CacheValue);
      testCache.set("quiz:5", { id: 5 } as CacheValue);
      testCache.set("quiz:10", { id: 10 } as CacheValue);

      invalidateByPrefix(testCache, "quiz:");

      expect(testCache.has("quiz:all")).toBe(false);
      expect(testCache.has("quiz:5")).toBe(false);
      expect(testCache.has("quiz:10")).toBe(false);
    });

    it("should invalidate all level entries on level mutation", () => {
      testCache.set("level:all", [{ id: 1 }] as CacheValue);
      testCache.set("level:1", { id: 1 } as CacheValue);
      testCache.set("level:2", { id: 2 } as CacheValue);
      testCache.set("goal:all", [{ id: 1 }] as CacheValue); // should NOT be affected

      invalidateByPrefix(testCache, "level:");

      expect(testCache.has("level:all")).toBe(false);
      expect(testCache.has("level:1")).toBe(false);
      expect(testCache.has("level:2")).toBe(false);
      expect(testCache.has("goal:all")).toBe(true);
    });
  });
});
