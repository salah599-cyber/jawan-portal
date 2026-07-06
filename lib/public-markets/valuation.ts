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

export type NormalizeHoldingOptions = {
  /** When true, cost basis is already total invested amount (DB storage / manual entry). */
  costBasisIsTotal?: boolean;
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
 * Broker reports often provide average cost per share while the app stores total
 * cost basis. Use broker P&L to infer the correct interpretation on import.
 * Without broker P&L, treat the value as total cost (manual entry convention).
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

  // Without broker P&L there is no reliable way to distinguish per-share vs total
  // when both can fit market value (e.g. qty=2, cost field=100, value=200).
  // Default to total — matches manual entry and stored DB values.
  return costBasis;
}

export function normalizeHoldingValues(
  input: HoldingValueInput,
  options: NormalizeHoldingOptions = {},
): NormalizedHoldingValues {
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
      ? options.costBasisIsTotal
        ? rawCostBasis
        : normalizeCostBasisToTotal(
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
  } else if (brokerUnrealisedPnl != null && !options.costBasisIsTotal) {
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

export function normalizeAndFormatHoldingValues(
  input: HoldingValueInput,
  options: NormalizeHoldingOptions = {},
) {
  const normalized = normalizeHoldingValues(input, options);
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

export function normalizeOptionHoldingValues(input: {
  contracts: number;
  marketPrice?: number | null;
  marketValue?: number | null;
  premiumPaid?: number | null;
  contractMultiplier?: number;
}) {
  const multiplier = input.contractMultiplier && input.contractMultiplier > 0 ? input.contractMultiplier : 100;
  const contracts = input.contracts > 0 ? input.contracts : 0;
  const marketPrice = finiteOrNull(input.marketPrice);
  let marketValue = finiteOrNull(input.marketValue);
  const costBasis = finiteOrNull(input.premiumPaid);

  if (marketValue == null && marketPrice != null && contracts > 0) {
    marketValue = marketPrice * contracts * multiplier;
  }

  let unrealisedPnl: number | null = null;
  if (marketValue != null && costBasis != null) {
    unrealisedPnl = marketValue - costBasis;
  }

  return { marketPrice, marketValue, costBasis, unrealisedPnl, contractMultiplier: multiplier };
}

export function buildOptionSymbol(
  underlyingSymbol: string,
  optionType: "CALL" | "PUT",
  strikePrice: number,
  expiryDate: string,
) {
  const expiry = expiryDate.replace(/-/g, "").slice(0, 8);
  const type = optionType === "CALL" ? "C" : "P";
  return `${underlyingSymbol.toUpperCase()}-${type}${strikePrice}-${expiry}`;
}

export function buildStructuredNoteSymbol(productName: string) {
  const slug = productName
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24);
  return `SN-${slug || "NOTE"}`;
}
