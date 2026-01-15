// tests/service/market.service.unit.test.ts
import { describe, it, expect } from "bun:test";
import type { Market } from "@cashou/db-app";
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
