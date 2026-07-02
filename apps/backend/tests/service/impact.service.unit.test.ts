// tests/service/impact.service.unit.test.ts
import { describe, it, expect } from "bun:test";
import type { Impact } from "@cashou/db-app";
import { ImpactService } from "../../src/trpc/services/impact.service";
import { createServiceTestSetup } from "../helpers/service-test-factory";

function makeImpact(id: number, over: Partial<Impact> = {}): Impact {
  const now = new Date();
  return {
    id,
    eventId: over.eventId ?? 1,
    fieldId: over.fieldId ?? null,
    submarketId: over.submarketId ?? null,
    assetId: over.assetId ?? 1,
    coef: over.coef ?? 0.05,
    impactType: over.impactType ?? "PRICE",
    createdAt: over.createdAt ?? now,
    updatedAt: over.updatedAt ?? now,
  };
}

describe("ImpactService — Tests unitaires", () => {
  const { service, wasMethodCalled } = createServiceTestSetup(
    ImpactService,
    makeImpact,
    "impact"
  );

  it("findAll retourne tous les impacts", async () => {
    const result = await service.findAll();
    expect(result).toHaveLength(1);
    expect(wasMethodCalled("findMany")).toBeTrue();
  });

  it("findOne retourne un impact par ID", async () => {
    const result = await service.findOne(7);
    expect(result).toMatchObject({ id: 7 });
    expect(wasMethodCalled("findUnique")).toBeTrue();
  });

  it("create crée un nouvel impact", async () => {
    const data = {
      eventId: 1,
      assetId: 1,
      coef: 0.1,
    };
    const result = await service.create(data);
    expect(result.id).toBe(123);
    expect(wasMethodCalled("create")).toBeTrue();
  });

  it("update met à jour un impact", async () => {
    const result = await service.update(5, { coef: 0.15 });
    expect(result.id).toBe(5);
    expect(wasMethodCalled("update")).toBeTrue();
  });

  it("delete supprime un impact", async () => {
    const result = await service.delete(10);
    expect(result.id).toBe(10);
    expect(wasMethodCalled("delete")).toBeTrue();
  });
});
