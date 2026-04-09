// tests/service/field.service.unit.test.ts
import { describe, it, expect } from "bun:test";
import type { Field } from "@cashou/db-app";
import { FieldService } from "../../src/trpc/services/field.service";
import { createServiceTestSetup } from "../helpers/service-test-factory";

function makeField(id: number, over: Partial<Field> = {}): Field {
  const now = new Date();
  return {
    id,
    marketId: over.marketId ?? 1,
    name: over.name ?? `Field ${id}`,
    createdAt: over.createdAt ?? now,
    updatedAt: over.updatedAt ?? now,
  };
}

describe("FieldService — Tests unitaires", () => {
  const { service, wasMethodCalled } = createServiceTestSetup(
    FieldService,
    makeField,
    "field"
  );

  it("findAll retourne tous les champs", async () => {
    const result = await service.findAll();
    expect(result).toHaveLength(1);
    expect(wasMethodCalled("findMany")).toBeTrue();
  });

  it("findOne retourne un champ par ID", async () => {
    const result = await service.findOne(7);
    expect(result).toMatchObject({ id: 7 });
    expect(wasMethodCalled("findUnique")).toBeTrue();
  });

  it("create crée un nouveau champ", async () => {
    const data = { marketId: 1, name: "Nouveau champ" };
    const result = await service.create(data);
    expect(result.id).toBe(123);
    expect(wasMethodCalled("create")).toBeTrue();
  });

  it("update met à jour un champ", async () => {
    const result = await service.update(5, { name: "Champ modifié" });
    expect(result.id).toBe(5);
    expect(wasMethodCalled("update")).toBeTrue();
  });

  it("delete supprime un champ", async () => {
    const result = await service.delete(10);
    expect(result.id).toBe(10);
    expect(wasMethodCalled("delete")).toBeTrue();
  });
});
