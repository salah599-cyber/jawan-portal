import type { PublicMarket } from "@/lib/generated/prisma/client";
import { COLUMN_ALIASES, MARKET_CONFIG } from "@/lib/public-markets/constants";
import { parseNumeric, parseQuantity } from "@/lib/msx/parse-number";
import type { ParsedHolding } from "@/lib/public-markets/types";
import { normalizeHoldingValues } from "@/lib/public-markets/valuation";

const HEADER_SCAN_LIMIT = 50;
const SKIP_ROW_PATTERN = /\b(total|grand\s*total|sub\s*total|summary|portfolio\s*value|cash\s*balance|header)\b/i;

const SYMBOL_PATTERNS: Record<PublicMarket, RegExp> = {
  MSX: /^[A-Z]{2,6}$/,
  USA: /^[A-Z]{1,5}(\.[A-Z])?$/,
  HONG_KONG: /^[0-9]{4,5}$/,
  CHINA: /^[0-9]{6}$/,
  INDIA: /^[A-Z0-9]{2,12}$/,
  UK: /^[A-Z0-9]{2,12}$/,
  OTHER: /^[A-Z0-9]{1,12}$/,
};

function normalizeHeader(value: string): string {
  return value
    .toLowerCase()
    .replace(/[_/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function mapColumns(headers: string[]): Partial<Record<keyof ParsedHolding, number>> {
  const mapping: Partial<Record<keyof ParsedHolding, number>> = {};

  headers.forEach((header, index) => {
    const normalized = normalizeHeader(header);
    if (!normalized) return;

    for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
      if (aliases.some((alias) => normalized === alias || normalized.includes(alias))) {
        const key = field as keyof ParsedHolding;
        if (mapping[key] == null) {
          mapping[key] = index;
        }
      }
    }
  });

  return mapping;
}

function cleanSymbol(value: string, market: PublicMarket): string | undefined {
  let symbol = value
    .trim()
    .toUpperCase()
    .replace(/\.OM$/, "")
    .replace(/\.HK$/, "")
    .replace(/\.SS$/, "")
    .replace(/\.SZ$/, "")
    .replace(/\.NS$/, "")
    .replace(/\.BO$/, "")
    .replace(/\.L$/, "");

  if (market === "HONG_KONG" && /^\d+$/.test(symbol)) {
    return symbol.padStart(4, "0");
  }

  symbol = symbol.replace(/[^A-Z0-9.]/g, "");
  if (!symbol) return undefined;

  const pattern = SYMBOL_PATTERNS[market];
  if (!pattern.test(symbol)) return undefined;
  return symbol;
}

export function extractSymbolFromText(value: unknown, market: PublicMarket): string | undefined {
  if (value == null || value === "") return undefined;

  const text = String(value).trim();
  if (!text) return undefined;

  const leadingCode = text.match(/^([A-Z0-9]{1,12})\b/i);
  if (leadingCode) {
    const symbol = cleanSymbol(leadingCode[1], market);
    if (symbol) return symbol;
  }

  const parenthetical = text.match(/\(([A-Z0-9]{1,12})\)/i);
  if (parenthetical) {
    const symbol = cleanSymbol(parenthetical[1], market);
    if (symbol) return symbol;
  }

  return cleanSymbol(text, market);
}

function cellValue(row: unknown[], index?: number): unknown {
  if (index == null || index < 0) return undefined;
  return row[index];
}

function inferQuantity(row: unknown[], mapping: Partial<Record<keyof ParsedHolding, number>>): number | undefined {
  const mapped = parseQuantity(cellValue(row, mapping.quantity));
  if (mapped != null && mapped > 0) return mapped;

  const usedIndexes = new Set(
    Object.values(mapping).filter((value): value is number => value != null),
  );

  const numericCells = row
    .map((cell, index) => ({ cell, index }))
    .filter(({ index }) => !usedIndexes.has(index))
    .map(({ cell }) => parseQuantity(cell))
    .filter((value): value is number => value != null && value > 0);

  const integers = numericCells.filter((value) => Number.isInteger(value));
  if (integers.length > 0) {
    return integers.sort((a, b) => b - a)[0];
  }

  return numericCells[0];
}

function inferName(row: unknown[], mapping: Partial<Record<keyof ParsedHolding, number>>, symbol: string): string | undefined {
  const mapped = cellValue(row, mapping.name);
  if (typeof mapped === "string" && mapped.trim()) {
    const trimmed = mapped.trim();
    if (trimmed.toUpperCase() !== symbol) return trimmed;
  }

  for (const cell of row) {
    if (typeof cell !== "string") continue;
    const trimmed = cell.trim();
    if (!trimmed || trimmed.toUpperCase() === symbol) continue;
    if (trimmed.length > symbol.length + 2 && /[a-z]/i.test(trimmed)) {
      return trimmed;
    }
  }

  return undefined;
}

export function rowToHolding(
  row: unknown[],
  mapping: Partial<Record<keyof ParsedHolding, number>>,
  market: PublicMarket,
): ParsedHolding | null {
  const symbolRaw = cellValue(row, mapping.symbol);
  let symbol =
    extractSymbolFromText(symbolRaw, market) ??
    row.map((cell) => extractSymbolFromText(cell, market)).find((value): value is string => !!value);

  if (!symbol) return null;

  const quantity = inferQuantity(row, mapping);
  if (quantity == null || quantity <= 0) return null;

  const marketPrice = parseNumeric(cellValue(row, mapping.marketPrice));
  const marketValue = parseNumeric(cellValue(row, mapping.marketValue));
  const costBasis = parseNumeric(cellValue(row, mapping.costBasis));
  const unrealisedPnl = parseNumeric(cellValue(row, mapping.unrealisedPnl));

  const isin = typeof cellValue(row, mapping.isin) === "string" ? String(cellValue(row, mapping.isin)).trim() : undefined;
  const cusip = typeof cellValue(row, mapping.cusip) === "string" ? String(cellValue(row, mapping.cusip)).trim() : undefined;
  const sedol = typeof cellValue(row, mapping.sedol) === "string" ? String(cellValue(row, mapping.sedol)).trim() : undefined;
  const exchange = typeof cellValue(row, mapping.exchange) === "string" ? String(cellValue(row, mapping.exchange)).trim() : undefined;

  const normalized = normalizeHoldingValues({
    quantity,
    costBasis,
    marketPrice,
    marketValue,
    unrealisedPnl,
  });

  return {
    symbol,
    name: inferName(row, mapping, symbol),
    quantity,
    costBasis: normalized.costBasis ?? undefined,
    marketPrice: normalized.marketPrice ?? undefined,
    marketValue: normalized.marketValue ?? undefined,
    unrealisedPnl: normalized.unrealisedPnl ?? undefined,
    currency: MARKET_CONFIG[market].currency,
    country: MARKET_CONFIG[market].country,
    exchange: exchange ?? MARKET_CONFIG[market].exchange,
    isin: isin || undefined,
    cusip: cusip || undefined,
    sedol: sedol || undefined,
  };
}

export function rowsToHoldings(rows: unknown[][], market: PublicMarket): ParsedHolding[] {
  if (rows.length === 0) return [];

  let headerIndex = -1;
  let mapping: Partial<Record<keyof ParsedHolding, number>> = {};
  let bestScore = 0;

  for (let i = 0; i < Math.min(rows.length, HEADER_SCAN_LIMIT); i++) {
    const headers = rows[i].map((cell) => String(cell ?? ""));
    const candidate = mapColumns(headers);
    let score = 0;
    if (candidate.symbol != null) score += 3;
    if (candidate.quantity != null) score += 3;
    if (candidate.name != null) score += 1;
    if (candidate.marketPrice != null) score += 1;
    if (candidate.marketValue != null) score += 1;

    if (score > bestScore) {
      bestScore = score;
      headerIndex = i;
      mapping = candidate;
    }

    if (candidate.symbol != null && candidate.quantity != null) {
      headerIndex = i;
      mapping = candidate;
      break;
    }
  }

  const dataRows = headerIndex >= 0 ? rows.slice(headerIndex + 1) : rows;
  const holdings: ParsedHolding[] = [];

  for (const row of dataRows) {
    if (!row || row.every((cell) => cell == null || String(cell).trim() === "")) continue;

    const rowText = row.map((cell) => String(cell ?? "")).join(" ");
    if (SKIP_ROW_PATTERN.test(rowText)) continue;

    const holding = rowToHolding(row, mapping, market);
    if (holding) holdings.push(holding);
  }

  if (holdings.length === 0) {
    for (const row of dataRows) {
      if (!row || row.every((cell) => cell == null || String(cell).trim() === "")) continue;
      const rowText = row.map((cell) => String(cell ?? "")).join(" ");
      if (SKIP_ROW_PATTERN.test(rowText)) continue;
      const holding = rowToHolding(row, {}, market);
      if (holding) holdings.push(holding);
    }
  }

  return dedupeHoldings(holdings);
}

export function dedupeHoldings(holdings: ParsedHolding[]): ParsedHolding[] {
  const bySymbol = new Map<string, ParsedHolding>();
  for (const holding of holdings) {
    bySymbol.set(holding.symbol, holding);
  }
  return [...bySymbol.values()];
}
