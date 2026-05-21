/**
 * Tests E2E — Scénario utilisateur complet
 * 
 * Teste le workflow complet :
 * 1. Inscription utilisateur
 * 2. Création de partie
 * 3. Achat d'asset
 * 4. Vente d'asset
 * 5. Fin de partie avec validation objectifs
 * 
 * Ultra-optimisé : utilise e2e-test-factory pour setup réutilisable
 */

import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { createE2ESetup, createGameE2ESetup, cleanupE2EServer } from "../helpers/e2e-test-factory";
import prisma from "../../src/database";
import { EndGameService } from "../../src/trpc/services/end-game.service";

// Note: GameTimeService sera utilisé tel quel (pas de mock nécessaire pour E2E)

describe("E2E — Scénario utilisateur complet", () => {
  const { factory } = createE2ESetup();
  let gameSetup: Awaited<ReturnType<typeof createGameE2ESetup>>;
  let endGameService: EndGameService;

  beforeAll(async () => {
    // Créer setup complet de jeu
    gameSetup = await createGameE2ESetup(factory, {
      startBalance: 10000,
      assetRate: 5.0, // 5% par an
    });

    // Initialiser services
    endGameService = new EndGameService(prisma);
  });

  afterAll(async () => {
    await factory.cleanup();
    await cleanupE2EServer();
  });

  describe("1. Inscription et authentification", () => {
    it("utilisateur peut s'inscrire et se connecter", async () => {
      expect(gameSetup.user).toBeDefined();
      expect(gameSetup.user.email).toContain("@test.com");
      expect(gameSetup.token).toBeDefined();
      expect(gameSetup.token.length).toBeGreaterThan(0);
    });

    it("utilisateur peut récupérer son profil via API", async () => {
      const profile = await gameSetup.client.user.getById.query(gameSetup.user.id);
      expect(profile.id).toBe(gameSetup.user.id);
      expect(profile.email).toBe(gameSetup.user.email);
    });
  });

  describe("2. Création de partie", () => {
    it("gameInstance créée par le setup", async () => {
      // La gameInstance est déjà créée par createGameE2ESetup dans beforeAll
      expect(gameSetup.gameInstance.id).toBeDefined();
      expect(gameSetup.gameInstance.userId).toBe(gameSetup.user.id);
      expect(gameSetup.gameInstance.levelId).toBe(gameSetup.level.id);
      expect(Number(gameSetup.gameInstance.startBalance)).toBe(10000);
    });

    it("wallet créé automatiquement avec balance initiale", async () => {
      // Le wallet est créé automatiquement par createGameE2ESetup
      expect(gameSetup.wallet).toBeDefined();
      expect(Number(gameSetup.wallet.amount)).toBe(10000);
    });
  });

  describe("3. Investissement — Achat d'asset", () => {
    it("peut acheter un asset via API", async () => {
      const buyResult = await gameSetup.client.investment.buy.mutate({
        walletId: gameSetup.wallet.id,
        assetId: gameSetup.asset.id,
        amount: 2000,
        gameInstanceId: gameSetup.gameInstance.id,
      });

      expect(buyResult).toBeDefined();
      // Vérifier que le holding a été créé en DB
      const holding = await prisma.holding.findFirst({
        where: {
          walletId: gameSetup.wallet.id,
          assetId: gameSetup.asset.id,
        },
      });
      expect(holding).toBeDefined();
      expect(Number(holding!.quantity)).toBe(2000);
    });

    it("wallet débité après achat", async () => {
      const updatedWallet = await prisma.wallet.findUnique({
        where: { id: gameSetup.wallet.id },
      });

      expect(Number(updatedWallet!.amount)).toBe(8000); // 10000 - 2000
    });

    it("holding créé avec quantité correcte", async () => {
      const holding = await prisma.holding.findFirst({
        where: {
          walletId: gameSetup.wallet.id,
          assetId: gameSetup.asset.id,
        },
      });

      expect(holding).toBeDefined();
      expect(Number(holding!.quantity)).toBe(2000);
    });

    it("transaction enregistrée", async () => {
      const transaction = await prisma.transaction.findFirst({
        where: {
          walletId: gameSetup.wallet.id,
          type: "BUY",
        },
      });

      expect(transaction).toBeDefined();
      expect(transaction!.quantity).toBeDefined();
      expect(Number(transaction!.quantity)).toBe(2000);
    });
  });

  describe("4. Investissement — Vente d'asset", () => {
    it("peut vendre un asset via API", async () => {
      const sellResult = await gameSetup.client.investment.sell.mutate({
        walletId: gameSetup.wallet.id,
        assetId: gameSetup.asset.id,
        amount: 1000, // Vendre la moitié
        gameInstanceId: gameSetup.gameInstance.id,
      });

      expect(sellResult.holding).toBeDefined();
      if (sellResult.holding) {
        expect(Number(sellResult.holding.quantity)).toBe(1000); // Reste 1000
      }
    });

    it("wallet crédité après vente", async () => {
      const updatedWallet = await prisma.wallet.findUnique({
        where: { id: gameSetup.wallet.id },
      });

      expect(Number(updatedWallet!.amount)).toBeGreaterThan(8000); // 8000 + 1000
    });

    it("holding mis à jour avec quantité restante", async () => {
      const holding = await prisma.holding.findFirst({
        where: {
          walletId: gameSetup.wallet.id,
          assetId: gameSetup.asset.id,
        },
      });

      expect(holding).toBeDefined();
      expect(Number(holding!.quantity)).toBe(1000);
    });
  });

  describe("5. Portfolio — Calcul de valeur", () => {
    it("peut récupérer le portfolio via API", async () => {
      // Créer un nouveau setup pour ce test (avec holdings)
      const newSetup = await createGameE2ESetup(factory, {
        startBalance: 10000,
        assetRate: 5.0,
      });

      // Acheter un asset pour avoir des holdings
      await newSetup.client.investment.buy.mutate({
        walletId: newSetup.wallet.id,
        assetId: newSetup.asset.id,
        amount: 2000,
        gameInstanceId: newSetup.gameInstance.id,
      });

      const portfolio = await newSetup.client.investment.getPortfolio.query({
        walletId: newSetup.wallet.id,
        gameInstanceId: newSetup.gameInstance.id,
      });

      expect(portfolio.walletBalance).toBeDefined();
      expect(portfolio.items).toBeDefined();
      expect(portfolio.totalValue).toBeDefined();
      expect(portfolio.totalValue).toBeGreaterThan(0);
    });

    it("portfolio inclut wallet + holdings", async () => {
      // Créer un nouveau setup pour ce test (avec holdings)
      const newSetup = await createGameE2ESetup(factory, {
        startBalance: 10000,
        assetRate: 5.0,
      });

      // Acheter un asset pour avoir des holdings
      await newSetup.client.investment.buy.mutate({
        walletId: newSetup.wallet.id,
        assetId: newSetup.asset.id,
        amount: 2000,
        gameInstanceId: newSetup.gameInstance.id,
      });

      const portfolio = await newSetup.client.investment.getPortfolio.query({
        walletId: newSetup.wallet.id,
        gameInstanceId: newSetup.gameInstance.id,
      });

      const totalAssets = portfolio.items.reduce(
        (sum, h) => sum + Number(h.totalValue),
        0
      );

      // Vérifier que le portfolio est cohérent
      // netWorth = walletBalance + totalValue (des holdings)
      // totalValue (du portfolio) = somme des totalValue des items (holdings seulement)
      expect(portfolio.items.length).toBeGreaterThan(0); // On a acheté un asset
      expect(Number(portfolio.netWorth)).toBeCloseTo(
        Number(portfolio.walletBalance) + totalAssets,
        1
      ); // Tolérance de 1 pour les arrondis
    });
  });

  describe("6. Fin de partie — Validation objectifs", () => {
    it("peut terminer une partie avec objectifs", async () => {
      // Créer un objectif pour ce niveau
      const goal = await factory.createGoal({
        goalType: "wallet_min",
        goalValue: 5000, // Objectif : avoir au moins 5000
      });

      await factory.createLevelGoal({
        levelId: gameSetup.level.id,
        goalId: goal.id,
      });

      // Terminer la partie
      const endResult = await endGameService.endGame(gameSetup.gameInstance.id);

      expect(endResult.success).toBeDefined();
      expect(endResult.walletBalance).toBeDefined();
      expect(endResult.assetsValue).toBeDefined();
      expect(endResult.totalValue).toBeDefined();
    });

    it("partie marquée comme terminée", async () => {
      const endedGame = await prisma.gameInstance.findUnique({
        where: { id: gameSetup.gameInstance.id },
      });

      expect(endedGame!.isEnded).toBeTrue();
      expect(endedGame!.endedAt).toBeDefined();
    });

    it("intérêts calculés pour holdings", async () => {
      // Note: Les intérêts nécessitent du temps écoulé
      // Pour un test E2E complet, on vérifie juste que le calcul fonctionne
      // Les détails des intérêts sont testés dans les tests d'intégration
      const endResult = await endGameService.endGame(gameSetup.gameInstance.id);

      // Vérifier que assetsValue est calculé (peut être égal à 1000 si pas de temps écoulé)
      expect(endResult.assetsValue).toBeGreaterThanOrEqual(1000);
    });
  });

  describe("7. Workflow complet — De l'inscription à la fin", () => {
    it("scénario complet : inscription → partie → investissement → fin", async () => {
      // 1. Créer nouveau setup
      const newSetup = await createGameE2ESetup(factory, {
        startBalance: 15000,
        assetRate: 3.0,
      });

      // 2. Créer objectif
      const goal = await factory.createGoal({
        goalType: "wallet_gte_start",
        goalValue: 15000,
      });
      await factory.createLevelGoal({
        levelId: newSetup.level.id,
        goalId: goal.id,
      });

      // 3. Acheter asset
      await newSetup.client.investment.buy.mutate({
        walletId: newSetup.wallet.id,
        assetId: newSetup.asset.id,
        amount: 5000,
        gameInstanceId: newSetup.gameInstance.id,
      });

      // 4. Vérifier portfolio
      const portfolio = await newSetup.client.investment.getPortfolio.query({
        walletId: newSetup.wallet.id,
        gameInstanceId: newSetup.gameInstance.id,
      });
      // netWorth = wallet (15000 - 5000 = 10000) + holdings (5000) = 15000 minimum
      expect(Number(portfolio.netWorth)).toBeGreaterThanOrEqual(15000);

      // 5. Terminer partie
      const endResult = await endGameService.endGame(newSetup.gameInstance.id);
      expect(endResult.success).toBeDefined();

      // 6. Vérifier partie terminée
      const endedGame = await prisma.gameInstance.findUnique({
        where: { id: newSetup.gameInstance.id },
      });
      expect(endedGame!.isEnded).toBeTrue();
    });
  });
});
