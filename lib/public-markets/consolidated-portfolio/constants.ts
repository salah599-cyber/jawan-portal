export const CONSOLIDATED_SHEET_NAMES = {
  US_STOCKS: "US Stocks",
  OPTIONS: "Options",
  BONDS: "Bonds",
  STRUCTURED_NOTES: "Structured Notes",
  INTL_STOCKS: "Intl Stocks (Non-US, Non-Oman)",
  OTHER_ASSETS: "Other Assets (Funds&Commod.)",
  CASH_BALANCES: "Cash Balances",
} as const;

export const CONSOLIDATED_SHEET_SIGNATURE = CONSOLIDATED_SHEET_NAMES.US_STOCKS;

export type ConsolidatedBrokerKey = "safra" | "kristal-k18518750" | "kristal-k15875750";

export const CONSOLIDATED_BROKER_CONFIG: Record<
  ConsolidatedBrokerKey,
  { label: string; broker: string; accountNumber: string; asOfDate: string }
> = {
  safra: {
    label: "J. Safra Sarasin",
    broker: "Banque J. Safra Sarasin SA",
    accountNumber: "6.36158.5 6000",
    asOfDate: "2026-07-17",
  },
  "kristal-k18518750": {
    label: "Kristal K18518750",
    broker: "Kristal",
    accountNumber: "K18518750",
    asOfDate: "2026-06-30",
  },
  "kristal-k15875750": {
    label: "Kristal K15875750",
    broker: "Kristal",
    accountNumber: "K15875750",
    asOfDate: "2026-06-30",
  },
};

export function resolveUsStockBrokerKey(name: string, symbol: string): ConsolidatedBrokerKey {
  const text = `${name} ${symbol}`.toLowerCase();
  if (text.includes("k15875750")) return "kristal-k15875750";
  if (text.includes("k18518750") || text.includes("(kristal")) return "kristal-k18518750";
  return "safra";
}

export function intlStockMarketFromExchange(exchange: string): "HONG_KONG" | "UK" | "OTHER" {
  const normalized = exchange.toLowerCase();
  if (normalized.includes("hong kong") || normalized.includes("hkex")) return "HONG_KONG";
  if (normalized.includes("london") || normalized.includes("lse")) return "UK";
  return "OTHER";
}
