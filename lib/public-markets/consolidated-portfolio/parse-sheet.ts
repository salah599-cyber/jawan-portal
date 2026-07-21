import type { PublicMarket } from "@/lib/generated/prisma/client";
import { parseNumeric, parseQuantity } from "@/lib/msx/parse-number";
import { mapColumns } from "@/lib/public-markets/holdings";
import type { ParsedHolding } from "@/lib/public-markets/types";
import {
  CONSOLIDATED_SHEET_NAMES,
  CONSOLIDATED_SHEET_SIGNATURE,
  intlStockMarketFromExchange,
  resolveUsStockBrokerKey,
  type ConsolidatedBrokerKey,
} from "@/lib/public-markets/consolidated-portfolio/constants";

const HEADER_SCAN_LIMIT = 50;

function findHeaderRow(rows: unknown[][], matchers: string[]): number {
  for (let i = 0; i < Math.min(rows.length, HEADER_SCAN_LIMIT); i++) {
    const first = String(rows[i]?.[0] ?? "").trim();
    if (matchers.includes(first)) return i;
  }
  return -1;
}

function cell(row: unknown[], index?: number): unknown {
  if (index == null || index < 0) return undefined;
  return row[index];
}

function parseDateCell(value: unknown): Date | undefined {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const text = String(value ?? "").trim();
  if (!text) return undefined;
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function extractMaturityFromDescription(description: string): Date | undefined {
  const match = description.match(/(\d{2})\.(\d{2})\.(\d{4})/);
  if (!match) return undefined;
  const [, day, month, year] = match;
  const parsed = new Date(`${year}-${month}-${day}`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function extractCouponFromDescription(description: string): number | undefined {
  const match = description.match(/^([\d.]+)%/);
  if (!match) return undefined;
  const rate = parseFloat(match[1]);
  return Number.isNaN(rate) ? undefined : rate;
}

function extractIssuerFromDescription(description: string): string {
  const withoutCoupon = description.replace(/^[\d.]+%\s*/, "");
  const parts = withoutCoupon.split(/\s+(?:Reverse Conv\.|FCN|Accumulator)/i);
  return parts[0]?.trim() || "Unknown";
}

export type ParsedOptionRow = {
  underlyingSymbol: string;
  optionType: "CALL" | "PUT";
  strikePrice: number;
  expiryDate: Date;
  contracts: number;
  contractMultiplier: number;
  premiumPaid?: number;
  marketPrice?: number;
  marketValue?: number;
  unrealisedPnl?: number;
  broker?: string;
  accountNumber?: string;
  asOfDate?: Date;
};

export type ParsedStructuredNoteRow = {
  productName: string;
  issuer: string;
  isin?: string;
  notionalAmount: number;
  pricePercent?: number;
  marketValue: number;
  unrealisedPnl?: number;
  currency: string;
  maturityDate?: Date;
  couponRate?: number;
  payoffNotes?: string;
  source?: string;
};

export type ParsedBondRow = {
  bondName: string;
  isin?: string;
  cusip?: string;
  faceValue: number;
  pricePercent?: number;
  marketValue: number;
  costBasis?: number;
  unrealisedPnl?: number;
  currency: string;
  source?: string;
};

export type ParsedIntlEquityRow = {
  market: PublicMarket;
  symbol: string;
  name: string;
  quantity: number;
  isin?: string;
  localCurrency?: string;
  localMarketPrice?: number;
  marketValue?: number;
  unrealisedPnl?: number;
  exchange?: string;
  source?: string;
};

export type ParsedCashBalanceRow = {
  accountLabel: string;
  currency: string;
  nominalAmount: number;
  valuationUsd: number;
  source?: string;
};

export type ParsedConsolidatedPortfolio = {
  usEquitiesByBroker: Record<ConsolidatedBrokerKey, ParsedHolding[]>;
  options: ParsedOptionRow[];
  structuredNotes: ParsedStructuredNoteRow[];
  bonds: ParsedBondRow[];
  intlEquities: ParsedIntlEquityRow[];
  funds: ParsedHolding[];
  cashBalances: ParsedCashBalanceRow[];
  warnings: string[];
};

function parseUsStocksSheet(rows: unknown[][]): Record<ConsolidatedBrokerKey, ParsedHolding[]> {
  const headerIndex = findHeaderRow(rows, ["Symbol"]);
  if (headerIndex < 0) {
    return { safra: [], "kristal-k18518750": [], "kristal-k15875750": [] };
  }

  const mapping = mapColumns(rows[headerIndex].map((cell) => String(cell ?? "")));
  const result: Record<ConsolidatedBrokerKey, ParsedHolding[]> = {
    safra: [],
    "kristal-k18518750": [],
    "kristal-k15875750": [],
  };

  for (const row of rows.slice(headerIndex + 1)) {
    const symbol = String(cell(row, mapping.symbol) ?? "").trim().toUpperCase();
    if (!symbol) continue;

    const name = String(cell(row, mapping.name) ?? "").trim() || undefined;
    const quantity = parseQuantity(cell(row, mapping.quantity));
    if (quantity == null || quantity <= 0) continue;

    const holding: ParsedHolding = {
      symbol,
      name,
      quantity,
      costBasis: parseNumeric(cell(row, mapping.costBasis)) ?? undefined,
      marketPrice: parseNumeric(cell(row, mapping.marketPrice)) ?? undefined,
      marketValue: parseNumeric(cell(row, mapping.marketValue)) ?? undefined,
      unrealisedPnl: parseNumeric(cell(row, mapping.unrealisedPnl)) ?? undefined,
      isin: String(cell(row, mapping.isin) ?? "").trim() || undefined,
      cusip: String(cell(row, mapping.cusip) ?? "").trim() || undefined,
      sedol: String(cell(row, mapping.sedol) ?? "").trim() || undefined,
      exchange: String(cell(row, mapping.exchange) ?? "").trim() || undefined,
      currency: "USD",
    };

    const brokerKey = resolveUsStockBrokerKey(name ?? "", symbol);
    result[brokerKey].push(holding);
  }

  return result;
}

function parseOptionsSheet(rows: unknown[][]): ParsedOptionRow[] {
  const headerIndex = findHeaderRow(rows, ["Underlying Symbol"]);
  if (headerIndex < 0) return [];

  const headers = rows[headerIndex].map((cell) => String(cell ?? ""));
  const mapping = mapColumns(headers);
  const options: ParsedOptionRow[] = [];

  for (const row of rows.slice(headerIndex + 1)) {
    const underlyingSymbol = String(cell(row, mapping.symbol) ?? "").trim().toUpperCase();
    if (!underlyingSymbol) continue;

    const optionTypeRaw = String(cell(row, headers.indexOf("Option Type")) ?? "CALL").toUpperCase();
    const optionType = optionTypeRaw === "PUT" ? "PUT" : "CALL";
    const strikePrice = parseNumeric(cell(row, headers.indexOf("Strike Price")));
    const expiryDate = parseDateCell(cell(row, headers.indexOf("Expiry Date")));
    const contracts = parseNumeric(cell(row, headers.indexOf("Contracts")));

    if (strikePrice == null || !expiryDate || contracts == null || contracts === 0) continue;

    options.push({
      underlyingSymbol,
      optionType,
      strikePrice,
      expiryDate,
      contracts,
      contractMultiplier: parseNumeric(cell(row, headers.indexOf("Contract Multiplier"))) ?? 100,
      premiumPaid: parseNumeric(cell(row, headers.indexOf("Premium Paid"))) ?? undefined,
      marketPrice: parseNumeric(cell(row, headers.indexOf("Market Price"))) ?? undefined,
      marketValue: parseNumeric(cell(row, headers.indexOf("Market Value"))) ?? undefined,
      unrealisedPnl: parseNumeric(cell(row, headers.indexOf("Unrealised P&L"))) ?? undefined,
      broker: String(cell(row, headers.indexOf("Broker")) ?? "").trim() || undefined,
      accountNumber: String(cell(row, headers.indexOf("Account")) ?? "").trim() || undefined,
      asOfDate: parseDateCell(cell(row, headers.indexOf("As Of Date"))),
    });
  }

  return options;
}

function parseStructuredNotesSheet(rows: unknown[][]): ParsedStructuredNoteRow[] {
  const headerIndex = findHeaderRow(rows, ["Description"]);
  if (headerIndex < 0) return [];

  const headers = rows[headerIndex].map((cell) => String(cell ?? ""));
  const notes: ParsedStructuredNoteRow[] = [];

  for (const row of rows.slice(headerIndex + 1)) {
    const description = String(cell(row, headers.indexOf("Description")) ?? "").trim();
    if (!description) continue;

    const isin = String(cell(row, headers.indexOf("ISIN")) ?? "").trim() || undefined;
    const notional = parseNumeric(cell(row, headers.indexOf("Notional/Units")));
    const marketValue = parseNumeric(cell(row, headers.indexOf("Market Value")));
    if (notional == null && marketValue == null) continue;

    const notionalAmount = Math.abs(notional ?? marketValue ?? 0);
    const resolvedMarketValue = marketValue ?? notionalAmount;

    notes.push({
      productName: description,
      issuer: extractIssuerFromDescription(description),
      isin,
      notionalAmount,
      pricePercent: parseNumeric(cell(row, headers.indexOf("Price (%)"))) ?? undefined,
      marketValue: resolvedMarketValue,
      unrealisedPnl: parseNumeric(cell(row, headers.indexOf("Unrealised P&L"))) ?? undefined,
      currency: String(cell(row, headers.indexOf("Currency")) ?? "USD").trim() || "USD",
      maturityDate: extractMaturityFromDescription(description),
      couponRate: extractCouponFromDescription(description),
      payoffNotes: description,
      source: String(cell(row, headers.indexOf("Source")) ?? "").trim() || undefined,
    });
  }

  return notes;
}

function parseBondsSheet(rows: unknown[][]): ParsedBondRow[] {
  const headerIndex = findHeaderRow(rows, ["Bond Name"]);
  if (headerIndex < 0) return [];

  const headers = rows[headerIndex].map((cell) => String(cell ?? ""));
  const bonds: ParsedBondRow[] = [];

  for (const row of rows.slice(headerIndex + 1)) {
    const bondName = String(cell(row, headers.indexOf("Bond Name")) ?? "").trim();
    if (!bondName) continue;

    const faceValue = parseNumeric(cell(row, headers.indexOf("Face Value")));
    const marketValue = parseNumeric(cell(row, headers.indexOf("Market Value")));
    if (faceValue == null || marketValue == null) continue;

    bonds.push({
      bondName,
      isin: String(cell(row, headers.indexOf("ISIN")) ?? "").trim() || undefined,
      cusip: String(cell(row, headers.indexOf("CUSIP")) ?? "").trim() || undefined,
      faceValue,
      pricePercent: parseNumeric(cell(row, headers.indexOf("Price (%)"))) ?? undefined,
      marketValue,
      costBasis: parseNumeric(cell(row, headers.indexOf("Cost/Invested Amount"))) ?? undefined,
      unrealisedPnl: parseNumeric(cell(row, headers.indexOf("Unrealised P&L"))) ?? undefined,
      currency: String(cell(row, headers.indexOf("Currency")) ?? "USD").trim() || "USD",
      source: String(cell(row, headers.indexOf("Source")) ?? "").trim() || undefined,
    });
  }

  return bonds;
}

function parseIntlStocksSheet(rows: unknown[][]): ParsedIntlEquityRow[] {
  const headerIndex = findHeaderRow(rows, ["Name"]);
  if (headerIndex < 0) return [];

  const headers = rows[headerIndex].map((cell) => String(cell ?? ""));
  if (!headers.includes("ISIN")) return [];

  const equities: ParsedIntlEquityRow[] = [];

  for (const row of rows.slice(headerIndex + 1)) {
    const name = String(cell(row, headers.indexOf("Name")) ?? "").trim();
    const isin = String(cell(row, headers.indexOf("ISIN")) ?? "").trim();
    const quantity = parseQuantity(cell(row, headers.indexOf("Quantity")));
    if (!name || !isin || quantity == null || quantity <= 0) continue;

    const exchange = String(cell(row, headers.indexOf("Exchange")) ?? "").trim() || undefined;
    const market = intlStockMarketFromExchange(exchange ?? "");

    equities.push({
      market,
      symbol: isin,
      name,
      quantity,
      isin,
      localCurrency: String(cell(row, headers.indexOf("Local Currency")) ?? "").trim() || undefined,
      localMarketPrice: parseNumeric(cell(row, headers.indexOf("Local Market Price"))) ?? undefined,
      marketValue: parseNumeric(cell(row, headers.indexOf("Market Value (USD)"))) ?? undefined,
      unrealisedPnl: parseNumeric(cell(row, headers.indexOf("Unrealised P&L (USD)"))) ?? undefined,
      exchange,
      source: String(cell(row, headers.indexOf("Source")) ?? "").trim() || undefined,
    });
  }

  return equities;
}

function parseFundsSheet(rows: unknown[][]): ParsedHolding[] {
  const headerIndex = findHeaderRow(rows, ["Name"]);
  if (headerIndex < 0) return [];

  const headers = rows[headerIndex].map((cell) => String(cell ?? ""));
  if (!headers.includes("Units")) return [];

  const funds: ParsedHolding[] = [];

  for (const row of rows.slice(headerIndex + 1)) {
    const name = String(cell(row, headers.indexOf("Name")) ?? "").trim();
    const isin = String(cell(row, headers.indexOf("ISIN")) ?? "").trim();
    const quantity = parseQuantity(cell(row, headers.indexOf("Units")));
    if (!name || !isin || quantity == null || quantity <= 0) continue;

    funds.push({
      symbol: isin,
      name,
      quantity,
      marketPrice: parseNumeric(cell(row, headers.indexOf("Unit Price"))) ?? undefined,
      marketValue: parseNumeric(cell(row, headers.indexOf("Market Value"))) ?? undefined,
      unrealisedPnl: parseNumeric(cell(row, headers.indexOf("Unrealised P&L"))) ?? undefined,
      isin,
      currency: String(cell(row, headers.indexOf("Currency")) ?? "USD").trim() || "USD",
      exchange: String(cell(row, headers.indexOf("Category")) ?? "").trim() || undefined,
    });
  }

  return funds;
}

function parseCashSheet(rows: unknown[][]): ParsedCashBalanceRow[] {
  const headerIndex = findHeaderRow(rows, ["Account/Sub-Account"]);
  if (headerIndex < 0) return [];

  const headers = rows[headerIndex].map((cell) => String(cell ?? ""));
  const balances: ParsedCashBalanceRow[] = [];

  for (const row of rows.slice(headerIndex + 1)) {
    const accountLabel = String(cell(row, headers.indexOf("Account/Sub-Account")) ?? "").trim();
    if (!accountLabel) continue;

    const nominalAmount = parseNumeric(cell(row, headers.indexOf("Nominal Amount")));
    const valuationUsd = parseNumeric(cell(row, headers.indexOf("Valuation (USD)")));
    if (nominalAmount == null || valuationUsd == null) continue;

    balances.push({
      accountLabel,
      currency: String(cell(row, headers.indexOf("Currency")) ?? "").trim() || "USD",
      nominalAmount,
      valuationUsd,
      source: String(cell(row, headers.indexOf("Source")) ?? "").trim() || undefined,
    });
  }

  return balances;
}

export function isConsolidatedPortfolioWorkbook(sheetNames: string[]): boolean {
  return sheetNames.includes(CONSOLIDATED_SHEET_SIGNATURE);
}

export function parseConsolidatedPortfolioSheets(
  sheetsByName: Record<string, unknown[][]>,
): ParsedConsolidatedPortfolio {
  const warnings: string[] = [];

  const usEquitiesByBroker = parseUsStocksSheet(sheetsByName[CONSOLIDATED_SHEET_NAMES.US_STOCKS] ?? []);
  const options = parseOptionsSheet(sheetsByName[CONSOLIDATED_SHEET_NAMES.OPTIONS] ?? []);
  const structuredNotes = parseStructuredNotesSheet(
    sheetsByName[CONSOLIDATED_SHEET_NAMES.STRUCTURED_NOTES] ?? [],
  );
  const bonds = parseBondsSheet(sheetsByName[CONSOLIDATED_SHEET_NAMES.BONDS] ?? []);
  const intlEquities = parseIntlStocksSheet(sheetsByName[CONSOLIDATED_SHEET_NAMES.INTL_STOCKS] ?? []);
  const funds = parseFundsSheet(sheetsByName[CONSOLIDATED_SHEET_NAMES.OTHER_ASSETS] ?? []);
  const cashBalances = parseCashSheet(sheetsByName[CONSOLIDATED_SHEET_NAMES.CASH_BALANCES] ?? []);

  const notesWithoutMaturity = structuredNotes.filter((note) => !note.maturityDate);
  if (notesWithoutMaturity.length > 0) {
    warnings.push(
      `${notesWithoutMaturity.length} structured note(s) have no parseable maturity date — a placeholder date will be used on import.`,
    );
  }

  return {
    usEquitiesByBroker,
    options,
    structuredNotes,
    bonds,
    intlEquities,
    funds,
    cashBalances,
    warnings,
  };
}
