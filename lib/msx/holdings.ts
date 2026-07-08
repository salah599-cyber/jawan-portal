import { COLUMN_ALIASES, KNOWN_MSX_SYMBOLS, MSX_SYMBOL_PATTERN } from "./constants";
import { parseNumeric, parseQuantity } from "./parse-number";
import type { ParsedHolding } from "./types";

const HEADER_SCAN_LIMIT = 50;
const SKIP_ROW_PATTERN = /\b(total|grand\s*total|sub\s*total|summary|portfolio\s*value|cash\s*balance|header)\b/i;

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

export function extractSymbolFromText(value: unknown): string | undefined {
  if (value == null || value === "") return undefined;

  const text = String(value).trim();
  if (!text) return undefined;

  const leadingCode = text.match(/^([A-Z]{2,6})\b/i);
  if (leadingCode) {
    const symbol = cleanSymbol(leadingCode[1]);
    if (symbol) return symbol;
  }

  const parenthetical = text.match(/\(([A-Z]{2,6})\)/i);
  if (parenthetical) {
    const symbol = cleanSymbol(parenthetical[1]);
    if (symbol) return symbol;
  }

  const tokenMatch = text.match(/\b([A-Z]{2,6})\b/i);
  if (tokenMatch) {
    const symbol = cleanSymbol(tokenMatch[1]);
    if (symbol && looksLikeSymbol(symbol)) return symbol;
  }

  return cleanSymbol(text);
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
  if (/^(AND|THE|FOR|FROM|WITH|OMX|MSX|OMR|USD|LLC|LTD|INC)$/.test(symbol)) return false;
  return symbol.length >= 2 && symbol.length <= 6;
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
): ParsedHolding | null {
  const symbolRaw = cellValue(row, mapping.symbol);
  const symbol =
    extractSymbolFromText(symbolRaw) ??
    row.map((cell) => extractSymbolFromText(cell)).find((value): value is string => !!value);

  if (!symbol) return null;

  const quantity = inferQuantity(row, mapping);
  if (quantity == null || quantity <= 0) return null;

  const marketPrice = parseNumeric(cellValue(row, mapping.marketPrice));
  const marketValue = parseNumeric(cellValue(row, mapping.marketValue));
  const costBasis = parseNumeric(cellValue(row, mapping.costBasis));
  const unrealisedPnl = parseNumeric(cellValue(row, mapping.unrealisedPnl));

  return {
    symbol,
    name: inferName(row, mapping, symbol),
    quantity,
    costBasis,
    marketPrice,
    marketValue: marketValue ?? (marketPrice != null ? marketPrice * quantity : undefined),
    unrealisedPnl,
    currency: "OMR",
  };
}

export function parsePdfTableText(text: string): ParsedHolding[] {
  const rows = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !SKIP_ROW_PATTERN.test(line))
    .map((line) => line.split(/\s{2,}|\t+/).map((cell) => cell.trim()))
    .filter((row) => row.some((cell) => cell !== ""));

  return rowsToHoldings(rows);
}

export function parseTextLines(text: string): ParsedHolding[] {
  const holdings: ParsedHolding[] = [];
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

  for (const line of lines) {
    const symbol = extractSymbolFromText(line);
    if (!symbol || !looksLikeSymbol(symbol)) continue;

    const numbers = [...line.matchAll(/-?\d[\d,]*(?:\.\d+)?/g)]
      .map((match) => parseNumeric(match[0]))
      .filter((value): value is number => value != null);

    if (numbers.length === 0) continue;

    const quantity = numbers.find((value) => value > 0 && Number.isInteger(value)) ?? numbers[0];
    if (!quantity || quantity <= 0) continue;

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

function scoreMapping(mapping: Partial<Record<keyof ParsedHolding, number>>): number {
  let score = 0;
  if (mapping.symbol != null) score += 3;
  if (mapping.quantity != null) score += 3;
  if (mapping.name != null) score += 1;
  if (mapping.marketPrice != null) score += 1;
  if (mapping.marketValue != null) score += 1;
  return score;
}

export function rowsToHoldings(rows: unknown[][]): ParsedHolding[] {
  if (rows.length === 0) return [];

  let headerIndex = -1;
  let mapping: Partial<Record<keyof ParsedHolding, number>> = {};
  let bestScore = 0;

  for (let i = 0; i < Math.min(rows.length, HEADER_SCAN_LIMIT); i++) {
    const headers = rows[i].map((cell) => String(cell ?? ""));
    const candidate = mapColumns(headers);
    const score = scoreMapping(candidate);

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

    const holding = rowToHolding(row, mapping);
    if (holding) holdings.push(holding);
  }

  if (holdings.length === 0) {
    return dedupeHoldings(heuristicRowsToHoldings(rows));
  }

  return dedupeHoldings(holdings);
}

function heuristicRowsToHoldings(rows: unknown[][]): ParsedHolding[] {
  const holdings: ParsedHolding[] = [];

  for (const row of rows) {
    if (!row || row.every((cell) => cell == null || String(cell).trim() === "")) continue;

    const rowText = row.map((cell) => String(cell ?? "")).join(" ");
    if (SKIP_ROW_PATTERN.test(rowText)) continue;

    const holding = rowToHolding(row, {});
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
