// tests/service/market.service.unit.test.ts
import { describe, it, expect, mock, beforeEach } from "bun:test";
import type { Market, PrismaClient } from "@cashou/db-app";
import { MarketService } from "../../src/trpc/services/market.service";
import { createServiceTestSetup } from "../helpers/service-test-factory";

function makeMarket(id: number, over: Partial<Market> = {}): Market {
  const now = new Date();
  return {
    id,
    title: over.title ?? `Market ${id}`,
    description: over.description ?? `Description ${id}`,
    createdAt: over.createdAt ?? now,
    updatedAt: over.updatedAt ?? now,
  };
}

describe("MarketService — Tests unitaires", () => {
  const { service, wasMethodCalled, findCall } = createServiceTestSetup(
    MarketService,
    makeMarket,
    "market"
  );

  it("findAll retourne tous les marchés avec relations", async () => {
    const result = await service.findAll();
    expect(result).toHaveLength(1);
    expect(wasMethodCalled("findMany")).toBeTrue();
    const call = findCall("findMany");
    expect(call?.args).toHaveProperty("include");
  });

  it("findOne retourne un marché par ID", async () => {
    const result = await service.findOne(7);
    expect(result).toMatchObject({ id: 7 });
    expect(wasMethodCalled("findUnique")).toBeTrue();
  });

  it("findOne retourne null si marché introuvable", async () => {
    const result = await service.findOne(999);
    expect(result).toBeNull();
  });

  it("create crée un nouveau marché", async () => {
    const data = { title: "Nouveau Marché", description: "Test" };
    const result = await service.create(data);
    expect(result.id).toBe(123);
    expect(wasMethodCalled("create")).toBeTrue();
  });

  it("update met à jour un marché", async () => {
    const result = await service.update(5, { title: "Marché modifié" });
    expect(result.id).toBe(5);
    expect(wasMethodCalled("update")).toBeTrue();
  });

  it("delete supprime un marché", async () => {
    const result = await service.delete(10);
    expect(result.id).toBe(10);
    expect(wasMethodCalled("delete")).toBeTrue();
  });
});

// ---------------------------------------------------------------------------
// Tests intensifs des méthodes complexes (list, search, getTree, getOverview,
// getSnapshot, getHistory, getHeatmap). Mock direct pour avoir un contrôle fin.
// ---------------------------------------------------------------------------

function buildPrismaMock() {
  return {
    market: {
      count: mock(async (): Promise<number> => 0),
      findMany: mock(async (_args?: unknown): Promise<unknown[]> => []),
      findUnique: mock(async (_args?: unknown): Promise<unknown> => null),
    },
    assetHistory: {
      findMany: mock(async (_args?: unknown): Promise<unknown[]> => []),
    },
  };
}

function makeAssetHistory(value: number, volume = 100, daysAgo = 0) {
  return {
    id: Math.floor(Math.random() * 1000),
    value,
    volume,
    timestamp: new Date(Date.now() - daysAgo * 86400_000),
  };
}

function makeAsset(over: Record<string, unknown> = {}) {
  return {
    id: 1,
    title: "Asset",
    symbol: "AST",
    submarketId: 1,
    marketCap: "1.5B",
    field: { id: 1, name: "Tech" },
    assetHistories: [makeAssetHistory(100)],
    ...over,
  };
}

function makeSubmarket(over: Record<string, unknown> = {}) {
  return {
    id: 1,
    title: "Submarket",
    assets: [makeAsset()],
    _count: { assets: 1 },
    ...over,
  };
}

describe("MarketService — Méthodes complexes", () => {
  let prisma: ReturnType<typeof buildPrismaMock>;
  let service: MarketService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    service = new MarketService(prisma as unknown as PrismaClient);
  });

  describe("list", () => {
    it("retourne paginated items avec compteurs", async () => {
      prisma.market.count = mock(async () => 3);
      prisma.market.findMany = mock(async () => [
        { ...makeMarket(1), _count: { assets: 5, submarkets: 2 } },
        { ...makeMarket(2), _count: { assets: 3, submarkets: 1 } },
      ]);

      const res = await service.list(20, 0);
      expect(res.page.total).toBe(3);
      expect(res.items).toHaveLength(2);
      expect(res.items[0].assets_count).toBe(5);
      expect(res.items[0].submarkets_count).toBe(2);
    });

    it("utilise les defaults limit=20, offset=0", async () => {
      prisma.market.count = mock(async () => 0);
      prisma.market.findMany = mock(async () => []);
      const res = await service.list();
      expect(res.page.limit).toBe(20);
      expect(res.page.offset).toBe(0);
    });
  });

  describe("search", () => {
    it("retourne les marchés correspondants avec relevance", async () => {
      prisma.market.findMany = mock(async () => [
        makeMarket(1, { title: "Tech market" }),
        makeMarket(2, { title: "Health" }),
      ]);
      const res = await service.search("tech");
      expect(res).toHaveLength(2);
      expect(res[0].relevance).toBeGreaterThanOrEqual(0);
    });

    it("ajoute la condition tag dans le where", async () => {
      prisma.market.findMany = mock(async () => []);
      await service.search("query", "TAG");
      const args = (prisma.market.findMany.mock.calls[0]?.[0] ?? {}) as { where: { OR: unknown[] } };
      expect(args.where.OR.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("getTree", () => {
    it("retourne marché + submarkets avec assets_count", async () => {
      prisma.market.findUnique = mock(async () => ({
        ...makeMarket(1),
        submarkets: [
          makeSubmarket({ id: 1, title: "A", _count: { assets: 3 } }),
          makeSubmarket({ id: 2, title: "B", _count: { assets: 7 } }),
        ],
      }));
      const res = await service.getTree(1);
      expect(res.submarkets).toHaveLength(2);
      expect((res.submarkets[0] as { assets_count: number }).assets_count).toBe(3);
    });

    it("throw si marché introuvable", async () => {
      prisma.market.findUnique = mock(async () => null);
      expect(service.getTree(999)).rejects.toThrow("non trouvé");
    });
  });

  describe("getOverview", () => {
    it("retourne kpis, topAssets, submarkets", async () => {
      prisma.market.findUnique = mock(async () => ({
        ...makeMarket(1),
        submarkets: [makeSubmarket()],
        assets: [
          makeAsset({ id: 1, title: "AAA", marketCap: "1B", assetHistories: [makeAssetHistory(100, 50, 0), makeAssetHistory(80, 50, 1)] }),
          makeAsset({ id: 2, title: "BBB", marketCap: "500M", assetHistories: [makeAssetHistory(200), makeAssetHistory(150, 100, 1)] }),
        ],
      }));
      const res = await service.getOverview(1);
      expect(res.kpis).toBeDefined();
      expect(res.topAssets).toBeDefined();
      expect(res.submarkets).toHaveLength(1);
    });

    it("throw si marché introuvable", async () => {
      prisma.market.findUnique = mock(async () => null);
      expect(service.getOverview(999)).rejects.toThrow("non trouvé");
    });
  });

  describe("getSnapshot", () => {
    it("retourne real_time_metrics, alerts, trends, market_status", async () => {
      prisma.market.findUnique = mock(async () => ({
        ...makeMarket(1),
        assets: [makeAsset({ assetHistories: [makeAssetHistory(100, 200)] })],
        submarkets: [
          makeSubmarket({ assets: [makeAsset()] }),
          makeSubmarket({ id: 2, assets: [] }), // sous-marché vide → alerte
        ],
      }));
      const res = await service.getSnapshot(1);
      expect(res.market_id).toBe(1);
      expect(res.real_time_metrics).toBeDefined();
      expect(res.alerts).toBeDefined();
      expect(res.trends).toBeDefined();
      expect(res.market_status).toBeDefined();
    });

    it("throw si marché introuvable", async () => {
      prisma.market.findUnique = mock(async () => null);
      expect(service.getSnapshot(999)).rejects.toThrow("non trouvé");
    });
  });

  describe("getHistory", () => {
    it("retourne aggregated_data et temporal_statistics", async () => {
      const from = new Date("2024-01-01");
      const to = new Date("2024-01-31");
      prisma.market.findUnique = mock(async () => makeMarket(1));
      prisma.assetHistory.findMany = mock(async () => [
        { ...makeAssetHistory(100, 50, 30), asset: makeAsset({ id: 1 }) },
        { ...makeAssetHistory(110, 60, 25), asset: makeAsset({ id: 1 }) },
        { ...makeAssetHistory(105, 70, 20), asset: makeAsset({ id: 2 }) },
      ]);
      const res = await service.getHistory(1, from, to);
      expect(res.market_id).toBe(1);
      expect(res.data_points_count).toBe(3);
      expect(res.aggregated_data).toBeDefined();
      expect(res.temporal_statistics).toBeDefined();
    });

    it("throw si marché introuvable", async () => {
      prisma.market.findUnique = mock(async () => null);
      expect(service.getHistory(999, new Date(), new Date())).rejects.toThrow("non trouvé");
    });
  });

  describe("getHeatmap", () => {
    const validMetrics = ["performance", "volume", "volatility", "risk"];

    for (const metric of validMetrics) {
      it(`retourne heatmap pour métrique "${metric}"`, async () => {
        prisma.market.findUnique = mock(async () => ({
          ...makeMarket(1),
          submarkets: [
            makeSubmarket({
              assets: [
                makeAsset({ assetHistories: [makeAssetHistory(120), makeAssetHistory(100, 50, 1)] }),
              ],
            }),
          ],
        }));
        const res = await service.getHeatmap(1, metric);
        expect(res.metric).toBe(metric);
        expect(res.heatmap_data).toBeDefined();
        expect(res.color_scale).toBeDefined();
      });
    }

    it("throw si métrique invalide", async () => {
      prisma.market.findUnique = mock(async () => ({
        ...makeMarket(1),
        submarkets: [],
      }));
      expect(service.getHeatmap(1, "invalid")).rejects.toThrow("Métrique invalide");
    });

    it("throw si marché introuvable", async () => {
      prisma.market.findUnique = mock(async () => null);
      expect(service.getHeatmap(999, "performance")).rejects.toThrow("non trouvé");
    });
  });
});
