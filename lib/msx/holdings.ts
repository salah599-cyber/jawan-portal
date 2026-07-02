import { COLUMN_ALIASES, KNOWN_MSX_SYMBOLS, MSX_SYMBOL_PATTERN } from "./constants";
import { parseNumeric, parseQuantity } from "./parse-number";
import type { ParsedHolding } from "./types";

function normalizeHeader(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
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

function cleanSymbol(value: string): string | undefined {
  const symbol = value
    .trim()
    .toUpperCase()
    .replace(/\.OM$/, "")
    .replace(/[^A-Z0-9]/g, "");

  if (!MSX_SYMBOL_PATTERN.test(symbol)) return undefined;
  return symbol;
}

function looksLikeSymbol(value: string): boolean {
  const symbol = cleanSymbol(value);
  if (!symbol) return false;
  if (KNOWN_MSX_SYMBOLS.has(symbol)) return true;
  return symbol.length >= 3 && symbol.length <= 5;
}

function cellValue(row: unknown[], index?: number): unknown {
  if (index == null || index < 0) return undefined;
  return row[index];
}

export function rowToHolding(row: unknown[], mapping: Partial<Record<keyof ParsedHolding, number>>): ParsedHolding | null {
  const symbolRaw = cellValue(row, mapping.symbol);
  let symbol = typeof symbolRaw === "string" ? cleanSymbol(symbolRaw) : undefined;

  if (!symbol) {
    for (const cell of row) {
      if (typeof cell === "string" && looksLikeSymbol(cell)) {
        symbol = cleanSymbol(cell);
        break;
      }
    }
  }

  if (!symbol) return null;

  const quantity = parseQuantity(cellValue(row, mapping.quantity));
  if (quantity == null || quantity <= 0) return null;

  const nameRaw = cellValue(row, mapping.name);
  const marketPrice = parseNumeric(cellValue(row, mapping.marketPrice));
  const marketValue = parseNumeric(cellValue(row, mapping.marketValue));
  const costBasis = parseNumeric(cellValue(row, mapping.costBasis));
  const unrealisedPnl = parseNumeric(cellValue(row, mapping.unrealisedPnl));

  return {
    symbol,
    name: typeof nameRaw === "string" ? nameRaw.trim() || undefined : undefined,
    quantity,
    costBasis,
    marketPrice,
    marketValue: marketValue ?? (marketPrice != null ? marketPrice * quantity : undefined),
    unrealisedPnl,
    currency: "OMR",
  };
}

export function parseTextLines(text: string): ParsedHolding[] {
  const holdings: ParsedHolding[] = [];
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

  for (const line of lines) {
    const symbolMatch = line.match(/\b([A-Z]{2,6})\b/);
    if (!symbolMatch || !looksLikeSymbol(symbolMatch[1])) continue;

    const numbers = [...line.matchAll(/-?\d[\d,]*(?:\.\d+)?/g)]
      .map((match) => parseNumeric(match[0]))
      .filter((value): value is number => value != null);

    if (numbers.length === 0) continue;

    const quantity = numbers.find((value) => value > 0 && Number.isInteger(value)) ?? numbers[0];
    if (!quantity || quantity <= 0) continue;

    const symbol = cleanSymbol(symbolMatch[1])!;
    const marketPrice = numbers.length >= 2 ? numbers[numbers.length - 2] : undefined;
    const marketValue = numbers.length >= 1 ? numbers[numbers.length - 1] : undefined;

    holdings.push({
      symbol,
      quantity,
      marketPrice,
      marketValue,
      currency: "OMR",
    });
  }

  return dedupeHoldings(holdings);
}

export function rowsToHoldings(rows: unknown[][]): ParsedHolding[] {
  if (rows.length === 0) return [];

  let headerIndex = -1;
  let mapping: Partial<Record<keyof ParsedHolding, number>> = {};

  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const headers = rows[i].map((cell) => String(cell ?? ""));
    const candidate = mapColumns(headers);
    if (candidate.symbol != null && candidate.quantity != null) {
      headerIndex = i;
      mapping = candidate;
      break;
    }
    if (candidate.symbol != null || candidate.quantity != null) {
      headerIndex = i;
      mapping = candidate;
    }
  }

  const dataRows = headerIndex >= 0 ? rows.slice(headerIndex + 1) : rows;
  const holdings: ParsedHolding[] = [];

  for (const row of dataRows) {
    if (!row || row.every((cell) => cell == null || String(cell).trim() === "")) continue;
    const holding = rowToHolding(row, mapping);
    if (holding) holdings.push(holding);
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
