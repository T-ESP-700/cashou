// Shared interest / impact helpers used by both the end-game and investment
// services (which historically duplicated the rate-based interest logic).
//
// Two concerns live here:
//  1. impactCoefForAsset — resolve which event impacts touch a given asset,
//     supporting both asset-specific (assetId) and sector-wide (fieldId +
//     submarketId) impacts. Used by the price engine (value multiplier) and by
//     the rate engine below (rate multiplier).
//  2. rateBasedInterest — deterministic simple interest for capital-guaranteed
//     assets (livrets, fonds euros), integrated piecewise across rate-changing
//     events and net of an annual management fee. Floored at 0 so the principal
//     can never decrease.

export interface AssetImpactTarget {
  id: number;
  fieldId: number | null;
  submarketId: number | null;
}

export interface ImpactLike {
  assetId: number | null;
  fieldId: number | null;
  submarketId: number | null;
  coef: number | null;
}

/**
 * Product of every impact coef that applies to `asset`, or `null` if none do.
 * An impact applies when it targets the asset directly (`assetId`) or the
 * asset's `fieldId` + `submarketId` couple (sector-wide impact).
 */
export function impactCoefForAsset(
  impacts: ImpactLike[],
  asset: AssetImpactTarget,
): number | null {
  let coef = 1;
  let matched = false;
  for (const imp of impacts) {
    if (imp.coef == null) continue;
    const isAssetTarget = imp.assetId === asset.id;
    const isSectorTarget =
      imp.assetId == null &&
      imp.fieldId != null &&
      imp.submarketId != null &&
      imp.fieldId === asset.fieldId &&
      imp.submarketId === asset.submarketId;
    if (isAssetTarget || isSectorTarget) {
      coef *= imp.coef;
      matched = true;
    }
  }
  return matched ? coef : null;
}

export interface RateChange {
  /** Absolute game-day (from game start) at which the rate change takes effect. */
  triggerGameDay: number;
  /** Multiplier applied to the annual rate from `triggerGameDay` onward. */
  coef: number;
}

/**
 * Deterministic simple interest for a capital-guaranteed asset.
 *
 * The annual rate is multiplied by the cumulative coef of every rate-changing
 * event already triggered, integrated piecewise over [fromGameDay, toGameDay],
 * then reduced by a flat annual management fee. The result is floored at 0 so a
 * guaranteed product can never lose principal, even if fees exceed the rate.
 */
export function rateBasedInterest(params: {
  quantity: number;
  annualRatePct: number;
  managementFeePct?: number;
  fromGameDay: number;
  toGameDay: number;
  rateChanges?: RateChange[];
}): number {
  const fee = params.managementFeePct ?? 0;
  const from = Math.max(0, params.fromGameDay);
  const to = Math.max(from, params.toGameDay);
  if (params.quantity <= 0 || to <= from) return 0;

  const changes = (params.rateChanges ?? [])
    .filter((c) => c.coef != null)
    .sort((a, b) => a.triggerGameDay - b.triggerGameDay);

  let interest = 0;
  let segStart = from;
  let coef = 1;
  // Fold in every change already in effect at `from`.
  for (const c of changes) {
    if (c.triggerGameDay <= from) coef *= c.coef;
  }
  // Integrate each segment between change points that fall inside the window.
  for (const c of changes) {
    if (c.triggerGameDay <= from || c.triggerGameDay >= to) continue;
    const dailyNet = (params.annualRatePct * coef - fee) / 100 / 365;
    interest += params.quantity * dailyNet * (c.triggerGameDay - segStart);
    segStart = c.triggerGameDay;
    coef *= c.coef;
  }
  // Final segment up to `to`.
  const dailyNet = (params.annualRatePct * coef - fee) / 100 / 365;
  interest += params.quantity * dailyNet * (to - segStart);

  return Math.max(0, Math.round(interest));
}
