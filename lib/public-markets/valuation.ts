export type HoldingValueInput = {
  quantity: number;
  costBasis?: number | null;
  marketPrice?: number | null;
  marketValue?: number | null;
  unrealisedPnl?: number | null;
};

export type NormalizedHoldingValues = {
  marketPrice: number | null;
  marketValue: number | null;
  costBasis: number | null;
  unrealisedPnl: number | null;
};

function finiteOrNull(value: number | null | undefined): number | null {
  if (value == null || Number.isNaN(value)) return null;
  return value;
}

function relativeError(actual: number, expected: number): number {
  const denominator = Math.max(Math.abs(expected), 1);
  return Math.abs(actual - expected) / denominator;
}

/**
 * Broker reports often provide average cost per share while the UI stores total
 * cost basis. Infer the intended interpretation and always return total cost.
 */
export function normalizeCostBasisToTotal(
  quantity: number,
  costBasis: number,
  marketPrice: number | null,
  marketValue: number | null,
  brokerUnrealisedPnl: number | null,
): number {
  if (quantity <= 1) return costBasis;

  const totalIfPerShare = costBasis * quantity;

  if (brokerUnrealisedPnl != null && marketValue != null) {
    const impliedTotalCost = marketValue - brokerUnrealisedPnl;
    if (impliedTotalCost >= 0) {
      const errAsTotal = relativeError(costBasis, impliedTotalCost);
      const errAsPerShare = relativeError(totalIfPerShare, impliedTotalCost);
      const tolerance = 0.05;

      if (errAsPerShare <= tolerance && errAsPerShare < errAsTotal) {
        return totalIfPerShare;
      }
      if (errAsTotal <= tolerance) {
        return costBasis;
      }
      return impliedTotalCost;
    }
  }

  if (marketPrice != null && marketPrice > 0) {
    const distanceToUnitPrice = relativeError(costBasis, marketPrice);
    const errAsTotal = marketValue != null ? relativeError(costBasis, marketValue) : Infinity;
    const errAsPerShare = marketValue != null ? relativeError(totalIfPerShare, marketValue) : Infinity;

    if (distanceToUnitPrice < 0.75 && errAsPerShare < errAsTotal) {
      return totalIfPerShare;
    }
    if (errAsTotal <= errAsPerShare) {
      return costBasis;
    }
    return totalIfPerShare;
  }

  return costBasis;
}

export function normalizeHoldingValues(input: HoldingValueInput): NormalizedHoldingValues {
  const quantity = input.quantity > 0 ? input.quantity : 0;
  const rawCostBasis = finiteOrNull(input.costBasis);
  const brokerUnrealisedPnl = finiteOrNull(input.unrealisedPnl);
  let marketPrice = finiteOrNull(input.marketPrice);
  let marketValue = finiteOrNull(input.marketValue);

  if (marketValue == null && marketPrice != null && quantity > 0) {
    marketValue = marketPrice * quantity;
  }

  if (marketPrice == null && marketValue != null && quantity > 0) {
    marketPrice = marketValue / quantity;
  }

  const costBasis =
    rawCostBasis != null
      ? normalizeCostBasisToTotal(
          quantity,
          rawCostBasis,
          marketPrice,
          marketValue,
          brokerUnrealisedPnl,
        )
      : null;

  let unrealisedPnl: number | null = null;
  if (marketValue != null && costBasis != null) {
    unrealisedPnl = marketValue - costBasis;
  } else if (marketPrice != null && costBasis != null && quantity > 0) {
    unrealisedPnl = marketPrice * quantity - costBasis;
  } else if (brokerUnrealisedPnl != null) {
    unrealisedPnl = brokerUnrealisedPnl;
  }

  return {
    marketPrice,
    marketValue,
    costBasis,
    unrealisedPnl,
  };
}

export function toDecimalString(
  value: number | null | undefined,
  fractionDigits: number,
): string | undefined {
  if (value == null || Number.isNaN(value)) return undefined;
  return value.toFixed(fractionDigits);
}

export function normalizeAndFormatHoldingValues(input: HoldingValueInput) {
  const normalized = normalizeHoldingValues(input);
  return {
    normalized,
    decimals: {
      marketPrice: toDecimalString(normalized.marketPrice, 4),
      marketValue: toDecimalString(normalized.marketValue, 2),
      costBasis: toDecimalString(normalized.costBasis, 2),
      unrealisedPnl: toDecimalString(normalized.unrealisedPnl, 2),
    },
  };
}
