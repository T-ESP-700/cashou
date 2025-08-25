import { describe, it, expect } from "bun:test";
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";

import {LevelService} from "../../src/services/level.service.ts";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

type AnyPrisma = any;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SNAP_DIR = join(__dirname, "__snapshots__");
const SNAP_FILE = join(SNAP_DIR, "level.service.regression.snap.json");
function makePrismaRecorder() {
  const calls: Array<[string, any]> = [];
  const prisma = {
    level: {
      findMany: async (args: any) => {
        calls.push(["findMany", args]);
        return [];
      },
      findUnique: async (args: any) => {
        calls.push(["findUnique", args]);
        return null;
      },
    },
  } as AnyPrisma;
  return { prisma, calls };
}

function loadSnapshot(): any | null {
  if (!existsSync(SNAP_FILE)) return null;
  const content = readFileSync(SNAP_FILE, "utf8");
  return JSON.parse(content);
}

function saveSnapshot(value: any) {
  if (!existsSync(SNAP_DIR)) mkdirSync(SNAP_DIR, { recursive: true });
  writeFileSync(SNAP_FILE, JSON.stringify(value, null, 2), "utf8");
}

describe("LevelService — Tests de régression (snapshot maison)", () => {
  it("findAll & findOne conservent la forme des options Prisma", async () => {
    const { prisma, calls } = makePrismaRecorder();
    const service = new LevelService(prisma as any);

    await service.findAll();
    await service.findOne(7);

    const current = {
      findManyArgs: calls.find((c) => c[0] === "findMany")?.[1],
      findUniqueArgs: calls.find((c) => c[0] === "findUnique")?.[1],
    };

    const stored = loadSnapshot();
    if (!stored || process.env.UPDATE_SNAPSHOT === "1") {
      saveSnapshot(current);
      // Premier run (ou mise à jour) — on considère la sauvegarde comme la vérité
      expect(current).toBeDefined();
    } else {
      expect(current).toEqual(stored);
    }
  });
});
