// tests/service/dico-entry.service.unit.test.ts
import { describe, it, expect } from "bun:test";
import type { DicoEntry } from "@cashou/db-app";
import { DicoEntryService } from "../../src/trpc/services/dico-entry.service";
import { createServiceTestSetup } from "../helpers/service-test-factory";

function makeDicoEntry(id: number, over: Partial<DicoEntry> = {}): DicoEntry {
  const now = new Date();
  return {
    id,
    term: over.term ?? `Term${id}`,
    definition: over.definition ?? `Definition ${id}`,
    createdAt: over.createdAt ?? now,
    updatedAt: over.updatedAt ?? now,
  };
}

describe("DicoEntryService — Tests unitaires", () => {
  const { service, wasMethodCalled } = createServiceTestSetup(
    DicoEntryService,
    makeDicoEntry,
    "dicoEntry"
  );

  it("findAll retourne toutes les entrées", async () => {
    const result = await service.findAll();
    expect(result).toHaveLength(1);
    expect(wasMethodCalled("findMany")).toBeTrue();
  });

  it("findOne retourne une entrée par ID", async () => {
    const result = await service.findOne(7);
    expect(result).toMatchObject({ id: 7 });
    expect(wasMethodCalled("findUnique")).toBeTrue();
  });

  it("create crée une nouvelle entrée", async () => {
    const data = { term: "Inflation", definition: "Hausse généralisée des prix" };
    const result = await service.create(data);
    expect(result.id).toBe(123);
    expect(wasMethodCalled("create")).toBeTrue();
  });

  it("update met à jour une entrée", async () => {
    const result = await service.update(5, { definition: "Définition modifiée" });
    expect(result.id).toBe(5);
    expect(wasMethodCalled("update")).toBeTrue();
  });

  it("delete supprime une entrée", async () => {
    const result = await service.delete(10);
    expect(result.id).toBe(10);
    expect(wasMethodCalled("delete")).toBeTrue();
  });
});
