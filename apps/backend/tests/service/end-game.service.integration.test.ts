/**
 * Tests d'intégration pour End Game Service
 * 
 * Workflow : liquidation holdings → calcul intérêts → validation objectifs → fin partie
 * 
 * Services testés :
 * - EndGameService (liquidation + intérêts + objectifs)
 * - GameTimeService (calcul temps écoulé)
 */

import { describe, it, expect, beforeEach, afterAll } from "bun:test";
import { prisma, Prisma } from "@cashou/db-app";
import { EndGameService } from "../../src/trpc/services/end-game.service";
import { IntegrationTestFactory } from "../helpers/integration-test-factory";
import { setupTestDatabase } from "../helpers/integration-test-setup";

describe("End Game Service — Tests d'intégration", () => {
  setupTestDatabase();

  const factory = new IntegrationTestFactory(prisma);
  const endGameService = new EndGameService(prisma);

  beforeEach(async () => {
    await factory.cleanup();
  });

  afterAll(async () => {
    await factory.cleanup();
  });

  describe("Calcul des intérêts", () => {
    it("calcule les intérêts pour un holding avec taux annuel", async () => {
      // Setup : Level avec vitesse accélérée (1 jour de jeu = 1 seconde réelle)
      const level = await factory.createLevel({
        duration: 365, // 1 an
        speed: 86400, // 1 jour/seconde
        startBalance: 10000,
      });

      const asset = await factory.createAsset({
        title: "Asset avec intérêts",
        rate: 5.0, // 5% par an
      });

      const user = await factory.createUser({ levelId: level.id });
      
      // Créer un gameInstance commencé il y a 100 secondes (pour que le temps ait avancé)
      const gameStartedAt = new Date(Date.now() - 100 * 1000);
      const gameInstance = await factory.createGameInstance({
        userId: user.id,
        levelId: level.id,
        startBalance: 10000,
        createdAt: gameStartedAt,
      });

      const wallet = await prisma.wallet.findFirst({
        where: { userId: user.id, gameInstanceId: gameInstance.id },
      });

      // Créer un holding acquis au début de la partie
      await prisma.holding.create({
        data: {
          walletId: wallet!.id,
          assetId: asset.id,
          gameInstanceId: gameInstance.id,
          quantity: new Prisma.Decimal(1000), // 1000 EUR
          acquiredAt: gameStartedAt,
        },
      });

      // Terminer la partie
      const result = await endGameService.endGame(gameInstance.id);

      // Vérifier : intérêts calculés
      // Temps écoulé : 100 secondes réelles = 100 jours de jeu (speed = 86400)
      // Intérêts = 1000 * (5/100/365) * 100 jours ≈ 13.70 EUR
      expect(result.assetsValue).toBeGreaterThan(1000); // 1000 + intérêts
      expect(result.assetsValue).toBeLessThan(1020); // Pas trop d'intérêts
      expect(result.success).toBeDefined();
    });

    it("intérêts = 0 si asset sans taux (rate = null)", async () => {
      const level = await factory.createLevel({
        speed: 86400,
        startBalance: 10000,
      });

      const asset = await factory.createAsset({
        title: "Asset sans intérêts",
        rate: null, // Pas de taux
      });

      const user = await factory.createUser({ levelId: level.id });
      
      const gameStartedAt = new Date(Date.now() - 100 * 1000);
      const gameInstance = await factory.createGameInstance({
        userId: user.id,
        levelId: level.id,
        startBalance: 10000,
        createdAt: gameStartedAt,
      });

      const wallet = await prisma.wallet.findFirst({
        where: { userId: user.id, gameInstanceId: gameInstance.id },
      });

      await prisma.holding.create({
        data: {
          walletId: wallet!.id,
          assetId: asset.id,
          gameInstanceId: gameInstance.id,
          quantity: new Prisma.Decimal(1000),
          acquiredAt: gameStartedAt,
        },
      });

      const result = await endGameService.endGame(gameInstance.id);

      // Vérifier : pas d'intérêts
      expect(result.assetsValue).toBe(1000); // Juste la quantité
    });

    it("intérêts proportionnels à la durée de détention", async () => {
      const level = await factory.createLevel({
        speed: 86400,
        startBalance: 10000,
      });

      const user = await factory.createUser({ levelId: level.id });
      
      // Partie commencée il y a 100 secondes
      const gameStartedAt = new Date(Date.now() - 100 * 1000);
      const gameInstance = await factory.createGameInstance({
        userId: user.id,
        levelId: level.id,
        startBalance: 10000,
        createdAt: gameStartedAt,
      });

      const wallet = await prisma.wallet.findFirst({
        where: { userId: user.id, gameInstanceId: gameInstance.id },
      });

      // Holding 1 : acquis 50 secondes après le début (détenu 50 jours)
      const asset1 = await factory.createAsset({ rate: 10.0 });
      await prisma.holding.create({
        data: {
          walletId: wallet!.id,
          assetId: asset1.id,
          gameInstanceId: gameInstance.id,
          quantity: new Prisma.Decimal(1000),
          acquiredAt: new Date(gameStartedAt.getTime() + 50 * 1000),
        },
      });

      // Holding 2 : acquis au début (détenu 100 jours)
      const asset2 = await factory.createAsset({ rate: 10.0 });
      await prisma.holding.create({
        data: {
          walletId: wallet!.id,
          assetId: asset2.id,
          gameInstanceId: gameInstance.id,
          quantity: new Prisma.Decimal(1000),
          acquiredAt: gameStartedAt,
        },
      });

      const result = await endGameService.endGame(gameInstance.id);

      // Vérifier : intérêts pour 2 holdings
      // Holding 1 : 1000 * 0.1/365 * 50 ≈ 13.70
      // Holding 2 : 1000 * 0.1/365 * 100 ≈ 27.40
      // Total : 2000 + 41.10 ≈ 2041
      expect(result.assetsValue).toBeGreaterThan(2040);
      expect(result.assetsValue).toBeLessThan(2050);
    });
  });

  describe("Validation des objectifs", () => {
    it("objectif wallet_gte_start → validé si balance >= startBalance", async () => {
      const level = await factory.createLevel({
        startBalance: 10000,
      });

      const goal = await factory.createGoal({
        title: "Ne pas perdre d'argent",
        goalType: "wallet_gte_start",
        goalValue: 0,
      });

      await factory.createLevelGoal({
        levelId: level.id,
        goalId: goal.id,
      });

      const user = await factory.createUser({ levelId: level.id });
      const gameInstance = await factory.createGameInstance({
        userId: user.id,
        levelId: level.id,
        startBalance: 10000,
      });

      // Wallet final = 11000 (> startBalance)
      const wallet = await prisma.wallet.findFirst({
        where: { userId: user.id, gameInstanceId: gameInstance.id },
      });
      await prisma.wallet.update({
        where: { id: wallet!.id },
        data: { amount: new Prisma.Decimal(11000) },
      });

      const result = await endGameService.endGame(gameInstance.id);

      expect(result.success).toBeTrue();
      expect(result.goals[0].validated).toBeTrue();
      expect(result.goals[0].title).toBe("Ne pas perdre d'argent");
    });

    it("objectif wallet_gte_start → non validé si balance < startBalance", async () => {
      const level = await factory.createLevel({
        startBalance: 10000,
      });

      const goal = await factory.createGoal({
        title: "Ne pas perdre d'argent",
        goalType: "wallet_gte_start",
        goalValue: 0,
      });

      await factory.createLevelGoal({
        levelId: level.id,
        goalId: goal.id,
      });

      const user = await factory.createUser({ levelId: level.id });
      const gameInstance = await factory.createGameInstance({
        userId: user.id,
        levelId: level.id,
        startBalance: 10000,
      });

      // Wallet final = 8000 (< startBalance)
      const wallet = await prisma.wallet.findFirst({
        where: { userId: user.id, gameInstanceId: gameInstance.id },
      });
      await prisma.wallet.update({
        where: { id: wallet!.id },
        data: { amount: new Prisma.Decimal(8000) },
      });

      const result = await endGameService.endGame(gameInstance.id);

      expect(result.success).toBeFalse();
      expect(result.goals[0].validated).toBeFalse();
    });

    it("objectif wallet_min → validé si balance >= valeur absolue", async () => {
      const level = await factory.createLevel({
        startBalance: 10000,
      });

      const goal = await factory.createGoal({
        title: "Atteindre 15000 EUR",
        goalType: "wallet_min",
        goalValue: 15000,
      });

      await factory.createLevelGoal({
        levelId: level.id,
        goalId: goal.id,
      });

      const user = await factory.createUser({ levelId: level.id });
      const gameInstance = await factory.createGameInstance({
        userId: user.id,
        levelId: level.id,
        startBalance: 10000,
      });

      // Wallet final = 16000 (> 15000)
      const wallet = await prisma.wallet.findFirst({
        where: { userId: user.id, gameInstanceId: gameInstance.id },
      });
      await prisma.wallet.update({
        where: { id: wallet!.id },
        data: { amount: new Prisma.Decimal(16000) },
      });

      const result = await endGameService.endGame(gameInstance.id);

      expect(result.success).toBeTrue();
      expect(result.goals[0].validated).toBeTrue();
    });

    it("objectif profit_min → validé si profit >= pourcentage", async () => {
      const level = await factory.createLevel({
        startBalance: 10000,
      });

      const goal = await factory.createGoal({
        title: "Faire 50% de profit",
        goalType: "profit_min",
        goalValue: 50, // 50%
      });

      await factory.createLevelGoal({
        levelId: level.id,
        goalId: goal.id,
      });

      const user = await factory.createUser({ levelId: level.id });
      const gameInstance = await factory.createGameInstance({
        userId: user.id,
        levelId: level.id,
        startBalance: 10000,
      });

      // Wallet final = 16000 (profit = 60%)
      const wallet = await prisma.wallet.findFirst({
        where: { userId: user.id, gameInstanceId: gameInstance.id },
      });
      await prisma.wallet.update({
        where: { id: wallet!.id },
        data: { amount: new Prisma.Decimal(16000) },
      });

      const result = await endGameService.endGame(gameInstance.id);

      expect(result.success).toBeTrue();
      expect(result.goals[0].validated).toBeTrue();
    });

    it("objectif profit_min → non validé si profit < pourcentage", async () => {
      const level = await factory.createLevel({
        startBalance: 10000,
      });

      const goal = await factory.createGoal({
        title: "Faire 50% de profit",
        goalType: "profit_min",
        goalValue: 50, // 50%
      });

      await factory.createLevelGoal({
        levelId: level.id,
        goalId: goal.id,
      });

      const user = await factory.createUser({ levelId: level.id });
      const gameInstance = await factory.createGameInstance({
        userId: user.id,
        levelId: level.id,
        startBalance: 10000,
      });

      // Wallet final = 13000 (profit = 30%, < 50%)
      const wallet = await prisma.wallet.findFirst({
        where: { userId: user.id, gameInstanceId: gameInstance.id },
      });
      await prisma.wallet.update({
        where: { id: wallet!.id },
        data: { amount: new Prisma.Decimal(13000) },
      });

      const result = await endGameService.endGame(gameInstance.id);

      expect(result.success).toBeFalse();
      expect(result.goals[0].validated).toBeFalse();
    });

    it("multiple objectifs → success si tous validés", async () => {
      const level = await factory.createLevel({
        startBalance: 10000,
      });

      const goal1 = await factory.createGoal({
        title: "Ne pas perdre",
        goalType: "wallet_gte_start",
        goalValue: 0,
      });

      const goal2 = await factory.createGoal({
        title: "Atteindre 15000",
        goalType: "wallet_min",
        goalValue: 15000,
      });

      await factory.createLevelGoal({ levelId: level.id, goalId: goal1.id });
      await factory.createLevelGoal({ levelId: level.id, goalId: goal2.id });

      const user = await factory.createUser({ levelId: level.id });
      const gameInstance = await factory.createGameInstance({
        userId: user.id,
        levelId: level.id,
        startBalance: 10000,
      });

      // Wallet final = 16000 (valide les 2 objectifs)
      const wallet = await prisma.wallet.findFirst({
        where: { userId: user.id, gameInstanceId: gameInstance.id },
      });
      await prisma.wallet.update({
        where: { id: wallet!.id },
        data: { amount: new Prisma.Decimal(16000) },
      });

      const result = await endGameService.endGame(gameInstance.id);

      expect(result.success).toBeTrue();
      expect(result.goals).toHaveLength(2);
      expect(result.goals[0].validated).toBeTrue();
      expect(result.goals[1].validated).toBeTrue();
    });

    it("multiple objectifs → success = false si au moins 1 échoue", async () => {
      const level = await factory.createLevel({
        startBalance: 10000,
      });

      const goal1 = await factory.createGoal({
        title: "Ne pas perdre",
        goalType: "wallet_gte_start",
        goalValue: 0,
      });

      const goal2 = await factory.createGoal({
        title: "Atteindre 20000",
        goalType: "wallet_min",
        goalValue: 20000,
      });

      await factory.createLevelGoal({ levelId: level.id, goalId: goal1.id });
      await factory.createLevelGoal({ levelId: level.id, goalId: goal2.id });

      const user = await factory.createUser({ levelId: level.id });
      const gameInstance = await factory.createGameInstance({
        userId: user.id,
        levelId: level.id,
        startBalance: 10000,
      });

      // Wallet final = 16000 (valide goal1, pas goal2)
      const wallet = await prisma.wallet.findFirst({
        where: { userId: user.id, gameInstanceId: gameInstance.id },
      });
      await prisma.wallet.update({
        where: { id: wallet!.id },
        data: { amount: new Prisma.Decimal(16000) },
      });

      const result = await endGameService.endGame(gameInstance.id);

      expect(result.success).toBeFalse();
      expect(result.goals).toHaveLength(2);
      expect(result.goals[0].validated).toBeTrue();
      expect(result.goals[1].validated).toBeFalse();
    });
  });

  describe("Fin de partie complète", () => {
    it("partie sans holdings → totalValue = wallet seulement", async () => {
      const level = await factory.createLevel({
        startBalance: 10000,
      });

      const user = await factory.createUser({ levelId: level.id });
      const gameInstance = await factory.createGameInstance({
        userId: user.id,
        levelId: level.id,
        startBalance: 10000,
      });

      const wallet = await prisma.wallet.findFirst({
        where: { userId: user.id, gameInstanceId: gameInstance.id },
      });
      await prisma.wallet.update({
        where: { id: wallet!.id },
        data: { amount: new Prisma.Decimal(12000) },
      });

      const result = await endGameService.endGame(gameInstance.id);

      expect(Number(result.walletBalance)).toBe(12000);
      expect(Number(result.assetsValue)).toBe(0);
      expect(Number(result.totalValue)).toBe(12000);
    });

    it("partie avec holdings → totalValue = wallet + assets + intérêts", async () => {
      const level = await factory.createLevel({
        speed: 86400,
        startBalance: 10000,
      });

      const asset = await factory.createAsset({
        rate: 5.0, // 5% par an
      });

      const user = await factory.createUser({ levelId: level.id });
      
      const gameStartedAt = new Date(Date.now() - 100 * 1000);
      const gameInstance = await factory.createGameInstance({
        userId: user.id,
        levelId: level.id,
        startBalance: 10000,
        createdAt: gameStartedAt,
      });

      const wallet = await prisma.wallet.findFirst({
        where: { userId: user.id, gameInstanceId: gameInstance.id },
      });

      // Wallet = 5000
      await prisma.wallet.update({
        where: { id: wallet!.id },
        data: { amount: new Prisma.Decimal(5000) },
      });

      // Holding = 4000 + intérêts
      await prisma.holding.create({
        data: {
          walletId: wallet!.id,
          assetId: asset.id,
          gameInstanceId: gameInstance.id,
          quantity: new Prisma.Decimal(4000),
          acquiredAt: gameStartedAt, // Acquis au début
        },
      });

      const result = await endGameService.endGame(gameInstance.id);

      expect(Number(result.walletBalance)).toBe(5000);
      expect(Number(result.assetsValue)).toBeGreaterThan(4000); // 4000 + intérêts
      expect(Number(result.totalValue)).toBeGreaterThan(9000); // 5000 + 4000+
      expect(Number(result.totalValue)).toBeLessThan(9100); // Pas trop d'intérêts
    });

    it("marque la partie comme terminée (isEnded = true)", async () => {
      const level = await factory.createLevel({
        startBalance: 10000,
      });

      const user = await factory.createUser({ levelId: level.id });
      const gameInstance = await factory.createGameInstance({
        userId: user.id,
        levelId: level.id,
        startBalance: 10000,
      });

      await endGameService.endGame(gameInstance.id);

      const updatedGame = await prisma.gameInstance.findUnique({
        where: { id: gameInstance.id },
      });

      expect(updatedGame?.isEnded).toBeTrue();
      expect(updatedGame?.endedAt).toBeInstanceOf(Date);
    });

    it("message de succès si tous les objectifs validés", async () => {
      const level = await factory.createLevel({
        startBalance: 10000,
      });

      const goal = await factory.createGoal({
        goalType: "wallet_gte_start",
        goalValue: 0,
      });

      await factory.createLevelGoal({ levelId: level.id, goalId: goal.id });

      const user = await factory.createUser({ levelId: level.id });
      const gameInstance = await factory.createGameInstance({
        userId: user.id,
        levelId: level.id,
        startBalance: 10000,
      });

      const wallet = await prisma.wallet.findFirst({
        where: { userId: user.id, gameInstanceId: gameInstance.id },
      });
      await prisma.wallet.update({
        where: { id: wallet!.id },
        data: { amount: new Prisma.Decimal(12000) },
      });

      const result = await endGameService.endGame(gameInstance.id);

      expect(result.message).toContain("Bravo");
      expect(result.message).toContain("12000 EUR");
      expect(result.success).toBeTrue();
    });

    it("message d'échec si objectifs non validés", async () => {
      const level = await factory.createLevel({
        startBalance: 10000,
      });

      const goal = await factory.createGoal({
        goalType: "wallet_min",
        goalValue: 20000, // Impossible à atteindre
      });

      await factory.createLevelGoal({ levelId: level.id, goalId: goal.id });

      const user = await factory.createUser({ levelId: level.id });
      const gameInstance = await factory.createGameInstance({
        userId: user.id,
        levelId: level.id,
        startBalance: 10000,
      });

      const wallet = await prisma.wallet.findFirst({
        where: { userId: user.id, gameInstanceId: gameInstance.id },
      });
      await prisma.wallet.update({
        where: { id: wallet!.id },
        data: { amount: new Prisma.Decimal(12000) },
      });

      const result = await endGameService.endGame(gameInstance.id);

      expect(result.message).toContain("Objectifs non atteints");
      expect(result.success).toBeFalse();
    });
  });

  describe("Validations et erreurs", () => {
    it("rejette si gameInstance introuvable", async () => {
      await expect(endGameService.endGame(999999)).rejects.toThrow("non trouvée");
    });

    // Note: Le test "gameInstance sans level" n'est pas possible car la FK est requise en DB
  });
});
