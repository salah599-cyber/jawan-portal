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

export function normalizeHoldingValues(input: HoldingValueInput): NormalizedHoldingValues {
  const quantity = input.quantity > 0 ? input.quantity : 0;
  const costBasis = finiteOrNull(input.costBasis);
  let marketPrice = finiteOrNull(input.marketPrice);
  let marketValue = finiteOrNull(input.marketValue);

  if (marketValue == null && marketPrice != null && quantity > 0) {
    marketValue = marketPrice * quantity;
  }

  if (marketPrice == null && marketValue != null && quantity > 0) {
    marketPrice = marketValue / quantity;
  }

  let unrealisedPnl = finiteOrNull(input.unrealisedPnl);
  if (unrealisedPnl == null && marketValue != null && costBasis != null) {
    unrealisedPnl = marketValue - costBasis;
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
