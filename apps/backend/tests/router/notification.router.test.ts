import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import type { Notification } from "@cashou/db-app";
import { notificationRouter } from "../../src/trpc/routers/notification.router";
import { NotificationService } from "../../src/trpc/services/notification.service";
import { createRouterTestSetup } from "../helpers/router-test-factory";

function makeNotification(id: number, over: Partial<Notification> = {}): Notification {
  const now = new Date();
  return {
    id,
    userId: over.userId ?? "user1",
    title: over.title ?? `Notification ${id}`,
    message: over.message ?? `Message ${id}`,
    type: over.type ?? "NEWS",
    gameInstanceId: over.gameInstanceId ?? null,
    quizId: over.quizId ?? null,
    eventId: over.eventId ?? null,
    isOpened: over.isOpened ?? false,
    sentAt: over.sentAt ?? now,
    createdAt: over.createdAt ?? now,
    updatedAt: over.updatedAt ?? now,
  };
}

const { wasMethodCalled, findCall } = createRouterTestSetup(
  NotificationService,
  makeNotification
);

// Manually mock special methods not covered by the factory
const originalFindByUser = NotificationService.prototype.findByUser;
const originalMarkedAsRead = NotificationService.prototype.markedAsRead;
const originalMarkAllAsReadByUser = NotificationService.prototype.markAllAsReadByUser;

beforeEach(() => {
  NotificationService.prototype.findByUser = async function (userId: string): Promise<Notification[]> {
    return [makeNotification(1, { userId })];
  };
  NotificationService.prototype.markedAsRead = async function (id: number): Promise<Notification> {
    return makeNotification(id, { isOpened: true });
  };
  NotificationService.prototype.markAllAsReadByUser = async function (): Promise<number> {
    return 5;
  };
});

afterEach(() => {
  NotificationService.prototype.findByUser = originalFindByUser;
  NotificationService.prototype.markedAsRead = originalMarkedAsRead;
  NotificationService.prototype.markAllAsReadByUser = originalMarkAllAsReadByUser;
});

type Ctx = Parameters<typeof notificationRouter.createCaller>[0];

describe("notification.router — CRUD standard", () => {
  it("notification.getAll → appelle service.findAll", async () => {
    const caller = notificationRouter.createCaller({} as Ctx);
    const res = await caller.getAll();
    expect(res).toMatchObject([{ id: 1 }]);
    expect(wasMethodCalled("findAll")).toBeTrue();
  });

  it("notification.getById → appelle service.findOne(id)", async () => {
    const caller = notificationRouter.createCaller({} as Ctx);
    const res = await caller.getById({ id: 7 });
    expect(res).toMatchObject({ id: 7 });
    expect(findCall("findOne")?.args).toEqual({ id: 7 });
  });

  it("notification.create → appelle service.create(data)", async () => {
    const caller = notificationRouter.createCaller({} as Ctx);
    const payload = {
      userId: "user123",
      title: "Test Notification",
      message: "Test Message",
      type: "NEWS" as const,
      is_open: false,
      sent_at: new Date().toISOString(),
    };
    const res = await caller.create(payload);
    expect(res).toMatchObject({ id: 123 });
    expect(wasMethodCalled("create")).toBeTrue();
  });

  it("notification.update → appelle service.update(id, data)", async () => {
    const caller = notificationRouter.createCaller({} as Ctx);
    const res = await caller.update({ id: 99, data: { title: "Updated Notification" } });
    expect(res).toMatchObject({ id: 99, title: "Updated Notification" });
    expect(findCall("update")?.args).toEqual({ id: 99, data: { title: "Updated Notification" } });
  });

  it("notification.delete → appelle service.delete(id)", async () => {
    const caller = notificationRouter.createCaller({} as Ctx);
    const res = await caller.delete({ id: 5 });
    expect(res.id).toBe(5);
    expect(wasMethodCalled("delete")).toBeTrue();
  });
});

describe("notification.router — Méthodes spéciales", () => {
  it("notification.findByUser → appelle service.findByUser(userId)", async () => {
    const caller = notificationRouter.createCaller({} as Ctx);
    const res = await caller.findByUser({ userId: "user123" });
    expect(res).toMatchObject([{ userId: "user123" }]);
  });

  it("notification.markedAsRead → appelle service.markedAsRead(id)", async () => {
    const caller = notificationRouter.createCaller({} as Ctx);
    const res = await caller.markedAsRead({ id: 10 });
    expect(res).toMatchObject({ id: 10, isOpened: true });
  });

  it("notification.markAllAsRead → appelle service.markAllAsReadByUser(userId)", async () => {
    const caller = notificationRouter.createCaller({} as Ctx);
    const res = await caller.markAllAsRead({ userId: "user123" });
    expect(res).toBe(5);
  });
});

describe("notification.router — Validations Zod", () => {
  it("getById avec id invalide → rejette", async () => {
    const caller = notificationRouter.createCaller({} as Ctx);
    expect(caller.getById({ id: 0 })).rejects.toBeDefined();
  });

  it("update avec id invalide → rejette", async () => {
    const caller = notificationRouter.createCaller({} as Ctx);
    expect(caller.update({ id: 0, data: { title: "Test" } })).rejects.toBeDefined();
  });

  it("delete avec id invalide → rejette", async () => {
    const caller = notificationRouter.createCaller({} as Ctx);
    expect(caller.delete({ id: 0 })).rejects.toBeDefined();
  });

  it("findByUser avec userId vide → rejette", async () => {
    const caller = notificationRouter.createCaller({} as Ctx);
    expect(caller.findByUser({ userId: "" })).rejects.toBeDefined();
  });

  it("markedAsRead avec id invalide → rejette", async () => {
    const caller = notificationRouter.createCaller({} as Ctx);
    expect(caller.markedAsRead({ id: 0 })).rejects.toBeDefined();
  });

  it("markAllAsRead avec userId vide → rejette", async () => {
    const caller = notificationRouter.createCaller({} as Ctx);
    expect(caller.markAllAsRead({ userId: "" })).rejects.toBeDefined();
  });
});
