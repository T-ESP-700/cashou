/**
 * Tests d'intégration pour InvestmentService
 * 
 * Ces tests vérifient le fonctionnement complet du service avec DB réelle :
 * - Achat d'assets avec transactions atomiques
 * - Vente d'assets avec mise à jour du wallet
 * - Calcul de portfolio avec intérêts
 * - Validations métier (plafonds, soldes, montants min/max)
 */

import { describe, it, expect, beforeEach, afterAll } from "bun:test";
import { prisma } from "@cashou/db-app";
import { Prisma } from "@cashou/db-app";
import { InvestmentService } from "../../src/trpc/services/investment.service";
import { IntegrationTestFactory } from "../helpers/integration-test-factory";
import { setupTestDatabase } from "../helpers/integration-test-setup";

describe("InvestmentService — Tests d'intégration", () => {
  setupTestDatabase();

  const factory = new IntegrationTestFactory(prisma);
  const investmentService = new InvestmentService(prisma);

  beforeEach(async () => {
    await factory.cleanup();
  });

  afterAll(async () => {
    await factory.cleanup();
  });

  describe("buy() — Achat d'assets", () => {
    it("achète un asset et met à jour wallet + holding + transaction", async () => {
      // Setup
      const { wallet, asset, gameInstance } = await factory.createInvestmentTestSetup({
        startBalance: 10000,
      });

      // Action : acheter 2000€ d'asset
      const result = await investmentService.buy({
        walletId: wallet.id,
        assetId: asset.id,
        amount: 2000,
        gameInstanceId: gameInstance.id,
      });

      // Vérifications
      expect(result).toHaveProperty("id");
      expect(result.quantity).toBeDefined();

      // 1. Wallet débité de 2000€
      const updatedWallet = await prisma.wallet.findUnique({
        where: { id: wallet.id },
      });
      expect(Number(updatedWallet?.amount)).toBe(8000);

      // 2. Holding créé avec quantity = 2000
      const holding = await prisma.holding.findFirst({
        where: {
          walletId: wallet.id,
          assetId: asset.id,
        },
      });
      expect(holding).toBeDefined();
      expect(Number(holding?.quantity)).toBe(2000);
      expect(holding?.acquiredAt).toBeInstanceOf(Date);

      // 3. Transaction enregistrée
      const transaction = await prisma.transaction.findFirst({
        where: {
          walletId: wallet.id,
          assetId: asset.id,
          type: "BUY",
        },
      });
      expect(transaction).toBeDefined();
      expect(transaction?.quantity).toBe(2000);
    });

    it("achète un asset en plusieurs fois (holding existant)", async () => {
      // Setup
      const { wallet, asset, gameInstance } = await factory.createInvestmentTestSetup({
        startBalance: 10000,
      });

      // Premier achat de 1000€
      await investmentService.buy({
        walletId: wallet.id,
        assetId: asset.id,
        amount: 1000,
        gameInstanceId: gameInstance.id,
      });

      // Deuxième achat de 1500€
      await investmentService.buy({
        walletId: wallet.id,
        assetId: asset.id,
        amount: 1500,
        gameInstanceId: gameInstance.id,
      });

      // Vérifications
      // 1. Wallet débité du total (1000 + 1500 = 2500)
      const updatedWallet = await prisma.wallet.findUnique({
        where: { id: wallet.id },
      });
      expect(Number(updatedWallet?.amount)).toBe(7500);

      // 2. Holding mis à jour avec quantity cumulée (1000 + 1500 = 2500)
      const holding = await prisma.holding.findFirst({
        where: {
          walletId: wallet.id,
          assetId: asset.id,
        },
      });
      expect(Number(holding?.quantity)).toBe(2500);

      // 3. Deux transactions enregistrées
      const transactions = await prisma.transaction.findMany({
        where: {
          walletId: wallet.id,
          assetId: asset.id,
          type: "BUY",
        },
      });
      expect(transactions).toHaveLength(2);
    });

    it("rejette si solde insuffisant (rollback transaction)", async () => {
      // Setup : wallet avec seulement 500€
      const { wallet, asset, gameInstance } = await factory.createInvestmentTestSetup({
        startBalance: 500,
      });

      // Action : tenter d'acheter 1000€ (plus que le solde)
      await expect(
        investmentService.buy({
          walletId: wallet.id,
          assetId: asset.id,
          amount: 1000,
          gameInstanceId: gameInstance.id,
        })
      ).rejects.toThrow("Solde insuffisant");

      // Vérifications : rien n'a changé (rollback complet)
      // 1. Wallet inchangé
      const unchangedWallet = await prisma.wallet.findUnique({
        where: { id: wallet.id },
      });
      expect(Number(unchangedWallet?.amount)).toBe(500);

      // 2. Aucun holding créé
      const holdings = await prisma.holding.findMany({
        where: { walletId: wallet.id },
      });
      expect(holdings).toHaveLength(0);

      // 3. Aucune transaction enregistrée
      const transactions = await prisma.transaction.findMany({
        where: { walletId: wallet.id },
      });
      expect(transactions).toHaveLength(0);
    });

    it("rejette si montant inférieur au minimum requis", async () => {
      // Setup : asset avec minAmount = 500€
      const { wallet, asset, gameInstance } = await factory.createInvestmentTestSetup({
        startBalance: 10000,
        assetMinAmount: 500,
      });

      // Action : tenter d'acheter 200€ (moins que le minimum)
      await expect(
        investmentService.buy({
          walletId: wallet.id,
          assetId: asset.id,
          amount: 200,
          gameInstanceId: gameInstance.id,
        })
      ).rejects.toThrow("Montant minimum requis");

      // Vérifier que rien n'a changé
      const holdings = await prisma.holding.findMany({
        where: { walletId: wallet.id },
      });
      expect(holdings).toHaveLength(0);
    });

    it("respecte le plafond maxAmount de l'asset", async () => {
      // Setup : asset avec maxAmount = 3000€
      const { wallet, asset, gameInstance } = await factory.createInvestmentTestSetup({
        startBalance: 10000,
        assetMaxAmount: 3000,
      });

      // Premier achat de 2000€
      await investmentService.buy({
        walletId: wallet.id,
        assetId: asset.id,
        amount: 2000,
        gameInstanceId: gameInstance.id,
      });

      // Deuxième achat de 1500€ → dépasse le plafond de 3000€
      await expect(
        investmentService.buy({
          walletId: wallet.id,
          assetId: asset.id,
          amount: 1500,
          gameInstanceId: gameInstance.id,
        })
      ).rejects.toThrow("Plafond dépassé");

      // Vérifier que le premier achat est toujours là mais pas le second
      const holding = await prisma.holding.findFirst({
        where: {
          walletId: wallet.id,
          assetId: asset.id,
        },
      });
      expect(Number(holding?.quantity)).toBe(2000); // Pas 3500

      const wallet2 = await prisma.wallet.findUnique({
        where: { id: wallet.id },
      });
      expect(Number(wallet2?.amount)).toBe(8000); // 10000 - 2000, pas 10000 - 3500
    });

    it("permet d'acheter exactement le plafond maxAmount", async () => {
      // Setup : asset avec maxAmount = 5000€
      const { wallet, asset, gameInstance } = await factory.createInvestmentTestSetup({
        startBalance: 10000,
        assetMaxAmount: 5000,
      });

      // Acheter exactement le plafond
      const result = await investmentService.buy({
        walletId: wallet.id,
        assetId: asset.id,
        amount: 5000,
        gameInstanceId: gameInstance.id,
      });

      expect(result).toHaveProperty("id");

      const holding = await prisma.holding.findFirst({
        where: {
          walletId: wallet.id,
          assetId: asset.id,
        },
      });
      expect(Number(holding?.quantity)).toBe(5000);
    });

    it("rejette si wallet introuvable", async () => {
      const { asset, gameInstance } = await factory.createInvestmentTestSetup({});

      await expect(
        investmentService.buy({
          walletId: 999999,
          assetId: asset.id,
          amount: 1000,
          gameInstanceId: gameInstance.id,
        })
      ).rejects.toThrow("Portefeuille introuvable");
    });

    it("rejette si asset introuvable", async () => {
      const { wallet, gameInstance } = await factory.createInvestmentTestSetup({});

      await expect(
        investmentService.buy({
          walletId: wallet.id,
          assetId: 999999,
          amount: 1000,
          gameInstanceId: gameInstance.id,
        })
      ).rejects.toThrow("Asset introuvable");
    });
  });

  describe("sell() — Vente d'assets", () => {
    it("vend un asset et met à jour wallet + holding + transaction", async () => {
      // Setup : créer un holding existant de 5000€
      const { wallet, asset, gameInstance } = await factory.createInvestmentTestSetup({
        startBalance: 10000,
      });

      await factory.createHolding({
        walletId: wallet.id,
        assetId: asset.id,
        gameInstanceId: gameInstance.id,
        quantity: new Prisma.Decimal(5000),
      });

      // Débiter le wallet pour simuler l'achat initial
      await prisma.wallet.update({
        where: { id: wallet.id },
        data: { amount: new Prisma.Decimal(5000) },
      });

      // Action : vendre 2000€ d'asset
      const result = await investmentService.sell({
        walletId: wallet.id,
        assetId: asset.id,
        amount: 2000,
        gameInstanceId: gameInstance.id,
      });

      // Vérifications
      expect(result).toHaveProperty("amountReceived");
      expect(result.amountReceived).toBeGreaterThanOrEqual(2000);

      // 1. Wallet crédité d'au moins 2000€ (peut inclure intérêts)
      const updatedWallet = await prisma.wallet.findUnique({
        where: { id: wallet.id },
      });
      expect(Number(updatedWallet?.amount)).toBeGreaterThanOrEqual(7000);

      // 2. Holding mis à jour (quantity réduite)
      const updatedHolding = await prisma.holding.findFirst({
        where: {
          walletId: wallet.id,
          assetId: asset.id,
        },
      });
      expect(Number(updatedHolding?.quantity)).toBe(3000); // 5000 - 2000

      // 3. Transaction enregistrée
      const transaction = await prisma.transaction.findFirst({
        where: {
          walletId: wallet.id,
          assetId: asset.id,
          type: "SELL",
        },
      });
      expect(transaction).toBeDefined();
      expect(transaction?.quantity).toBeGreaterThanOrEqual(2000);
    });

    it("vend tout l'asset (supprime le holding)", async () => {
      // Setup
      const { wallet, asset, gameInstance } = await factory.createInvestmentTestSetup({
        startBalance: 5000,
      });

      await factory.createHolding({
        walletId: wallet.id,
        assetId: asset.id,
        gameInstanceId: gameInstance.id,
        quantity: new Prisma.Decimal(3000),
      });

      // Action : vendre tout (3000€)
      await investmentService.sell({
        walletId: wallet.id,
        assetId: asset.id,
        amount: 3000,
        gameInstanceId: gameInstance.id,
      });

      // Vérifications
      // 1. Wallet crédité d'au moins 3000€
      const updatedWallet = await prisma.wallet.findUnique({
        where: { id: wallet.id },
      });
      expect(Number(updatedWallet?.amount)).toBeGreaterThanOrEqual(8000);

      // 2. Holding supprimé
      const deletedHolding = await prisma.holding.findFirst({
        where: {
          walletId: wallet.id,
          assetId: asset.id,
        },
      });
      expect(deletedHolding).toBeNull();

      // 3. Transaction enregistrée
      const transaction = await prisma.transaction.findFirst({
        where: {
          walletId: wallet.id,
          type: "SELL",
        },
      });
      expect(transaction).toBeDefined();
    });

    it("rejette si holding introuvable", async () => {
      const { wallet, gameInstance } = await factory.createInvestmentTestSetup({});
      
      await expect(
        investmentService.sell({
          walletId: wallet.id,
          assetId: 999999,
          amount: 1000,
          gameInstanceId: gameInstance.id,
        })
      ).rejects.toThrow("Aucun holding trouvé");
    });

    it("rejette si montant supérieur à la quantity", async () => {
      // Setup : holding de 2000€
      const { wallet, asset, gameInstance } = await factory.createInvestmentTestSetup({});

      await factory.createHolding({
        walletId: wallet.id,
        assetId: asset.id,
        gameInstanceId: gameInstance.id,
        quantity: new Prisma.Decimal(2000),
      });

      // Tenter de vendre 3000€
      await expect(
        investmentService.sell({
          walletId: wallet.id,
          assetId: asset.id,
          amount: 3000,
          gameInstanceId: gameInstance.id,
        })
      ).rejects.toThrow("Quantité insuffisante");
    });
  });

  describe("getPortfolio() — Calcul de portfolio", () => {
    it("calcule le portfolio avec un holding simple", async () => {
      // Setup
      const { wallet, asset, gameInstance } = await factory.createInvestmentTestSetup({
        startBalance: 5000,
      });

      await factory.createHolding({
        walletId: wallet.id,
        assetId: asset.id,
        gameInstanceId: gameInstance.id,
        quantity: new Prisma.Decimal(10000),
      });

      // Action
      const portfolio = await investmentService.getPortfolio(
        wallet.id,
        gameInstance.id
      );

      // Vérifications
      expect(portfolio.items).toHaveLength(1);
      expect(portfolio.items[0].holding).toHaveProperty("asset");
      expect(Number(portfolio.items[0].holding.quantity)).toBe(10000);
      
      expect(portfolio.totalInvested).toBe(10000);
      expect(portfolio.walletBalance).toBe(5000);
      expect(portfolio.netWorth).toBeGreaterThanOrEqual(15000); // Au moins le capital initial
    });

    it("calcule le portfolio avec plusieurs holdings", async () => {
      // Setup : créer 3 holdings différents
      const setup = await factory.createInvestmentTestSetup({
        startBalance: 5000,
      });

      // Asset 1 : 10000€
      await factory.createHolding({
        walletId: setup.wallet.id,
        assetId: setup.asset.id,
        gameInstanceId: setup.gameInstance.id,
        quantity: new Prisma.Decimal(10000),
      });

      // Asset 2 : 5000€
      const asset2 = await factory.createAsset({
        fieldId: setup.field.id,
        marketId: setup.market.id,
        submarketId: setup.submarket.id,
        rate: 1.5,
      });

      await factory.createHolding({
        walletId: setup.wallet.id,
        assetId: asset2.id,
        gameInstanceId: setup.gameInstance.id,
        quantity: new Prisma.Decimal(5000),
      });

      // Asset 3 : 3000€
      const asset3 = await factory.createAsset({
        fieldId: setup.field.id,
        marketId: setup.market.id,
        submarketId: setup.submarket.id,
        rate: 3.0,
      });

      await factory.createHolding({
        walletId: setup.wallet.id,
        assetId: asset3.id,
        gameInstanceId: setup.gameInstance.id,
        quantity: new Prisma.Decimal(3000),
      });

      // Action
      const portfolio = await investmentService.getPortfolio(
        setup.wallet.id,
        setup.gameInstance.id
      );

      // Vérifications
      expect(portfolio.items).toHaveLength(3);
      expect(portfolio.totalInvested).toBe(18000); // 10000 + 5000 + 3000
      expect(portfolio.walletBalance).toBe(5000);
      expect(portfolio.netWorth).toBeGreaterThanOrEqual(23000);
    });

    it("retourne portfolio vide si aucun holding", async () => {
      // Setup : wallet sans holdings
      const { wallet, gameInstance } = await factory.createInvestmentTestSetup({
        startBalance: 10000,
      });

      // Action
      const portfolio = await investmentService.getPortfolio(
        wallet.id,
        gameInstance.id
      );

      // Vérifications
      expect(portfolio.items).toHaveLength(0);
      expect(portfolio.totalInvested).toBe(0);
      expect(portfolio.totalInterests).toBe(0);
      expect(portfolio.totalValue).toBe(0);
      expect(portfolio.walletBalance).toBe(10000);
      expect(portfolio.netWorth).toBe(10000);
    });
  });
});
