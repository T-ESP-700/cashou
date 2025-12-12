// tests/service/level.service.regression.test.ts
import { describe, it, expect } from "bun:test";
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { Prisma, Level, PrismaClient } from "@prisma/client";
import { LevelService } from "../../src/trpc/services/level.service";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SNAP_DIR = join(__dirname, "__snapshots__");
const SNAP_FILE = join(SNAP_DIR, "level.service.regression.snap.json");

type Call =
    | { method: "findMany"; args: Prisma.LevelFindManyArgs }
    | { method: "findUnique"; args: Prisma.LevelFindUniqueArgs };

type SnapshotData = {
  findManyArgs: Prisma.LevelFindManyArgs | undefined;
  findUniqueArgs: Prisma.LevelFindUniqueArgs | undefined;
};

function makePrismaRecorder() {
  const calls: Call[] = [];
  const prisma = {
    level: {
      findMany: async (args: Prisma.LevelFindManyArgs): Promise<Level[]> => {
        calls.push({ method: "findMany", args });
        return [];
      },
      findUnique: async (args: Prisma.LevelFindUniqueArgs): Promise<Level | null> => {
        calls.push({ method: "findUnique", args });
        return null;
      },
    },
  };

  void prisma.level.findMany;
  void prisma.level.findUnique;

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

describe("LevelService — Tests de régression (snapshot maison)", () => {
  it("findAll & findOne conservent la forme des options Prisma", async () => {
    const { prisma, calls } = makePrismaRecorder();
    const service = new LevelService(prisma as unknown as PrismaClient);

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