// tests/service/schemas-zod.unit.test.ts
// Exerce les transforms Zod des schémas non couverts (0% funcs) — passe des inputs
// valides pour que les closures .transform() soient réellement invoquées.
import { describe, it, expect } from "bun:test";
import {
  assetHistoryDataSchema,
  assetHistoryCreateSchema,
  assetHistoryUpdateSchema,
  assetHistoryIdSchema,
} from "../../src/trpc/schemas-zod/asset-history-schema";
import {
  eventAssetDataSchema,
  eventAssetCreateSchema,
  eventAssetUpdateSchema,
  eventAssetIdSchema,
} from "../../src/trpc/schemas-zod/event-asset-schema";
import {
  userQuizDataSchema,
  userQuizCreateSchema,
  userQuizUpdateSchema,
  userQuizIdSchema,
  startQuizSchema,
  completeQuizSchema,
} from "../../src/trpc/schemas-zod/user-quiz-schema";

describe("assetHistorySchema", () => {
  it("transforme timestamp string ISO en Date", () => {
    const parsed = assetHistoryDataSchema.parse({
      assetId: 1,
      timestamp: "2026-01-15T10:30:00.000Z",
    });
    expect(parsed.timestamp).toBeInstanceOf(Date);
    expect((parsed.timestamp as Date).toISOString()).toBe("2026-01-15T10:30:00.000Z");
  });

  it("accepte assetId et timestamp nullish", () => {
    const parsed = assetHistoryDataSchema.parse({});
    expect(parsed.assetId).toBeUndefined();
    expect(parsed.timestamp).toBeUndefined();
  });

  it("create réutilise le schéma data", () => {
    const parsed = assetHistoryCreateSchema.parse({ assetId: 42 });
    expect(parsed.assetId).toBe(42);
  });

  it("update exige un ID valide", () => {
    expect(() => assetHistoryUpdateSchema.parse({ id: 0, data: {} })).toThrow();
    const ok = assetHistoryUpdateSchema.parse({ id: 5, data: { assetId: 3 } });
    expect(ok.id).toBe(5);
  });

  it("rejette assetId négatif", () => {
    expect(() =>
      assetHistoryDataSchema.parse({ assetId: -1, timestamp: null })
    ).toThrow();
  });

  it("idSchema accepte un ID > 0", () => {
    expect(assetHistoryIdSchema.parse({ id: 10 }).id).toBe(10);
    expect(() => assetHistoryIdSchema.parse({ id: 0 })).toThrow();
  });
});

describe("eventAssetSchema", () => {
  it("transforme date string ISO en Date", () => {
    const parsed = eventAssetDataSchema.parse({
      assetId: 1,
      eventId: 2,
      date: "2026-01-15T10:30:00.000Z",
      value: 100,
      volume: 500,
    });
    expect(parsed.date).toBeInstanceOf(Date);
    expect(parsed.value).toBe(100);
    expect(parsed.volume).toBe(500);
  });

  it("accepte tous les champs nullish", () => {
    const parsed = eventAssetDataSchema.parse({});
    expect(parsed).toEqual({});
  });

  it("create réutilise le schéma data", () => {
    const parsed = eventAssetCreateSchema.parse({ assetId: 1, eventId: 2 });
    expect(parsed.assetId).toBe(1);
  });

  it("update exige un ID > 0", () => {
    expect(() => eventAssetUpdateSchema.parse({ id: 0, data: {} })).toThrow();
    const ok = eventAssetUpdateSchema.parse({ id: 7, data: { value: 200 } });
    expect(ok.id).toBe(7);
  });

  it("rejette assetId ou eventId négatif", () => {
    expect(() => eventAssetDataSchema.parse({ assetId: -1 })).toThrow();
    expect(() => eventAssetDataSchema.parse({ eventId: -1 })).toThrow();
  });

  it("idSchema accepte un ID > 0", () => {
    expect(eventAssetIdSchema.parse({ id: 3 }).id).toBe(3);
  });
});

describe("userQuizSchema", () => {
  it("transforme completedAt (format YYYY-MM-DD) en Date", () => {
    const parsed = userQuizDataSchema.parse({
      quizId: 1,
      userId: "user-123",
      completedAt: "2026-01-15",
      isCorrect: true,
    });
    expect(parsed.completedAt).toBeInstanceOf(Date);
  });

  it("transforme completedAt (ISO 8601) en Date", () => {
    const parsed = userQuizDataSchema.parse({
      completedAt: "2026-01-15T10:30:00.000Z",
    });
    expect(parsed.completedAt).toBeInstanceOf(Date);
    expect((parsed.completedAt as Date).toISOString()).toBe(
      "2026-01-15T10:30:00.000Z"
    );
  });

  it("rejette completedAt au format invalide", () => {
    expect(() =>
      userQuizDataSchema.parse({ completedAt: "15/01/2026" })
    ).toThrow();
    expect(() =>
      userQuizDataSchema.parse({ completedAt: "not-a-date" })
    ).toThrow();
  });

  it("accepte tous les champs nullish", () => {
    const parsed = userQuizDataSchema.parse({});
    expect(parsed).toEqual({});
  });

  it("create réutilise le schéma data", () => {
    const parsed = userQuizCreateSchema.parse({ quizId: 1, userId: "u" });
    expect(parsed.quizId).toBe(1);
  });

  it("update accepte data partiel", () => {
    const ok = userQuizUpdateSchema.parse({ id: 5, data: { isCorrect: true } });
    expect(ok.id).toBe(5);
    expect(ok.data.isCorrect).toBe(true);
  });

  it("idSchema exige un ID > 0", () => {
    expect(userQuizIdSchema.parse({ id: 1 }).id).toBe(1);
    expect(() => userQuizIdSchema.parse({ id: 0 })).toThrow();
  });

  it("startQuizSchema exige quizId > 0 et userId non vide", () => {
    const ok = startQuizSchema.parse({ quizId: 1, userId: "u" });
    expect(ok.quizId).toBe(1);
    expect(() => startQuizSchema.parse({ quizId: 0, userId: "u" })).toThrow();
    expect(() => startQuizSchema.parse({ quizId: 1, userId: "" })).toThrow();
  });

  it("completeQuizSchema exige id > 0 et isCorrect booléen", () => {
    const ok = completeQuizSchema.parse({ id: 1, isCorrect: false });
    expect(ok.isCorrect).toBe(false);
    expect(() => completeQuizSchema.parse({ id: 0, isCorrect: true })).toThrow();
  });
});
