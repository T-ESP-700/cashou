// tests/service/end-game.unit.test.ts
// Unit tests for EndGameService goal validation logic (no DB required)
import { describe, it, expect } from "bun:test";

// ── Re-implement validateGoal from EndGameService for isolated testing ────
// This mirrors the private method in end-game.service.ts

type HoldingWithAsset = {
  quantity: { toString: () => string } | null;
  asset: {
    id: number;
    submarketId: number | null;
  };
};

type TransactionWithAsset = {
  type: string;
  assetId: number;
  asset?: {
    submarketId: number | null;
  };
  quantity?: number | null;
};

function validateGoal(
  goalType: string | null,
  goalValue: number | null,
  finalBalance: number,
  startBalance: number,
  holdings: HoldingWithAsset[],
  transactions: TransactionWithAsset[] = [],
): boolean {
  if (!goalType) return true;

  const value = goalValue || 0;

  switch (goalType) {
    case "wallet_gte_start":
      return finalBalance >= startBalance + value;

    case "wallet_gt_start":
      return finalBalance > startBalance + value;

    case "wallet_min":
      return finalBalance >= value;

    case "profit_min": {
      const profit = ((finalBalance - startBalance) / startBalance) * 100;
      return profit >= value;
    }

    case "min_submarkets_invested": {
      const submarketIdsFromTx = new Set(
        transactions
          .filter((t) => t.type === "BUY" && t.asset?.submarketId)
          .map((t) => t.asset!.submarketId),
      );
      const submarketIdsFromHoldings = new Set(
        holdings
          .filter((h) => Number(h.quantity) > 0)
          .map((h) => h.asset.submarketId)
          .filter(Boolean),
      );
      const distinctSubmarkets = new Set([...submarketIdsFromTx, ...submarketIdsFromHoldings]);
      return distinctSubmarkets.size >= value;
    }

    default:
      return true;
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe("EndGameService - Goal Validation", () => {
  const makeHolding = (assetId: number, submarketId: number | null, quantity: number): HoldingWithAsset => ({
    quantity: { toString: () => String(quantity) },
    asset: { id: assetId, submarketId },
  });

  const makeTx = (type: string, assetId: number, submarketId: number | null): TransactionWithAsset => ({
    type,
    assetId,
    asset: { submarketId },
  });

  describe("wallet_gte_start", () => {
    it("should validate when finalBalance >= startBalance", () => {
      expect(validateGoal("wallet_gte_start", 0, 10000, 10000, [])).toBe(true);
    });

    it("should validate when finalBalance > startBalance + value", () => {
      expect(validateGoal("wallet_gte_start", 500, 10600, 10000, [])).toBe(true);
    });

    it("should fail when finalBalance < startBalance", () => {
      expect(validateGoal("wallet_gte_start", 0, 9999, 10000, [])).toBe(false);
    });

    it("should fail when finalBalance < startBalance + value", () => {
      expect(validateGoal("wallet_gte_start", 500, 10400, 10000, [])).toBe(false);
    });
  });

  describe("wallet_gt_start", () => {
    it("should fail when finalBalance equals startBalance (strict >)", () => {
      expect(validateGoal("wallet_gt_start", 0, 10000, 10000, [])).toBe(false);
    });

    it("should validate when finalBalance > startBalance", () => {
      expect(validateGoal("wallet_gt_start", 0, 10001, 10000, [])).toBe(true);
    });
  });

  describe("wallet_min", () => {
    it("should validate when finalBalance >= value", () => {
      expect(validateGoal("wallet_min", 5000, 5000, 10000, [])).toBe(true);
    });

    it("should fail when finalBalance < value", () => {
      expect(validateGoal("wallet_min", 5000, 4999, 10000, [])).toBe(false);
    });
  });

  describe("profit_min", () => {
    it("should validate when profit percentage >= value", () => {
      // Start: 10000, End: 11000 → 10% profit
      expect(validateGoal("profit_min", 10, 11000, 10000, [])).toBe(true);
    });

    it("should fail when profit percentage < value", () => {
      // Start: 10000, End: 10500 → 5% profit, need 10%
      expect(validateGoal("profit_min", 10, 10500, 10000, [])).toBe(false);
    });

    it("should handle negative profit", () => {
      expect(validateGoal("profit_min", 0, 9000, 10000, [])).toBe(false);
    });

    it("should handle exactly matching profit", () => {
      // Start: 10000, End: 11000 → exactly 10%
      expect(validateGoal("profit_min", 10, 11000, 10000, [])).toBe(true);
    });
  });

  describe("min_submarkets_invested", () => {
    it("should count distinct submarkets from holdings", () => {
      const holdings = [
        makeHolding(1, 10, 100),
        makeHolding(2, 20, 200),
        makeHolding(3, 30, 300),
      ];
      expect(validateGoal("min_submarkets_invested", 3, 0, 0, holdings)).toBe(true);
    });

    it("should fail when not enough distinct submarkets", () => {
      const holdings = [
        makeHolding(1, 10, 100),
        makeHolding(2, 10, 200), // Same submarket
      ];
      expect(validateGoal("min_submarkets_invested", 2, 0, 0, holdings)).toBe(false);
    });

    it("should count submarkets from BUY transactions too", () => {
      const holdings: HoldingWithAsset[] = [];
      const transactions = [
        makeTx("BUY", 1, 10),
        makeTx("BUY", 2, 20),
        makeTx("BUY", 3, 30),
        makeTx("SELL", 4, 40), // SELL should not count
      ];
      expect(validateGoal("min_submarkets_invested", 3, 0, 0, holdings, transactions)).toBe(true);
      expect(validateGoal("min_submarkets_invested", 4, 0, 0, holdings, transactions)).toBe(false);
    });

    it("should union holdings and transactions for unique submarkets", () => {
      const holdings = [makeHolding(1, 10, 100)];
      const transactions = [
        makeTx("BUY", 2, 20),
        makeTx("BUY", 3, 10), // Same submarket as holding
      ];
      // Unique: 10 (from holding and tx), 20 (from tx) = 2
      expect(validateGoal("min_submarkets_invested", 2, 0, 0, holdings, transactions)).toBe(true);
      expect(validateGoal("min_submarkets_invested", 3, 0, 0, holdings, transactions)).toBe(false);
    });

    it("should ignore holdings with zero quantity", () => {
      const holdings = [
        makeHolding(1, 10, 0),  // Sold off
        makeHolding(2, 20, 100),
      ];
      // Only submarket 20 from holdings (10 is ignored due to qty=0)
      expect(validateGoal("min_submarkets_invested", 1, 0, 0, holdings)).toBe(true);
      expect(validateGoal("min_submarkets_invested", 2, 0, 0, holdings)).toBe(false);
    });

    it("should ignore holdings/transactions with null submarketId", () => {
      const holdings = [makeHolding(1, null, 100)];
      const transactions = [makeTx("BUY", 2, null)];
      expect(validateGoal("min_submarkets_invested", 1, 0, 0, holdings, transactions)).toBe(false);
    });
  });

  describe("null/unknown goal types", () => {
    it("should validate null goalType", () => {
      expect(validateGoal(null, null, 0, 0, [])).toBe(true);
    });

    it("should validate unknown goalType", () => {
      expect(validateGoal("some_future_goal_type", 100, 0, 0, [])).toBe(true);
    });
  });

  describe("null goalValue handling", () => {
    it("should treat null goalValue as 0", () => {
      // wallet_gte_start with null value → finalBalance >= startBalance + 0
      expect(validateGoal("wallet_gte_start", null, 10000, 10000, [])).toBe(true);
    });
  });
});
