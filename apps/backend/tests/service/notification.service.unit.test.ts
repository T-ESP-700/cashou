// tests/service/notification.service.unit.test.ts
import { describe, it, expect } from "bun:test";
import type { Notification } from "@cashou/db-app";
import { NotificationService } from "../../src/trpc/services/notification.service";
import { createServiceTestSetup } from "../helpers/service-test-factory";

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

describe("NotificationService — Tests unitaires", () => {
  const { service, wasMethodCalled } = createServiceTestSetup(
    NotificationService,
    makeNotification,
    "notification"
  );

  it("findAll retourne toutes les notifications", async () => {
    const result = await service.findAll();
    expect(result).toHaveLength(1);
    expect(wasMethodCalled("findMany")).toBeTrue();
  });

  it("findOne retourne une notification par ID", async () => {
    const result = await service.findOne(7);
    expect(result).toMatchObject({ id: 7 });
    expect(wasMethodCalled("findUnique")).toBeTrue();
  });

  it("create crée une nouvelle notification", async () => {
    const data = {
      userId: "user1",
      title: "Test",
      message: "Message test",
      type: "NEWS" as const,
      isOpened: false,
      sentAt: new Date(),
    };
    const result = await service.create(data);
    expect(result.id).toBe(123);
    expect(wasMethodCalled("create")).toBeTrue();
  });

  it("update met à jour une notification", async () => {
    const result = await service.update(5, { isOpened: true });
    expect(result.id).toBe(5);
    expect(wasMethodCalled("update")).toBeTrue();
  });

  it("delete supprime une notification", async () => {
    const result = await service.delete(10);
    expect(result.id).toBe(10);
    expect(wasMethodCalled("delete")).toBeTrue();
  });
});
