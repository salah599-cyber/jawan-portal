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

/** Parentheses must stay paired so losses like (148.723) keep their sign. */
const UCAPITAL_NUM = String.raw`(?:\(-?[\d,]+(?:\.\d+)?\)|-?[\d,]+(?:\.\d+)?)`;
/**
 * Text layout from U-Capital Statement of Holdings PDFs (tabs flattened):
 * qty costPrice wdvCost mktPrice mktValue OMR <security…> <isin>
 * Some rows wrap the security name / trailing columns onto the next line.
 */
const UCAPITAL_TEXT_ROW_RE = new RegExp(
  String.raw`^(${UCAPITAL_NUM})\s+(${UCAPITAL_NUM})\s+(${UCAPITAL_NUM})\s+(${UCAPITAL_NUM})\s+(${UCAPITAL_NUM})\s+OMR\s+(.+?)\s+(OM[0-9A-Z]{10})\s*$`,
  "i",
);

function coalesceUCapitalTextLines(text: string): string[] {
  const normalized = text
    .split(/\r?\n/)
    .map((line) => line.replace(/\t/g, " ").replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const lines: string[] = [];
  for (let i = 0; i < normalized.length; i += 1) {
    let line = normalized[i]!;
    const looksLikeStart = /^\d[\d,]*\s+/.test(line) && /\bOMR\b/i.test(line);
    // U-Capital often wraps long security names across 2–3 lines before the ISIN.
    if (looksLikeStart && !/OM[0-9A-Z]{10}\s*$/i.test(line)) {
      while (i + 1 < normalized.length && !/OM[0-9A-Z]{10}\s*$/i.test(line)) {
        const next = normalized[i + 1]!;
        const nextIsNewRow = /^\d[\d,]*\s+/.test(next) && /\bOMR\b/i.test(next);
        if (nextIsNewRow) break;
        line = `${line} ${next}`;
        i += 1;
      }
    }
    lines.push(line);
  }
  return lines;
}

function extractUCapitalSecurityName(raw: string): string {
  const withCode = raw.match(/^(.+?\s-\s*\d+)\b/);
  if (withCode?.[1]) return withCode[1].trim();
  return raw
    .replace(/(?:\s+\(?-?[\d,]+(?:\.\d+)?\)?)+$/g, "")
    .replace(/\s+\d+\.\d+%\s*$/g, "")
    .trim();
}

function parseUCapitalTextLine(line: string): ParsedHolding | null {
  const match = line.match(UCAPITAL_TEXT_ROW_RE);
  if (!match) return null;

  const quantity = parseQuantity(match[1]);
  if (quantity == null || quantity <= 0) return null;

  const costPrice = parseNumeric(match[2]);
  const costBasis = parseNumeric(match[3]);
  const marketPrice = parseNumeric(match[4]);
  const marketValue = parseNumeric(match[5]);
  const securityRaw = match[6] ?? "";
  const isin = (match[7] ?? "").toUpperCase();
  const security = extractUCapitalSecurityName(securityRaw);
  if (!security) return null;

  const symbol = resolveUCapitalSymbol(security, isin);
  if (!symbol) return null;

  const afterName = securityRaw.slice(security.length).trim();
  const trailing = afterName.match(
    new RegExp(String.raw`^${UCAPITAL_NUM}\s+(${UCAPITAL_NUM})(?:\s|$)`),
  );
  const unrealisedPnl = trailing ? parseNumeric(trailing[1]) : undefined;

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

/** Fallback when PDF table extraction fails (common on some U-Capital exports). */
export function parseUCapitalTextLines(text: string): ParsedHolding[] {
  const holdings: ParsedHolding[] = [];
  for (const line of coalesceUCapitalTextLines(text)) {
    const holding = parseUCapitalTextLine(line);
    if (holding) holdings.push(holding);
  }
  return dedupeHoldings(holdings);
}

export function parseUCapitalReport(
  text: string,
  tableRows: unknown[][],
  fileName: string,
): ParseReportResult {
  const tableHoldings = parseUCapitalTableRows(tableRows);
  const textHoldings = tableHoldings.length === 0 ? parseUCapitalTextLines(text) : [];
  const holdings = tableHoldings.length > 0 ? tableHoldings : textHoldings;
  const warnings: string[] = [];

  if (holdings.length === 0) {
    warnings.push(
      "U-Capital statement detected but no holdings rows were parsed. Verify the PDF is a Statement of Holdings export.",
    );
  } else {
    if (tableHoldings.length === 0) {
      warnings.push(
        "Holdings were inferred from U-Capital PDF text because table extraction failed. Verify quantities and values against your statement.",
      );
    }
    const known = holdings.filter((holding) => KNOWN_MSX_SYMBOLS.has(holding.symbol)).length;
    if (known === 0) {
      warnings.push(
        `Parsed ${holdings.length} U-Capital holdings but none matched known MSX tickers. Verify symbols against the statement.`,
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
