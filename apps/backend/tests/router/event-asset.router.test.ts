import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import type { EventAsset } from "@cashou/db-app";
import { eventAssetRouter } from "../../src/trpc/routers/event-asset.router";
import { EventAssetService } from "../../src/trpc/services/event-asset.service";
import { createRouterTestSetup } from "../helpers/router-test-factory";

function makeEventAsset(id: number, over: Partial<EventAsset> = {}): EventAsset {
  const now = new Date();
  return {
    id,
    assetId: over.assetId ?? 1,
    eventId: over.eventId ?? 1,
    date: over.date ?? now,
    value: over.value ?? 100,
    volume: over.volume ?? 1000,
    createdAt: over.createdAt ?? now,
    updatedAt: over.updatedAt ?? now,
  };
}

const { wasMethodCalled, findCall } = createRouterTestSetup(EventAssetService, makeEventAsset);

const originalFindByAssetId = EventAssetService.prototype.findByAssetId;
const originalFindByEventId = EventAssetService.prototype.findByEventId;

beforeEach(() => {
  EventAssetService.prototype.findByAssetId = async function (assetId: number): Promise<EventAsset[]> {
    return [makeEventAsset(1, { assetId })];
  };
  EventAssetService.prototype.findByEventId = async function (eventId: number): Promise<EventAsset[]> {
    return [makeEventAsset(1, { eventId })];
  };
});

afterEach(() => {
  EventAssetService.prototype.findByAssetId = originalFindByAssetId;
  EventAssetService.prototype.findByEventId = originalFindByEventId;
});

type Ctx = Parameters<typeof eventAssetRouter.createCaller>[0];

describe("eventAsset.router — CRUD standard", () => {
  it("eventAsset.getAll → appelle service.findAll", async () => {
    const caller = eventAssetRouter.createCaller({} as Ctx);
    const res = await caller.getAll();
    expect(res).toMatchObject([{ id: 1 }]);
    expect(wasMethodCalled("findAll")).toBeTrue();
  });

  it("eventAsset.getById → appelle service.findOne(id)", async () => {
    const caller = eventAssetRouter.createCaller({} as Ctx);
    const res = await caller.getById({ id: 7 });
    expect(res).toMatchObject({ id: 7 });
    expect(findCall("findOne")?.args).toEqual({ id: 7 });
  });

  it("eventAsset.create → appelle service.create(data)", async () => {
    const caller = eventAssetRouter.createCaller({} as Ctx);
    const payload = { assetId: 1, eventId: 1, value: 150 };
    const res = await caller.create(payload);
    expect(res).toMatchObject({ id: 123 });
    expect(wasMethodCalled("create")).toBeTrue();
  });

  it("eventAsset.update → appelle service.update(id, data)", async () => {
    const caller = eventAssetRouter.createCaller({} as Ctx);
    const res = await caller.update({ id: 99, data: { value: 200 } });
    expect(res).toMatchObject({ id: 99, value: 200 });
    expect(findCall("update")?.args).toEqual({ id: 99, data: { value: 200 } });
  });

  it("eventAsset.delete → appelle service.delete(id)", async () => {
    const caller = eventAssetRouter.createCaller({} as Ctx);
    const res = await caller.delete({ id: 5 });
    expect(res.id).toBe(5);
    expect(wasMethodCalled("delete")).toBeTrue();
  });
});

describe("eventAsset.router — Méthodes spéciales", () => {
  it("eventAsset.getByAssetId → appelle service.findByAssetId(assetId)", async () => {
    const caller = eventAssetRouter.createCaller({} as Ctx);
    const res = await caller.getByAssetId({ assetId: 123 });
    expect(res).toMatchObject([{ assetId: 123 }]);
  });

  it("eventAsset.getByEventId → appelle service.findByEventId(eventId)", async () => {
    const caller = eventAssetRouter.createCaller({} as Ctx);
    const res = await caller.getByEventId({ eventId: 456 });
    expect(res).toMatchObject([{ eventId: 456 }]);
  });
});

describe("eventAsset.router — Validations Zod", () => {
  it("getById avec id invalide → rejette", async () => {
    const caller = eventAssetRouter.createCaller({} as Ctx);
    expect(caller.getById({ id: 0 })).rejects.toBeDefined();
  });

  it("delete avec id invalide → rejette", async () => {
    const caller = eventAssetRouter.createCaller({} as Ctx);
    expect(caller.delete({ id: 0 })).rejects.toBeDefined();
  });
});
