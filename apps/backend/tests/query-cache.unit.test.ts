// tests/query-cache.unit.test.ts
// Unit tests for the mobile query cache logic (re-implemented for testability)
import { describe, it, expect, beforeEach } from "bun:test";

// ── Re-implement the mobile query cache logic for testing ─────────────────
type CacheEntry<T> = {
  data: T;
  timestamp: number;
  ttl: number;
};

const cache = new Map<string, CacheEntry<unknown>>();

async function cachedQuery<T>(
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

async function swr<T>(
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
        .catch(() => {});
    }
    return entry.data;
  }

  const data = await fetcher();
  cache.set(key, { data, timestamp: Date.now(), ttl: ttlMs });
  return data;
}

function invalidateCache(prefix?: string) {
  if (!prefix) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}

function setCacheEntry<T>(key: string, data: T, ttlMs: number = 5000) {
  cache.set(key, { data, timestamp: Date.now(), ttl: ttlMs });
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe("Mobile Query Cache", () => {
  beforeEach(() => {
    cache.clear();
  });

  describe("cachedQuery()", () => {
    it("should fetch on first call", async () => {
      let calls = 0;
      const result = await cachedQuery("test", async () => {
        calls++;
        return { value: 1 };
      });
      expect(result).toEqual({ value: 1 });
      expect(calls).toBe(1);
    });

    it("should return cached data within TTL", async () => {
      let calls = 0;
      const fetcher = async () => {
        calls++;
        return { value: calls };
      };

      const r1 = await cachedQuery("test", fetcher, 5000);
      const r2 = await cachedQuery("test", fetcher, 5000);

      expect(r1).toEqual({ value: 1 });
      expect(r2).toEqual({ value: 1 }); // Same cached value
      expect(calls).toBe(1);
    });

    it("should re-fetch after TTL expiry", async () => {
      let calls = 0;
      const fetcher = async () => {
        calls++;
        return { value: calls };
      };

      await cachedQuery("test", fetcher, 50); // 50ms TTL
      await new Promise((r) => setTimeout(r, 60));
      const result = await cachedQuery("test", fetcher, 50);

      expect(result).toEqual({ value: 2 });
      expect(calls).toBe(2);
    });
  });

  describe("swr()", () => {
    it("should fetch on first call (cold cache)", async () => {
      const result = await swr("test", async () => ({ value: 42 }));
      expect(result).toEqual({ value: 42 });
    });

    it("should return stale data immediately when TTL expired", async () => {
      await swr("test", async () => ({ value: "fresh" }), 50);
      await new Promise((r) => setTimeout(r, 60));

      // SWR should return stale data immediately
      const result = await swr("test", async () => ({ value: "revalidated" }), 50);
      expect(result).toEqual({ value: "fresh" }); // Stale data returned

      // Wait for background revalidation
      await new Promise((r) => setTimeout(r, 10));
      const entry = cache.get("test") as CacheEntry<{ value: string }>;
      expect(entry.data).toEqual({ value: "revalidated" });
    });

    it("should keep stale data when revalidation fails", async () => {
      await swr("test", async () => ({ value: "original" }), 50);
      await new Promise((r) => setTimeout(r, 60));

      const result = await swr<{ value: string }>(
        "test",
        async () => {
          throw new Error("network error");
        },
        50,
      );

      expect(result).toEqual({ value: "original" }); // Stale data kept
    });
  });

  describe("invalidateCache()", () => {
    it("should clear all entries when no prefix given", () => {
      setCacheEntry("a", 1);
      setCacheEntry("b", 2);
      setCacheEntry("c", 3);

      invalidateCache();
      expect(cache.size).toBe(0);
    });

    it("should clear only matching prefix entries", () => {
      setCacheEntry("portfolio:1", { items: [] });
      setCacheEntry("portfolio:2", { items: [] });
      setCacheEntry("snapshot:1", { total: 100 });

      invalidateCache("portfolio:");

      expect(cache.has("portfolio:1")).toBe(false);
      expect(cache.has("portfolio:2")).toBe(false);
      expect(cache.has("snapshot:1")).toBe(true);
    });
  });

  describe("Mobile cache invalidation on game events", () => {
    it("should invalidate all game caches on game:resume", () => {
      const gameInstanceId = 42;
      setCacheEntry(`snapshot:${gameInstanceId}`, { totalValue: 100 });
      setCacheEntry(`portfolio:${gameInstanceId}`, { items: [] });
      setCacheEntry(`wallet:${gameInstanceId}`, { amount: 500 });

      // Simulate what current.tsx does on game:resume
      invalidateCache(`snapshot:${gameInstanceId}`);
      invalidateCache(`portfolio:${gameInstanceId}`);
      invalidateCache(`wallet:${gameInstanceId}`);

      expect(cache.has(`snapshot:${gameInstanceId}`)).toBe(false);
      expect(cache.has(`portfolio:${gameInstanceId}`)).toBe(false);
      expect(cache.has(`wallet:${gameInstanceId}`)).toBe(false);
    });

    it("should invalidate game caches on focus/resync", () => {
      const gameInstanceId = 10;
      setCacheEntry(`snapshot:${gameInstanceId}`, { totalValue: 100 });
      setCacheEntry(`portfolio:${gameInstanceId}`, { items: [] });
      setCacheEntry(`wallet:${gameInstanceId}`, { amount: 500 });
      setCacheEntry(`snapshot:99`, { totalValue: 999 }); // Other game

      invalidateCache(`snapshot:${gameInstanceId}`);
      invalidateCache(`portfolio:${gameInstanceId}`);
      invalidateCache(`wallet:${gameInstanceId}`);

      expect(cache.has(`snapshot:${gameInstanceId}`)).toBe(false);
      expect(cache.has(`snapshot:99`)).toBe(true); // Not invalidated
    });
  });

  describe("setCacheEntry()", () => {
    it("should allow manual cache population after mutations", () => {
      setCacheEntry("portfolio:1", { items: [{ id: 1 }] }, 10000);

      const entry = cache.get("portfolio:1") as CacheEntry<unknown>;
      expect(entry.data).toEqual({ items: [{ id: 1 }] });
      expect(entry.ttl).toBe(10000);
    });
  });
});
