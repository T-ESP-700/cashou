// tests/service/asset-history.service.unit.test.ts
import { describe, it, expect } from "bun:test";
import type { AssetHistory } from "@cashou/db-app";
import { Prisma } from "@cashou/db-app";
import { AssetHistoryService } from "../../src/trpc/services/asset-history.service";
import { createServiceTestSetup } from "../helpers/service-test-factory";

function makeAssetHistory(id: number, over: Partial<AssetHistory> = {}): AssetHistory {
  const now = new Date();
  return {
    id,
    assetId: over.assetId ?? 1,
    timestamp: over.timestamp ?? now,
    value: over.value ?? new Prisma.Decimal(100),
    createdAt: over.createdAt ?? now,
    updatedAt: over.updatedAt ?? now,
  };
}

describe("AssetHistoryService — Tests unitaires", () => {
  const { service, wasMethodCalled } = createServiceTestSetup(
    AssetHistoryService,
    makeAssetHistory,
    "assetHistory"
  );

  it("findAll retourne tout l'historique", async () => {
    const result = await service.findAll();
    expect(result).toHaveLength(1);
    expect(wasMethodCalled("findMany")).toBeTrue();
  });

  it("findOne retourne un historique par ID", async () => {
    const result = await service.findOne(7);
    expect(result).toMatchObject({ id: 7 });
    expect(wasMethodCalled("findUnique")).toBeTrue();
  });

  it("create crée un nouvel historique", async () => {
    const data = {
      assetId: 1,
      timestamp: new Date(),
      value: new Prisma.Decimal(150),
    };
    const result = await service.create(data);
    expect(result.id).toBe(123);
    expect(wasMethodCalled("create")).toBeTrue();
  });

  it("update met à jour un historique", async () => {
    const result = await service.update(5, { value: new Prisma.Decimal(200) });
    expect(result.id).toBe(5);
    expect(wasMethodCalled("update")).toBeTrue();
  });

  it("delete supprime un historique", async () => {
    const result = await service.delete(10);
    expect(result.id).toBe(10);
    expect(wasMethodCalled("delete")).toBeTrue();
  });
});
