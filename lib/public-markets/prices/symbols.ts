import type { PublicMarket } from "@/lib/generated/prisma/client";

export type YahooSymbolInput = {
  market: PublicMarket;
  symbol: string;
  exchange?: string | null;
};

const YAHOO_SUPPORTED_MARKETS: PublicMarket[] = [
  "USA",
  "HONG_KONG",
  "CHINA",
  "INDIA",
  "UK",
  "OTHER",
  "SAUDI_ARABIA",
  "UAE",
  "KUWAIT",
  "QATAR",
];

export function isYahooPriceSupported(market: PublicMarket): boolean {
  return YAHOO_SUPPORTED_MARKETS.includes(market);
}

function padHongKongSymbol(symbol: string): string {
  if (/^\d+$/.test(symbol)) {
    return symbol.padStart(4, "0");
  }
  return symbol;
}

function chinaSuffix(symbol: string, exchange?: string | null): string {
  const normalizedExchange = exchange?.toUpperCase() ?? "";
  if (normalizedExchange.includes("SZ") || normalizedExchange.includes("SHENZHEN")) {
    return ".SZ";
  }
  if (normalizedExchange.includes("SS") || normalizedExchange.includes("SHANGHAI")) {
    return ".SS";
  }
  if (symbol.startsWith("6")) return ".SS";
  if (symbol.startsWith("0") || symbol.startsWith("3")) return ".SZ";
  return ".SS";
}

function indiaSuffix(exchange?: string | null): string {
  const normalizedExchange = exchange?.toUpperCase() ?? "";
  if (normalizedExchange.includes("BSE") || normalizedExchange.includes("BOM")) {
    return ".BO";
  }
  return ".NS";
}

function isUaeAdxExchange(exchange?: string | null): boolean {
  const normalizedExchange = exchange?.toUpperCase() ?? "";
  return (
    normalizedExchange.includes("ADX") ||
    normalizedExchange.includes("ABU DHABI") ||
    normalizedExchange.includes("ABUDHABI")
  );
}

export function toYahooSymbol({ market, symbol, exchange }: YahooSymbolInput): string | null {
  if (!isYahooPriceSupported(market)) return null;

  const cleaned = symbol.trim().toUpperCase();
  if (!cleaned) return null;

  if (cleaned.includes(".")) {
    return cleaned;
  }

  switch (market) {
    case "USA":
      return cleaned;
    case "UK":
      return `${cleaned}.L`;
    case "HONG_KONG":
      return `${padHongKongSymbol(cleaned)}.HK`;
    case "CHINA":
      return `${cleaned}${chinaSuffix(cleaned, exchange)}`;
    case "INDIA":
      return `${cleaned}${indiaSuffix(exchange)}`;
    case "SAUDI_ARABIA":
      return `${cleaned}.SR`;
    case "UAE":
      if (isUaeAdxExchange(exchange)) return null;
      return `${cleaned}.AE`;
    case "KUWAIT":
      return `${cleaned}.KW`;
    case "QATAR":
      return `${cleaned}.QA`;
    case "OTHER":
      return cleaned;
    default:
      return null;
  }
}
