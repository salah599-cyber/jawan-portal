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

/** Matches PublicEquityHolding @db.Decimal definitions in prisma/schema.prisma. */
export const HOLDING_DECIMAL = {
  quantity: { precision: 18, scale: 6 },
  marketPrice: { precision: 18, scale: 4 },
  marketValue: { precision: 18, scale: 2 },
  costBasis: { precision: 18, scale: 2 },
  unrealisedPnl: { precision: 18, scale: 2 },
} as const;

export type HoldingDecimalField = keyof typeof HOLDING_DECIMAL;

function finiteOrNull(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  return value;
}

function relativeError(actual: number, expected: number): number {
  const denominator = Math.max(Math.abs(expected), 1);
  return Math.abs(actual - expected) / denominator;
}

/**
 * Returns whether `value` fits PostgreSQL NUMERIC(precision, scale) after formatting.
 * Prevents Prisma "numeric field overflow" on PublicEquityHolding writes.
 */
export function fitsDecimal(
  value: number,
  precision: number,
  scale: number,
): boolean {
  if (!Number.isFinite(value)) return false;
  const formatted = value.toFixed(scale);
  if (!/^-?\d+(\.\d+)?$/.test(formatted)) return false;
  const [whole] = formatted.replace(/^-/, "").split(".");
  return whole.length <= precision - scale;
}

export function fitsHoldingDecimal(value: number, field: HoldingDecimalField): boolean {
  const { precision, scale } = HOLDING_DECIMAL[field];
  return fitsDecimal(value, precision, scale);
}

function clampToDecimalOrNull(
  value: number | null,
  field: Exclude<HoldingDecimalField, "quantity">,
): number | null {
  if (value == null) return null;
  return fitsHoldingDecimal(value, field) ? value : null;
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
  const perShareFits =
    Number.isFinite(totalIfPerShare) && fitsHoldingDecimal(totalIfPerShare, "costBasis");

  if (brokerUnrealisedPnl != null && marketValue != null) {
    const impliedTotalCost = marketValue - brokerUnrealisedPnl;
    if (impliedTotalCost >= 0 && fitsHoldingDecimal(impliedTotalCost, "costBasis")) {
      const errAsTotal = relativeError(costBasis, impliedTotalCost);
      const errAsPerShare = perShareFits
        ? relativeError(totalIfPerShare, impliedTotalCost)
        : Number.POSITIVE_INFINITY;
      const tolerance = 0.05;

      if (perShareFits && errAsPerShare <= tolerance && errAsPerShare < errAsTotal) {
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
    const computed = marketPrice * quantity;
    marketValue = Number.isFinite(computed) ? computed : null;
  }

  if (marketPrice == null && marketValue != null && quantity > 0) {
    const computed = marketValue / quantity;
    marketPrice = Number.isFinite(computed) ? computed : null;
  }

  marketPrice = clampToDecimalOrNull(marketPrice, "marketPrice");
  marketValue = clampToDecimalOrNull(marketValue, "marketValue");

  let costBasis =
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
  costBasis = clampToDecimalOrNull(costBasis, "costBasis");

  let unrealisedPnl: number | null = null;
  if (marketValue != null && costBasis != null) {
    unrealisedPnl = marketValue - costBasis;
  } else if (marketPrice != null && costBasis != null && quantity > 0) {
    unrealisedPnl = marketPrice * quantity - costBasis;
  } else if (brokerUnrealisedPnl != null && !options.costBasisIsTotal) {
    unrealisedPnl = brokerUnrealisedPnl;
  }
  unrealisedPnl = clampToDecimalOrNull(unrealisedPnl, "unrealisedPnl");

  return {
    marketPrice,
    marketValue,
    costBasis,
    unrealisedPnl,
  };
}

/**
 * Format a number for Prisma Decimal columns. Returns undefined when null/NaN
 * or when the formatted value would overflow NUMERIC(precision, scale).
 */
export function toDecimalString(
  value: number | null | undefined,
  fractionDigits: number,
  precision = 18,
): string | undefined {
  if (value == null || !Number.isFinite(value)) return undefined;
  if (!fitsDecimal(value, precision, fractionDigits)) return undefined;
  return value.toFixed(fractionDigits);
}

export type FormattedHoldingDecimals = {
  quantity: string | undefined;
  marketPrice: string | undefined;
  marketValue: string | undefined;
  costBasis: string | undefined;
  unrealisedPnl: string | undefined;
};

export function normalizeAndFormatHoldingValues(
  input: HoldingValueInput,
  options: NormalizeHoldingOptions = {},
) {
  const normalized = normalizeHoldingValues(input, options);
  const quantity = input.quantity > 0 ? input.quantity : 0;
  return {
    normalized,
    decimals: {
      quantity: toDecimalString(
        quantity,
        HOLDING_DECIMAL.quantity.scale,
        HOLDING_DECIMAL.quantity.precision,
      ),
      marketPrice: toDecimalString(
        normalized.marketPrice,
        HOLDING_DECIMAL.marketPrice.scale,
        HOLDING_DECIMAL.marketPrice.precision,
      ),
      marketValue: toDecimalString(
        normalized.marketValue,
        HOLDING_DECIMAL.marketValue.scale,
        HOLDING_DECIMAL.marketValue.precision,
      ),
      costBasis: toDecimalString(
        normalized.costBasis,
        HOLDING_DECIMAL.costBasis.scale,
        HOLDING_DECIMAL.costBasis.precision,
      ),
      unrealisedPnl: toDecimalString(
        normalized.unrealisedPnl,
        HOLDING_DECIMAL.unrealisedPnl.scale,
        HOLDING_DECIMAL.unrealisedPnl.precision,
      ),
    } satisfies FormattedHoldingDecimals,
  };
}

/** Quantity is required on PublicEquityHolding; money fields may be omitted. */
export function isPersistableHoldingQuantity(decimals: FormattedHoldingDecimals): boolean {
  return typeof decimals.quantity === "string";
}

export function normalizeOptionHoldingValues(input: {
  contracts: number;
  marketPrice?: number | null;
  marketValue?: number | null;
  premiumPaid?: number | null;
  contractMultiplier?: number;
}) {
  const multiplier = input.contractMultiplier && input.contractMultiplier > 0 ? input.contractMultiplier : 100;
  const contracts = input.contracts !== 0 && !Number.isNaN(input.contracts) ? input.contracts : 0;
  const marketPrice = finiteOrNull(input.marketPrice);
  let marketValue = finiteOrNull(input.marketValue);
  const costBasis = finiteOrNull(input.premiumPaid);

  if (marketValue == null && marketPrice != null && contracts !== 0) {
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

export function buildCryptoSymbol(symbol: string) {
  return symbol.trim().toUpperCase();
}
