/**
 * Tests d'intégration — Impact de TAUX (ImpactType.RATE)
 *
 * Vérifie, avec une DB réelle, le scénario "Baisse du taux du Livret A" :
 *  1. getRateImpacts() traduit coef → nouveau taux et l'ancre sur le bon jour de jeu.
 *  2. Les intérêts (portfolio + fin de partie) sont calculés PAR TRANCHES :
 *     - le taux d'origine s'applique avant l'event,
 *     - le nouveau taux seulement à partir de l'event,
 *     - un achat postérieur à l'event part directement au nouveau taux.
 *
 * Astuce de temps : level.speed = 86400 → 1 seconde réelle = 1 jour de jeu.
 * En réglant gameInstance.createdAt dans le passé, on positionne précisément
 * le jour de jeu courant sans attendre.
 */

import { describe, it, expect, beforeEach, afterAll } from "bun:test";
import { Prisma } from "@cashou/db-app";
import prisma from "../../src/database";
import { InvestmentService } from "../../src/trpc/services/investment.service";
import { EndGameService } from "../../src/trpc/services/end-game.service";
import { AssetHistoryService } from "../../src/trpc/services/asset-history.service";
import { IntegrationTestFactory } from "../helpers/integration-test-factory";
import { setupTestDatabase } from "../helpers/integration-test-setup";

// Paramètres du scénario
const DURATION = 1000; // jours de jeu
const SPEED = 86400; // 1 s réelle = 1 jour de jeu
const BASE_RATE = 1.7; // taux de départ du livret (%)
const COEF = 0.882; // 1.7 × 0.882 ≈ 1.50
const NEW_RATE = 1.5; // taux attendu après arrondi à 2 décimales
const TRIGGER = 30; // % de la durée → event au jour floor(1000×0.30) = 300
const CHANGE_DAY = Math.floor((DURATION * TRIGGER) / 100); // 300
const QTY = 1000; // montant placé

const dailyInterest = (rate: number, days: number) => QTY * (rate / 100 / 365) * days;

describe("Impact de TAUX — Tests d'intégration", () => {
  setupTestDatabase();

  const factory = new IntegrationTestFactory(prisma);
  const investmentService = new InvestmentService(prisma);
  const endGameService = new EndGameService(prisma);
  const assetHistoryService = new AssetHistoryService(prisma);

  beforeEach(async () => {
    await prisma.impact.deleteMany({});
    await factory.cleanup();
  });

  afterAll(async () => {
    await prisma.impact.deleteMany({});
    await factory.cleanup();
  });

  /**
   * Crée le scénario complet : level + asset (taux 1.7, sans historique de prix →
   * force le calcul rate-based) + event RATE + game instance + wallet + holding.
   * @param createdAtOffsetSec  ancienneté (s) de la partie → fixe le jour de jeu courant
   * @param acquiredAtOffsetSec  ancienneté (s) de l'achat du holding
   */
  async function createRateScenario(createdAtOffsetSec: number, acquiredAtOffsetSec: number) {
    const level = await factory.createLevel({
      duration: DURATION,
      speed: SPEED,
      startBalance: 10000,
    });
    const user = await factory.createUser({ levelId: level.id });
    const asset = await factory.createAsset({ rate: BASE_RATE }); // aucun AssetHistory → fallback taux

    const event = await factory.createEvent({ title: "Baisse du taux du Livret A", hasImpact: true });
    await factory.createLevelEvent({
      levelId: level.id,
      eventId: event.id,
      triggerPercent: TRIGGER,
      position: 1,
    });
    await prisma.impact.create({
      data: { eventId: event.id, assetId: asset.id, coef: COEF, impactType: "RATE" },
    });

    const now = Date.now();
    const gameInstance = await factory.createGameInstance({
      userId: user.id,
      levelId: level.id,
      startBalance: 10000,
      createdAt: new Date(now - createdAtOffsetSec * 1000),
    });
    const wallet = await prisma.wallet.findFirstOrThrow({ where: { gameInstanceId: gameInstance.id } });
    await factory.createHolding({
      walletId: wallet.id,
      assetId: asset.id,
      gameInstanceId: gameInstance.id,
      quantity: new Prisma.Decimal(QTY),
      acquiredAt: new Date(now - acquiredAtOffsetSec * 1000),
    });

    return { level, user, asset, event, gameInstance, wallet };
  }

  it("getRateImpacts() traduit le coef en nouveau taux ancré sur le jour de l'event", async () => {
    const { asset, gameInstance } = await createRateScenario(600, 600);

    const changes = await assetHistoryService.getRateImpacts(asset.id, gameInstance.id);

    expect(changes).toHaveLength(1);
    expect(changes[0].changeGameDay).toBe(CHANGE_DAY); // 300
    expect(changes[0].newRate).toBe(NEW_RATE); // round(1.7 × 0.882, 2) = 1.5
  });

  it("portfolio : intérêts par tranches (1.7% avant l'event, 1.5% après)", async () => {
    // Partie au jour ~600 : 300 j @1.7% puis 300 j @1.5%
    const { gameInstance } = await createRateScenario(600, 600);

    const holding = await prisma.holding.findFirstOrThrow({
      where: { gameInstanceId: gameInstance.id },
      include: { asset: true },
    });
    const gi = await prisma.gameInstance.findUniqueOrThrow({
      where: { id: gameInstance.id },
      include: { level: true },
    });

    const interest = await investmentService.calculateInterests(holding as any, gi as any);

    const expectedPiecewise =
      dailyInterest(BASE_RATE, CHANGE_DAY) + dailyInterest(NEW_RATE, 600 - CHANGE_DAY); // ≈ 26.30
    const allOldRate = dailyInterest(BASE_RATE, 600); // ≈ 27.95
    const allNewRate = dailyInterest(NEW_RATE, 600); // ≈ 24.66

    // Conforme au calcul par tranches (résultat arrondi à l'entier dans le service)
    expect(Math.abs(interest - expectedPiecewise)).toBeLessThan(1);
    // Strictement entre les deux extrêmes : la baisse a bien un effet, mais pas rétroactif
    expect(interest).toBeLessThan(allOldRate);
    expect(interest).toBeGreaterThan(allNewRate);
  });

  it("portfolio : avant l'event, seul le taux d'origine s'applique", async () => {
    // Partie au jour ~200 (< 300) : aucune bascule encore
    const { gameInstance } = await createRateScenario(200, 200);

    const holding = await prisma.holding.findFirstOrThrow({
      where: { gameInstanceId: gameInstance.id },
      include: { asset: true },
    });
    const gi = await prisma.gameInstance.findUniqueOrThrow({
      where: { id: gameInstance.id },
      include: { level: true },
    });

    const interest = await investmentService.calculateInterests(holding as any, gi as any);
    expect(Math.abs(interest - dailyInterest(BASE_RATE, 200))).toBeLessThan(1); // ≈ 9.32 €
  });

  it("portfolio : un achat postérieur à l'event part directement au nouveau taux", async () => {
    // Partie au jour ~600 mais holding acquis au jour ~400 (après la baisse au jour 300)
    const { gameInstance } = await createRateScenario(600, 200);

    const holding = await prisma.holding.findFirstOrThrow({
      where: { gameInstanceId: gameInstance.id },
      include: { asset: true },
    });
    const gi = await prisma.gameInstance.findUniqueOrThrow({
      where: { id: gameInstance.id },
      include: { level: true },
    });

    const interest = await investmentService.calculateInterests(holding as any, gi as any);
    // ~200 jours, intégralement à 1.5 %
    expect(Math.abs(interest - dailyInterest(NEW_RATE, 200))).toBeLessThan(1); // ≈ 8.22 €
  });

  it("fin de partie (endGame) : les gains finaux reflètent la bascule de taux", async () => {
    const { level, gameInstance } = await createRateScenario(600, 600);

    // Objectif obligatoire toujours validé (comme "Terminer le niveau")
    const goal = await factory.createGoal({ title: "Terminer le niveau", goalType: null, goalValue: null });
    await factory.createLevelGoal({ levelId: level.id, goalId: goal.id, isMandatory: true });

    const result = await endGameService.endGame(gameInstance.id);

    // assetsValue = quantité + intérêts → on isole l'intérêt appliqué
    const appliedInterest = result.assetsValue - QTY;
    const expectedPiecewise =
      dailyInterest(BASE_RATE, CHANGE_DAY) + dailyInterest(NEW_RATE, 600 - CHANGE_DAY);

    expect(Math.abs(appliedInterest - expectedPiecewise)).toBeLessThan(1);
    expect(appliedInterest).toBeLessThan(dailyInterest(BASE_RATE, 600)); // pas rétroactif
    expect(appliedInterest).toBeGreaterThan(dailyInterest(NEW_RATE, 600));
    expect(result.success).toBe(true); // objectif "Terminer le niveau" toujours validé
  });
});
