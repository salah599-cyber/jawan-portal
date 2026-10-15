/**
 * Pure helpers for portfolio / holding return calculations.
 * Kept free of DB access so edge cases can be unit-tested directly.
 */

/** Returns above this ratio (current/baseline) are treated as likely bad baselines. */
export const ABSURD_RETURN_RATIO = 11; // > +1,000%

export type ReturnResult = {
  returnOmr: number;
  returnPct: number;
};

export function computeReturn(
  currentTotal: number,
  baselineTotal: number,
): ReturnResult | null {
  if (!(baselineTotal > 0) || !Number.isFinite(baselineTotal) || !Number.isFinite(currentTotal)) {
    return null;
  }
  const returnOmr = currentTotal - baselineTotal;
  return {
    returnOmr,
    returnPct: (returnOmr / baselineTotal) * 100,
  };
}

/**
 * Broker/manual imports sometimes store average cost per share in `costBasis`
 * while the app expects total invested. When treating the raw value as total
 * would imply an absurd return *and* the raw value looks like a unit price
 * (near current market price), prefer quantity × cost as total.
 */
export function resolveTotalCostBasis(input: {
  quantity: number;
  costBasis: number | null | undefined;
  marketValue: number | null | undefined;
}): number | null {
  const quantity = input.quantity;
  const costBasis = input.costBasis;
  const marketValue = input.marketValue;

  if (costBasis == null || !Number.isFinite(costBasis) || costBasis <= 0) return null;
  if (quantity <= 1 || !Number.isFinite(quantity)) return costBasis;

  const asTotal = costBasis;
  const asPerShareTotal = costBasis * quantity;
  if (!Number.isFinite(asPerShareTotal) || asPerShareTotal <= 0) return asTotal;

  if (marketValue == null || !Number.isFinite(marketValue) || marketValue <= 0) {
    return asTotal;
  }

  const ratioAsTotal = marketValue / asTotal;
  if (ratioAsTotal <= ABSURD_RETURN_RATIO) return asTotal;

  const marketPriceApprox = marketValue / quantity;
  if (!(marketPriceApprox > 0)) return asTotal;

  // Per-share costs sit near the unit price; true totals are usually far above it.
  const looksLikePerShare = costBasis <= marketPriceApprox * 2;
  const ratioAsPerShare = marketValue / asPerShareTotal;

  if (looksLikePerShare && ratioAsPerShare <= ABSURD_RETURN_RATIO) {
    return asPerShareTotal;
  }

  return asTotal;
}

/** Per-holding unrealized return versus total cost basis. */
export function holdingReturnPct(input: {
  quantity: number;
  costBasis: number | null | undefined;
  marketValue: number | null | undefined;
}): number | null {
  const marketValue = input.marketValue;
  if (marketValue == null || !Number.isFinite(marketValue) || marketValue <= 0) return null;

  const totalCost = resolveTotalCostBasis(input);
  if (totalCost == null || totalCost <= 0) return null;

  return ((marketValue - totalCost) / totalCost) * 100;
}

export type BaselineCandidates = {
  beforePeriod: number | null;
  firstInPeriod: number | null;
  costBasis: number | null;
  currentValue?: number | null;
};

/**
 * Choose a period baseline that prefers true pre-period marks, then a reliable
 * in-period opening mark, then cost. Tiny stale snapshots that imply absurd
 * returns are discarded in favour of cost basis when available.
 */
export function selectReliableBaseline(candidates: BaselineCandidates): number | null {
  const before =
    candidates.beforePeriod != null && candidates.beforePeriod > 0
      ? candidates.beforePeriod
      : null;
  const firstInPeriod =
    candidates.firstInPeriod != null && candidates.firstInPeriod > 0
      ? candidates.firstInPeriod
      : null;
  const cost =
    candidates.costBasis != null && candidates.costBasis > 0 ? candidates.costBasis : null;
  const current =
    candidates.currentValue != null && candidates.currentValue > 0
      ? candidates.currentValue
      : null;

  const isReliable = (baseline: number): boolean => {
    if (current && current / baseline > ABSURD_RETURN_RATIO) return false;
    // Snapshot far below known cost basis is almost certainly a bad/partial mark.
    if (cost && cost / baseline > ABSURD_RETURN_RATIO) return false;
    return true;
  };

  if (before != null && isReliable(before)) return before;
  if (before != null && cost != null && isReliable(cost)) return cost;

  if (firstInPeriod != null && isReliable(firstInPeriod)) return firstInPeriod;
  if (firstInPeriod != null && cost != null && isReliable(cost)) return cost;
  if (firstInPeriod != null && cost != null && cost > firstInPeriod) return cost;

  if (cost != null && isReliable(cost)) return cost;
  if (before != null) return before;
  if (firstInPeriod != null) return firstInPeriod;
  return cost;
}

export type PerformerLike = {
  name: string;
  href: string;
  returnPct: number;
};

/**
 * Pick best/worst by return. Identity is name+href so two MSX holdings that
 * share the same portfolio href still count as distinct movers.
 */
export function pickBestWorstPerformers<T extends PerformerLike>(
  performers: T[],
): { best: T | null; worst: T | null } {
  if (performers.length === 0) return { best: null, worst: null };

  const sorted = [...performers].sort((a, b) => b.returnPct - a.returnPct);
  const best = sorted[0] ?? null;
  const worst = sorted.length > 1 ? sorted[sorted.length - 1]! : null;

  if (!best || !worst) return { best, worst: null };

  const sameIdentity = best.name === worst.name && best.href === worst.href;
  if (sameIdentity) return { best, worst: null };

  return { best, worst };
}
