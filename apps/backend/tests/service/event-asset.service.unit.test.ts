// tests/service/event-asset.service.unit.test.ts
import { describe, it, expect } from "bun:test";
import type { EventAsset } from "@cashou/db-app";
import { EventAssetService } from "../../src/trpc/services/event-asset.service";
import { createServiceTestSetup } from "../helpers/service-test-factory";

function makeEventAsset(id: number, over: Partial<EventAsset> = {}): EventAsset {
  const now = new Date();
  return {
    id,
    eventId: over.eventId ?? 1,
    date: over.date ?? null,
    value: over.value ?? 0.1,
    assetId: over.assetId ?? 1,
    volume: over.volume ?? null,
    createdAt: over.createdAt ?? now,
    updatedAt: over.updatedAt ?? now,
  };
}

describe("EventAssetService — Tests unitaires", () => {
  const { service, wasMethodCalled } = createServiceTestSetup(
    EventAssetService,
    makeEventAsset,
    "eventAsset"
  );

  it("findAll retourne tous les event-assets", async () => {
    const result = await service.findAll();
    expect(result).toHaveLength(1);
    expect(wasMethodCalled("findMany")).toBeTrue();
  });

  it("findOne retourne un event-asset par ID", async () => {
    const result = await service.findOne(7);
    expect(result).toMatchObject({ id: 7 });
    expect(wasMethodCalled("findUnique")).toBeTrue();
  });

  it("create crée un nouveau event-asset", async () => {
    const data = {
      eventId: 1,
      assetId: 1,
      value: 0.15,
    };
    const result = await service.create(data);
    expect(result.id).toBe(123);
    expect(wasMethodCalled("create")).toBeTrue();
  });

  it("update met à jour un event-asset", async () => {
    const result = await service.update(5, { value: 0.2 });
    expect(result.id).toBe(5);
    expect(wasMethodCalled("update")).toBeTrue();
  });

  it("delete supprime un event-asset", async () => {
    const result = await service.delete(10);
    expect(result.id).toBe(10);
    expect(wasMethodCalled("delete")).toBeTrue();
  });
});
