// tests/service/submarket.service.unit.test.ts
import { describe, it, expect } from "bun:test";
import type { Submarket } from "@cashou/db-app";
import { SubmarketService } from "../../src/trpc/services/submarket.service";
import { createServiceTestSetup } from "../helpers/service-test-factory";

function makeSubmarket(id: number, over: Partial<Submarket> = {}): Submarket {
  const now = new Date();
  return {
    id,
    marketId: over.marketId ?? 1,
    gameInstanceId: over.gameInstanceId ?? null,
    title: over.title ?? `Submarket ${id}`,
    description: over.description ?? `Description ${id}`,
    createdAt: over.createdAt ?? now,
    updatedAt: over.updatedAt ?? now,
  };
}

describe("SubmarketService — Tests unitaires", () => {
  const { service, wasMethodCalled } = createServiceTestSetup(
    SubmarketService,
    makeSubmarket,
    "submarket"
  );

  it("findAll retourne tous les sous-marchés", async () => {
    const result = await service.findAll();
    expect(result).toHaveLength(1);
    expect(wasMethodCalled("findMany")).toBeTrue();
  });

  it("findOne retourne un sous-marché par ID", async () => {
    const result = await service.findOne(7);
    expect(result).toMatchObject({ id: 7 });
    expect(wasMethodCalled("findUnique")).toBeTrue();
  });

  it("create crée un nouveau sous-marché", async () => {
    const data = { marketId: 1, title: "Nouveau sous-marché", description: "Test" };
    const result = await service.create(data);
    expect(result.id).toBe(123);
    expect(wasMethodCalled("create")).toBeTrue();
  });

  it("update met à jour un sous-marché", async () => {
    const result = await service.update(5, { title: "Sous-marché modifié" });
    expect(result.id).toBe(5);
    expect(wasMethodCalled("update")).toBeTrue();
  });

  it("delete supprime un sous-marché", async () => {
    const result = await service.delete(10);
    expect(result.id).toBe(10);
    expect(wasMethodCalled("delete")).toBeTrue();
  });
});
