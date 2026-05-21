import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import type { Question } from "@cashou/db-app";
import { questionRouter } from "../../src/trpc/routers/question.router";
import { QuestionService } from "../../src/trpc/services/question.service";
import { createRouterTestSetup } from "../helpers/router-test-factory";

function makeQuestion(id: number, over: Partial<Question> = {}): Question {
  const now = new Date();
  return {
    id,
    text: over.text ?? `Question ${id}`,
    explanation: over.explanation ?? null,
    createdAt: over.createdAt ?? now,
    updatedAt: over.updatedAt ?? now,
  };
}

const { wasMethodCalled, findCall } = createRouterTestSetup(QuestionService, makeQuestion);

const originalSearch = QuestionService.prototype.search;

beforeEach(() => {
  QuestionService.prototype.search = async function (): Promise<Question[]> {
    return [makeQuestion(1)];
  };
});

afterEach(() => {
  QuestionService.prototype.search = originalSearch;
});

type Ctx = Parameters<typeof questionRouter.createCaller>[0];

describe("question.router — CRUD standard", () => {
  it("question.getAll → appelle service.findAll", async () => {
    const caller = questionRouter.createCaller({} as Ctx);
    const res = await caller.getAll();
    expect(res).toMatchObject([{ id: 1 }]);
    expect(wasMethodCalled("findAll")).toBeTrue();
  });

  it("question.getById → appelle service.findOne(id)", async () => {
    const caller = questionRouter.createCaller({} as Ctx);
    const res = await caller.getById({ id: 7 });
    expect(res).toMatchObject({ id: 7 });
    expect(findCall("findOne")?.args).toEqual({ id: 7 });
  });

  it("question.create → appelle service.create(data)", async () => {
    const caller = questionRouter.createCaller({} as Ctx);
    const payload = { text: "Test Question", explanation: "Test Explanation" };
    const res = await caller.create(payload);
    expect(res).toMatchObject({ id: 123 });
    expect(wasMethodCalled("create")).toBeTrue();
  });

  it("question.update → appelle service.update(id, data)", async () => {
    const caller = questionRouter.createCaller({} as Ctx);
    const res = await caller.update({ id: 99, data: { text: "Updated Question" } });
    expect(res).toMatchObject({ id: 99, text: "Updated Question" });
    expect(findCall("update")?.args).toEqual({ id: 99, data: { text: "Updated Question" } });
  });

  it("question.delete → appelle service.delete(id)", async () => {
    const caller = questionRouter.createCaller({} as Ctx);
    const res = await caller.delete({ id: 5 });
    expect(res.id).toBe(5);
    expect(wasMethodCalled("delete")).toBeTrue();
  });
});

describe("question.router — Méthodes spéciales", () => {
  it("question.search → appelle service.search(keyword)", async () => {
    const caller = questionRouter.createCaller({} as Ctx);
    const res = await caller.search({ keyword: "finance" });
    expect(res).toMatchObject([{ id: 1 }]);
  });
});

describe("question.router — Validations Zod", () => {
  it("getById avec id invalide → rejette", async () => {
    const caller = questionRouter.createCaller({} as Ctx);
    expect(caller.getById({ id: 0 })).rejects.toBeDefined();
  });

  it("delete avec id invalide → rejette", async () => {
    const caller = questionRouter.createCaller({} as Ctx);
    expect(caller.delete({ id: 0 })).rejects.toBeDefined();
  });
});
