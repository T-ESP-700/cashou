import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import type { DicoEntry } from "@cashou/db-app";
import { dicoEntryRouter } from "../../src/trpc/routers/dico-entry.router";
import { DicoEntryService } from "../../src/trpc/services/dico-entry.service";
import { createRouterTestSetup } from "../helpers/router-test-factory";

function makeDicoEntry(id: number, over: Partial<DicoEntry> = {}): DicoEntry {
  const now = new Date();
  return {
    id,
    term: over.term ?? `Term ${id}`,
    definition: over.definition ?? `Definition ${id}`,
    createdAt: over.createdAt ?? now,
    updatedAt: over.updatedAt ?? now,
  };
}

const { wasMethodCalled, findCall } = createRouterTestSetup(DicoEntryService, makeDicoEntry);

const originalSearch = DicoEntryService.prototype.search;
const originalFindAllPaginated = DicoEntryService.prototype.findAllPaginated;

beforeEach(() => {
  DicoEntryService.prototype.search = async function (): Promise<DicoEntry[]> {
    return [makeDicoEntry(1)];
  };
  DicoEntryService.prototype.findAllPaginated = async function (): Promise<any> {
    return {
      entries: [makeDicoEntry(1)],
      total: 1,
      page: 1,
      limit: 50,
    };
  };
});

afterEach(() => {
  DicoEntryService.prototype.search = originalSearch;
  DicoEntryService.prototype.findAllPaginated = originalFindAllPaginated;
});

type Ctx = Parameters<typeof dicoEntryRouter.createCaller>[0];

describe("dicoEntry.router — CRUD standard", () => {
  it("dicoEntry.getAll → appelle service.findAll", async () => {
    const caller = dicoEntryRouter.createCaller({} as Ctx);
    const res = await caller.getAll();
    expect(res).toMatchObject([{ id: 1 }]);
    expect(wasMethodCalled("findAll")).toBeTrue();
  });

  it("dicoEntry.getById → appelle service.findOne(id)", async () => {
    const caller = dicoEntryRouter.createCaller({} as Ctx);
    const res = await caller.getById({ id: 7 });
    expect(res).toMatchObject({ id: 7 });
    expect(findCall("findOne")?.args).toEqual({ id: 7 });
  });

  it("dicoEntry.create → appelle service.create(data)", async () => {
    const caller = dicoEntryRouter.createCaller({} as Ctx);
    const payload = { term: "Inflation", definition: "Rising prices" };
    const res = await caller.create(payload);
    expect(res).toMatchObject({ id: 123 });
    expect(wasMethodCalled("create")).toBeTrue();
  });

  it("dicoEntry.update → appelle service.update(id, data)", async () => {
    const caller = dicoEntryRouter.createCaller({} as Ctx);
    const res = await caller.update({ id: 99, data: { term: "Updated Term" } });
    expect(res).toMatchObject({ id: 99, term: "Updated Term" });
    expect(findCall("update")?.args).toEqual({ id: 99, data: { term: "Updated Term" } });
  });

  it("dicoEntry.delete → appelle service.delete(id)", async () => {
    const caller = dicoEntryRouter.createCaller({} as Ctx);
    const res = await caller.delete({ id: 5 });
    expect(res.id).toBe(5);
    expect(wasMethodCalled("delete")).toBeTrue();
  });
});

describe("dicoEntry.router — Méthodes spéciales", () => {
  it("dicoEntry.getAllPaginated → appelle service.findAllPaginated(page, limit)", async () => {
    const caller = dicoEntryRouter.createCaller({} as Ctx);
    const res = await caller.getAllPaginated({ page: 1, limit: 50 });
    expect(res).toMatchObject({ entries: [{ id: 1 }], total: 1 });
  });

  it("dicoEntry.search → appelle service.search(query)", async () => {
    const caller = dicoEntryRouter.createCaller({} as Ctx);
    const res = await caller.search({ query: "finance" });
    expect(res).toMatchObject([{ id: 1 }]);
  });
});

describe("dicoEntry.router — Validations Zod", () => {
  it("getById avec id invalide → rejette", async () => {
    const caller = dicoEntryRouter.createCaller({} as Ctx);
    expect(caller.getById({ id: 0 })).rejects.toBeDefined();
  });

  it("delete avec id invalide → rejette", async () => {
    const caller = dicoEntryRouter.createCaller({} as Ctx);
    expect(caller.delete({ id: 0 })).rejects.toBeDefined();
  });
});
