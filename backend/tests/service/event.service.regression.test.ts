// tests/service/event.service.regression.test.ts
import { describe, it, expect } from "bun:test";
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { Prisma, Event, PrismaClient } from "@prisma/client";
import { EventService } from "../../src/services/event.service";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SNAP_DIR = join(__dirname, "__snapshots__");
const SNAP_FILE = join(SNAP_DIR, "event.service.regression.snap.json");

type Call =
    | { method: "findMany"; args: Prisma.EventFindManyArgs }
    | { method: "findUnique"; args: Prisma.EventFindUniqueArgs };

type SnapshotData = {
  findManyArgs: Prisma.EventFindManyArgs | undefined;
  findUniqueArgs: Prisma.EventFindUniqueArgs | undefined;
};

function makePrismaRecorder() {
  const calls: Call[] = [];
  const prisma = {
    event: {
      findMany: async (args: Prisma.EventFindManyArgs): Promise<Event[]> => {
        calls.push({ method: "findMany", args });
        return [];
      },
      findUnique: async (args: Prisma.EventFindUniqueArgs): Promise<Event | null> => {
        calls.push({ method: "findUnique", args });
        return null;
      },
    },
  };

  void prisma.event.findMany;
  void prisma.event.findUnique;

  return { prisma, calls };
}

function loadSnapshot(): SnapshotData | null {
  if (!existsSync(SNAP_FILE)) return null;
  const content = readFileSync(SNAP_FILE, "utf8");
  return JSON.parse(content) as SnapshotData;
}

function saveSnapshot(value: SnapshotData) {
  if (!existsSync(SNAP_DIR)) mkdirSync(SNAP_DIR, { recursive: true });
  writeFileSync(SNAP_FILE, JSON.stringify(value, null, 2), "utf8");
}

describe("EventService — Tests de régression (snapshot maison)", () => {
  it("findAll & findOne conservent la forme des options Prisma", async () => {
    const { prisma, calls } = makePrismaRecorder();
    const service = new EventService(prisma as unknown as PrismaClient);

    await service.findAll();
    await service.findOne(7);

    const current: SnapshotData = {
      findManyArgs: calls.find((c) => c.method === "findMany")?.args,
      findUniqueArgs: calls.find((c) => c.method === "findUnique")?.args,
    };

    const stored = loadSnapshot();
    if (!stored || process.env.UPDATE_SNAPSHOT === "1") {
      saveSnapshot(current);
      expect(current).toBeDefined();
    } else {
      expect(current).toEqual(stored);
    }
  });
});
