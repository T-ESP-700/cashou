import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import type { Impact } from "@cashou/db-app";
import { impactRouter } from "../../src/trpc/routers/impact.router";
import { ImpactService } from "../../src/trpc/services/impact.service";
import { createRouterTestSetup } from "../helpers/router-test-factory";

function makeImpact(id: number, over: Partial<Impact> = {}): Impact {
  const now = new Date();
  return {
    id,
    eventId: over.eventId ?? 1,
    assetId: over.assetId ?? null,
    submarketId: over.submarketId ?? null,
    fieldId: over.fieldId ?? null,
    coef: over.coef ?? 5.0,
    impactType: over.impactType ?? "PRICE",
    createdAt: over.createdAt ?? now,
    updatedAt: over.updatedAt ?? now,
  };
}

const { wasMethodCalled, findCall } = createRouterTestSetup(ImpactService, makeImpact);

const originalFindByEventId = ImpactService.prototype.findByEventId;

beforeEach(() => {
  ImpactService.prototype.findByEventId = async function (eventId: number): Promise<Impact[]> {
    return [makeImpact(1, { eventId })];
  };
});

afterEach(() => {
  ImpactService.prototype.findByEventId = originalFindByEventId;
});

type Ctx = Parameters<typeof impactRouter.createCaller>[0];

describe("impact.router — CRUD standard", () => {
  it("impact.getAll → appelle service.findAll", async () => {
    const caller = impactRouter.createCaller({} as Ctx);
    const res = await caller.getAll();
    expect(res).toMatchObject([{ id: 1 }]);
    expect(wasMethodCalled("findAll")).toBeTrue();
  });

  it("impact.getById → appelle service.findOne(id)", async () => {
    const caller = impactRouter.createCaller({} as Ctx);
    const res = await caller.getById({ id: 7 });
    expect(res).toMatchObject({ id: 7 });
    expect(findCall("findOne")?.args).toEqual({ id: 7 });
  });

  it("impact.create → appelle service.create(data)", async () => {
    const caller = impactRouter.createCaller({} as Ctx);
    const payload = { eventId: 1, assetId: 2, coef: 10.0 };
    const res = await caller.create(payload);
    expect(res).toMatchObject({ id: 123 });
    expect(wasMethodCalled("create")).toBeTrue();
  });

  it("impact.update → appelle service.update(id, data)", async () => {
    const caller = impactRouter.createCaller({} as Ctx);
    const res = await caller.update({ id: 99, data: { coef: 15.0 } });
    expect(res).toMatchObject({ id: 99, coef: 15.0 });
    expect(findCall("update")?.args).toEqual({ id: 99, data: { coef: 15.0 } });
  });

  it("impact.delete → appelle service.delete(id)", async () => {
    const caller = impactRouter.createCaller({} as Ctx);
    const res = await caller.delete({ id: 5 });
    expect(res.id).toBe(5);
    expect(wasMethodCalled("delete")).toBeTrue();
  });
});

describe("impact.router — Méthodes spéciales", () => {
  it("impact.getByEventId → appelle service.findByEventId(eventId)", async () => {
    const caller = impactRouter.createCaller({} as Ctx);
    const res = await caller.getByEventId({ eventId: 123 });
    expect(res).toMatchObject([{ eventId: 123 }]);
  });
});

describe("impact.router — Validations Zod", () => {
  it("getById avec id invalide → rejette", async () => {
    const caller = impactRouter.createCaller({} as Ctx);
    expect(caller.getById({ id: 0 })).rejects.toBeDefined();
  });

  it("delete avec id invalide → rejette", async () => {
    const caller = impactRouter.createCaller({} as Ctx);
    expect(caller.delete({ id: 0 })).rejects.toBeDefined();
  });
});
