import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import type { Field } from "@cashou/db-app";
import { fieldRouter } from "../../src/trpc/routers/field.router";
import { FieldService } from "../../src/trpc/services/field.service";
import { createRouterTestSetup } from "../helpers/router-test-factory";

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

const { wasMethodCalled, findCall } = createRouterTestSetup(FieldService, makeField);

const originalFindByMarketId = FieldService.prototype.findByMarketId;

beforeEach(() => {
  FieldService.prototype.findByMarketId = async function (marketId: number): Promise<Field[]> {
    return [makeField(1, { marketId })];
  };
});

afterEach(() => {
  FieldService.prototype.findByMarketId = originalFindByMarketId;
});

type Ctx = Parameters<typeof fieldRouter.createCaller>[0];

describe("field.router — CRUD standard", () => {
  it("field.getAll → appelle service.findAll", async () => {
    const caller = fieldRouter.createCaller({} as Ctx);
    const res = await caller.getAll();
    expect(res).toMatchObject([{ id: 1 }]);
    expect(wasMethodCalled("findAll")).toBeTrue();
  });

  it("field.getById → appelle service.findOne(id)", async () => {
    const caller = fieldRouter.createCaller({} as Ctx);
    const res = await caller.getById({ id: 7 });
    expect(res).toMatchObject({ id: 7 });
    expect(findCall("findOne")?.args).toEqual({ id: 7 });
  });

  it("field.create → appelle service.create(data)", async () => {
    const caller = fieldRouter.createCaller({} as Ctx);
    const payload = { name: "Finance", marketId: 1 };
    const res = await caller.create(payload);
    expect(res).toMatchObject({ id: 123 });
    expect(wasMethodCalled("create")).toBeTrue();
  });

  it("field.update → appelle service.update(id, data)", async () => {
    const caller = fieldRouter.createCaller({} as Ctx);
    const res = await caller.update({ id: 99, data: { name: "Updated Field" } });
    expect(res).toMatchObject({ id: 99, name: "Updated Field" });
    expect(findCall("update")?.args).toEqual({ id: 99, data: { name: "Updated Field" } });
  });

  it("field.delete → appelle service.delete(id)", async () => {
    const caller = fieldRouter.createCaller({} as Ctx);
    const res = await caller.delete({ id: 5 });
    expect(res.id).toBe(5);
    expect(wasMethodCalled("delete")).toBeTrue();
  });
});

describe("field.router — Méthodes spéciales", () => {
  it("field.getByMarketId → appelle service.findByMarketId(marketId)", async () => {
    const caller = fieldRouter.createCaller({} as Ctx);
    const res = await caller.getByMarketId({ marketId: 123 });
    expect(res).toMatchObject([{ marketId: 123 }]);
  });
});

describe("field.router — Validations Zod", () => {
  it("getById avec id invalide → rejette", async () => {
    const caller = fieldRouter.createCaller({} as Ctx);
    expect(caller.getById({ id: 0 })).rejects.toBeDefined();
  });

  it("update avec id invalide → rejette", async () => {
    const caller = fieldRouter.createCaller({} as Ctx);
    expect(caller.update({ id: 0, data: { name: "Test" } })).rejects.toBeDefined();
  });

  it("delete avec id invalide → rejette", async () => {
    const caller = fieldRouter.createCaller({} as Ctx);
    expect(caller.delete({ id: 0 })).rejects.toBeDefined();
  });

  it("getByMarketId avec marketId invalide → rejette", async () => {
    const caller = fieldRouter.createCaller({} as Ctx);
    expect(caller.getByMarketId({ marketId: 0 })).rejects.toBeDefined();
  });
});
