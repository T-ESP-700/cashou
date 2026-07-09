// tests/service/asset.service.unit.test.ts
import { describe, it, expect } from "bun:test";
import type { Asset } from "@cashou/db-app";
import { Prisma } from "@cashou/db-app";
import { AssetService } from "../../src/trpc/services/asset.service";
import { createServiceTestSetup } from "../helpers/service-test-factory";

function makeAsset(id: number, over: Partial<Asset> = {}): Asset {
  const now = new Date();
  return {
    id,
    title: over.title ?? `Asset ${id}`,
    symbol: over.symbol ?? `AST${id}`,
    fieldId: over.fieldId ?? 1,
    rate: over.rate ?? 1.0,
    description: over.description ?? `Description ${id}`,
    marketId: over.marketId ?? 1,
    submarketId: over.submarketId ?? 1,
    maxAmount: over.maxAmount ?? new Prisma.Decimal(10000),
    minAmount: over.minAmount ?? new Prisma.Decimal(10),
    managementFee: over.managementFee ?? null,
    createdAt: over.createdAt ?? now,
    updatedAt: over.updatedAt ?? now,
  };
}

describe("AssetService — Tests unitaires", () => {
  const { service, wasMethodCalled } = createServiceTestSetup(
    AssetService,
    makeAsset,
    "asset"
  );

  it("findAll retourne tous les actifs", async () => {
    const result = await service.findAll();
    expect(result).toHaveLength(1);
    expect(wasMethodCalled("findMany")).toBeTrue();
  });

  it("findOne retourne un actif par ID", async () => {
    const result = await service.findOne(7);
    expect(result).toMatchObject({ id: 7 });
    expect(wasMethodCalled("findUnique")).toBeTrue();
  });

  it("create crée un nouvel actif", async () => {
    const data = {
      title: "Nouvel actif",
      symbol: "NEW",
      fieldId: 1,
      rate: 1.0,
      description: "Test",
      marketId: 1,
      submarketId: 1,
      taux: 0.05,
      maxAmount: new Prisma.Decimal(10000),
      minAmount: new Prisma.Decimal(10),
    };
    const result = await service.create(data);
    expect(result.id).toBe(123);
    expect(wasMethodCalled("create")).toBeTrue();
  });

  it("update met à jour un actif", async () => {
    const result = await service.update(5, { title: "Actif modifié" });
    expect(result.id).toBe(5);
    expect(wasMethodCalled("update")).toBeTrue();
  });

  it("delete supprime un actif", async () => {
    const result = await service.delete(10);
    expect(result.id).toBe(10);
    expect(wasMethodCalled("delete")).toBeTrue();
  });
});
