import { KNOWN_MSX_SYMBOLS, MSX_SYMBOL_PATTERN } from "./constants";
import { parseNumeric, parseQuantity } from "./parse-number";
import type { ParsedHolding, ParseReportResult } from "./types";
import { dedupeHoldings } from "./holdings";
import { extractAccountNumber, extractAsOfDate } from "./detect-broker";

/** U-Capital / Ubhar Capital monthly Statement of Holdings PDFs. */
export function isUCapitalReport(fileName: string, text: string): boolean {
  const haystack = `${fileName}\n${text}`.toLowerCase();
  return (
    /u[\s\-]?capital/.test(haystack) ||
    /ubhar\s*capital/.test(haystack) ||
    /www\.u-capital\.net/.test(haystack) ||
    (/statement\s+of\s+holdings/.test(haystack) && /client\s*id\s*:/.test(haystack))
  );
}

/**
 * Map common security names from U-Capital Oman reports to MSX tickers.
 * Equity maps intentionally exclude bond / right-issue rows.
 */
const EQUITY_NAME_TO_SYMBOL: Array<{ pattern: RegExp; symbol: string }> = [
  { pattern: /\bahli\s+bank\b/i, symbol: "ABOB" },
  { pattern: /\bbank\s+dhofar\b/i, symbol: "DHOF" },
  { pattern: /\bbank\s+muscat\b/i, symbol: "BKMB" },
  { pattern: /\bnational\s+bank\s+of\s+oman\b/i, symbol: "NBOB" },
  { pattern: /\bsohar\s+international\s+bank\b/i, symbol: "SOHR" },
  { pattern: /\bomantel\b/i, symbol: "OTEL" },
  { pattern: /\booredoo\b/i, symbol: "ORDS" },
  { pattern: /\bvoltamp\b/i, symbol: "VOLT" },
  { pattern: /\boq\s+gas\s+networks\b/i, symbol: "OQGN" },
  { pattern: /\boq\s+exploration\b/i, symbol: "OQEP" },
  { pattern: /\boq\s+base\s+industries\b/i, symbol: "OQBI" },
  { pattern: /\boman\s+chlorine|\bochl\b/i, symbol: "OCHL" },
  { pattern: /\btaageer\s+finance\b/i, symbol: "TFCI" },
  { pattern: /\bal\s+omaniya\s+fin\.?\s*serv/i, symbol: "AOFS" },
  { pattern: /\bglobal\s+invest/i, symbol: "GFIC" },
  { pattern: /\babraj\s+energy\b/i, symbol: "ABRJ" },
  { pattern: /\bal\s+batinah\s+power\b/i, symbol: "BATP" },
  { pattern: /\bal\s+suwadi\s+power\b/i, symbol: "SUWP" },
  { pattern: /\basyad\s+shipping\b/i, symbol: "ASYD" },
  { pattern: /\bomifco|\bomif\b/i, symbol: "OMIF" },
  { pattern: /\bpheonix\s+power|\bphoenix\s+power\b/i, symbol: "PHPC" },
  { pattern: /\bsempcorp\s+salalah\b/i, symbol: "SSPW" },
  { pattern: /\bliva\s+group\b/i, symbol: "LIVA" },
  { pattern: /\boman\s+textile\b/i, symbol: "OTMH" },
  { pattern: /\bal\s+fajar\b/i, symbol: "AFAC" },
  { pattern: /\bal\s+jazeera\s+steel\b/i, symbol: "AJSS" },
  { pattern: /\basaffa\s+foods|\bspfi\b/i, symbol: "SPFI" },
  { pattern: /\bgalfar\b/i, symbol: "GECS" },
  { pattern: /\bnational\s+mineral\s+water|\bnmwi\b/i, symbol: "NMWI" },
  { pattern: /\boman\s+cables\b/i, symbol: "OCII" },
  { pattern: /\boman\s+chromite\b/i, symbol: "OCHI" },
  { pattern: /\boman\s+flour\s+mills|\bofm\b/i, symbol: "OFMI" },
  { pattern: /\braysut\s+cement|\brcc\b/i, symbol: "RCCI" },
  { pattern: /\bdhofar\s+food\b/i, symbol: "DFII" },
  { pattern: /\bcement\s*&\s*gypsum\b/i, symbol: "CGMC" },
  { pattern: /\boman\s+arab\s+bank\b/i, symbol: "OAB" },
];

/** Short aliases used in U-Capital parentheses that differ from MSX tickers. */
const PAREN_TICKER_ALIASES: Record<string, string> = {
  NBO: "NBOB",
  OFM: "OFMI",
  RCC: "RCCI",
  NMWI: "NMWI",
  SPFI: "SPFI",
  GFIC: "GFIC",
  OMIF: "OMIF",
  OCHL: "OCHL",
  ABOB: "ABOB",
  OTH: "OTMH",
};

const ISIN_PATTERN = /^OM[0-9A-Z]{10}$/i;
const CURRENCY_PATTERN = /^[A-Z]{3}$/;
const NON_EQUITY_PATTERN = /\b(bond|bonds|perpetual|sukuk|right\s*issue|convertible)\b/i;

function cleanSecurityName(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .replace(/\s*-\s*\d+\s*$/, "")
    .trim();
}

function isNonEquitySecurity(security: string): boolean {
  return NON_EQUITY_PATTERN.test(security);
}

function extractTickerFromParentheses(security: string): string | undefined {
  const matches = [...security.matchAll(/\(([A-Z0-9]{2,12})\)/gi)];
  for (const match of matches) {
    const token = match[1]?.toUpperCase();
    if (!token) continue;
    if (ISIN_PATTERN.test(token)) continue;
    if (/^\d+$/.test(token)) continue;
    const aliased = PAREN_TICKER_ALIASES[token] ?? token;
    if (MSX_SYMBOL_PATTERN.test(aliased)) return aliased;
  }
  return undefined;
}

function symbolFromEquityName(security: string): string | undefined {
  for (const { pattern, symbol } of EQUITY_NAME_TO_SYMBOL) {
    if (pattern.test(security)) return symbol;
  }
  return undefined;
}

function symbolFromIsin(isin: string): string | undefined {
  const digits = isin.replace(/\D/g, "").slice(-4);
  if (digits.length === 4) return `S${digits}`.slice(0, 6);
  return undefined;
}

export function resolveUCapitalSymbol(security: string, isin?: string): string | undefined {
  const fromParens = extractTickerFromParentheses(security);
  if (fromParens) return fromParens;

  // Do not map bond / perpetual rows onto equity tickers (would overwrite BKMB, ABOB, …).
  if (!isNonEquitySecurity(security)) {
    const fromName = symbolFromEquityName(security);
    if (fromName) return fromName;
  }

  if (isin && ISIN_PATTERN.test(isin)) {
    return symbolFromIsin(isin.toUpperCase());
  }

  return undefined;
}

function isHoldingDataRow(row: unknown[]): boolean {
  if (!row || row.length < 9) return false;
  const security = String(row[0] ?? "").trim();
  if (!security) return false;
  if (/^total\b/i.test(security)) return false;
  if (/^grand\s+total\b/i.test(security)) return false;
  if (/^security$/i.test(security)) return false;
  if (/all amounts are/i.test(security)) return false;

  const currency = String(row[1] ?? "").trim().toUpperCase();
  const isin = String(row[2] ?? "").trim().toUpperCase();
  if (!CURRENCY_PATTERN.test(currency)) return false;
  if (!ISIN_PATTERN.test(isin)) return false;
  return true;
}

/**
 * Parse a U-Capital Statement of Holdings table row.
 * Columns: Security | Curr | ISIN | Shares Held | Cost Price | Mkt Price | WDV Cost |
 *          Mkt Price | Mkt Value | Unrelz Gain | Relz Gain | Cash Dividends | Total Gain | % NAV
 */
export function parseUCapitalHoldingRow(row: unknown[]): ParsedHolding | null {
  if (!isHoldingDataRow(row)) return null;

  const security = String(row[0] ?? "").trim();
  const isin = String(row[2] ?? "").trim().toUpperCase();
  const quantity = parseQuantity(row[3]);
  if (quantity == null || quantity <= 0) return null;

  const costPrice = parseNumeric(row[4]);
  const marketPrice = parseNumeric(row[5]) ?? parseNumeric(row[7]);
  const costBasis = parseNumeric(row[6]);
  const marketValue = parseNumeric(row[8]);
  const unrealisedPnl = parseNumeric(row[9]);

  const symbol = resolveUCapitalSymbol(security, isin);
  if (!symbol) return null;

  return {
    symbol,
    name: cleanSecurityName(security),
    quantity,
    costBasis: costBasis ?? (costPrice != null ? costPrice * quantity : undefined),
    marketPrice: marketPrice ?? undefined,
    marketValue: marketValue ?? undefined,
    unrealisedPnl: unrealisedPnl ?? undefined,
    currency: "OMR",
    isin,
  };
}

export function parseUCapitalTableRows(tableRows: unknown[][]): ParsedHolding[] {
  const holdings: ParsedHolding[] = [];
  for (const row of tableRows) {
    const holding = parseUCapitalHoldingRow(row);
    if (holding) holdings.push(holding);
  }
  return dedupeHoldings(holdings);
}

export function parseUCapitalReport(
  text: string,
  tableRows: unknown[][],
  fileName: string,
): ParseReportResult {
  const holdings = parseUCapitalTableRows(tableRows);
  const warnings: string[] = [];

  if (holdings.length === 0) {
    warnings.push(
      "U-Capital statement detected but no holdings rows were parsed. Verify the PDF is a Statement of Holdings export.",
    );
  } else {
    const known = holdings.filter((holding) => KNOWN_MSX_SYMBOLS.has(holding.symbol)).length;
    if (known < holdings.length) {
      warnings.push(
        `Parsed ${holdings.length} U-Capital holdings (${known} matched known MSX tickers). Verify symbols against the statement.`,
      );
    }
  }

  return {
    broker: "U Capital",
    accountNumber: extractAccountNumber(text) ?? extractAccountNumber(fileName),
    asOfDate: extractAsOfDate(text),
    holdings,
    warnings,
  };
}
