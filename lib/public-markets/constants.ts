import type { PublicMarket } from "@/lib/generated/prisma/client";

export type PublicMarketSlug =
  | "MSX"
  | "USA"
  | "HK"
  | "CN"
  | "IN"
  | "UK"
  | "OTHER"
  | "ALL";

export type MarketConfig = {
  market: PublicMarket;
  slug: PublicMarketSlug;
  label: string;
  shortLabel: string;
  assetName: string;
  currency: string;
  country: string;
  exchange?: string;
  description: string;
  marketDataUrl?: string;
};

export const MSX_PORTFOLIO_ASSET_NAME = "MSX Portfolio";

export const PUBLIC_MARKET_ORDER: PublicMarket[] = [
  "MSX",
  "USA",
  "HONG_KONG",
  "CHINA",
  "INDIA",
  "UK",
  "OTHER",
];

export const MARKET_CONFIG: Record<PublicMarket, MarketConfig> = {
  MSX: {
    market: "MSX",
    slug: "MSX",
    label: "Muscat Stock Exchange",
    shortLabel: "MSX",
    assetName: MSX_PORTFOLIO_ASSET_NAME,
    currency: "OMR",
    country: "Oman",
    exchange: "MSX",
    description: "Oman listed equities via local brokerage statements.",
    marketDataUrl: "https://www.msx.om",
  },
  USA: {
    market: "USA",
    slug: "USA",
    label: "United States",
    shortLabel: "USA",
    assetName: "Public Markets — USA",
    currency: "USD",
    country: "United States",
    exchange: "NYSE/NASDAQ",
    description: "US listed equities from Schwab, Interactive Brokers, and other brokers.",
  },
  HONG_KONG: {
    market: "HONG_KONG",
    slug: "HK",
    label: "Hong Kong",
    shortLabel: "Hong Kong",
    assetName: "Public Markets — Hong Kong",
    currency: "HKD",
    country: "Hong Kong",
    exchange: "HKEX",
    description: "Hong Kong listed equities from local and international brokers.",
  },
  CHINA: {
    market: "CHINA",
    slug: "CN",
    label: "China",
    shortLabel: "China",
    assetName: "Public Markets — China",
    currency: "CNY",
    country: "China",
    exchange: "SSE/SZSE",
    description: "Mainland China A-shares and connect program holdings.",
  },
  INDIA: {
    market: "INDIA",
    slug: "IN",
    label: "India",
    shortLabel: "India",
    assetName: "Public Markets — India",
    currency: "INR",
    country: "India",
    exchange: "NSE/BSE",
    description: "Indian listed equities from Indian brokers and custodians.",
  },
  UK: {
    market: "UK",
    slug: "UK",
    label: "United Kingdom",
    shortLabel: "UK",
    assetName: "Public Markets — UK",
    currency: "GBP",
    country: "United Kingdom",
    exchange: "LSE",
    description: "UK listed equities from Hargreaves Lansdown, Interactive Brokers, and others.",
  },
  OTHER: {
    market: "OTHER",
    slug: "OTHER",
    label: "Other Markets",
    shortLabel: "Other",
    assetName: "Public Markets — Other",
    currency: "USD",
    country: "International",
    description: "Holdings in other exchanges not covered above.",
  },
};

const SLUG_TO_MARKET: Record<PublicMarketSlug, PublicMarket | null> = {
  MSX: "MSX",
  USA: "USA",
  HK: "HONG_KONG",
  CN: "CHINA",
  IN: "INDIA",
  UK: "UK",
  OTHER: "OTHER",
  ALL: null,
};

export function marketFromSlug(slug?: string | null): PublicMarket | null {
  if (!slug) return "MSX";
  const normalized = slug.toUpperCase() as PublicMarketSlug;
  return SLUG_TO_MARKET[normalized] ?? null;
}

export function slugFromMarket(market: PublicMarket): PublicMarketSlug {
  return MARKET_CONFIG[market].slug;
}

export function isAllMarketsSlug(slug?: string | null): boolean {
  return slug?.toUpperCase() === "ALL";
}

export const COLUMN_ALIASES: Record<string, string[]> = {
  symbol: [
    "symbol",
    "ticker",
    "code",
    "security code",
    "stock code",
    "scrip",
    "isin",
    "stock",
    "share code",
    "security id",
    "instrument code",
    "company code",
    "msx code",
    "sedol",
    "cusip",
  ],
  name: [
    "name",
    "security",
    "company",
    "description",
    "security name",
    "stock name",
    "instrument",
    "company name",
    "stock description",
    "security description",
  ],
  quantity: [
    "quantity",
    "qty",
    "shares",
    "units",
    "holding",
    "balance",
    "no of shares",
    "no. of shares",
    "number of shares",
    "share balance",
    "holdings",
    "qty held",
    "shares held",
    "share qty",
    "available qty",
    "available quantity",
  ],
  costBasis: [
    "cost",
    "cost basis",
    "average cost",
    "avg cost",
    "book value",
    "total cost",
    "invested",
    "avg price",
    "average price",
    "cost price",
    "purchase price",
    "book cost",
  ],
  marketPrice: [
    "price",
    "market price",
    "last price",
    "closing price",
    "unit price",
    "current price",
    "mkt price",
    "mkt. price",
    "last traded",
    "ltp",
    "close",
  ],
  marketValue: [
    "market value",
    "value",
    "current value",
    "total value",
    "portfolio value",
    "amount",
    "mkt value",
    "mkt. value",
    "total market",
    "holding value",
    "position value",
  ],
  unrealisedPnl: [
    "pnl",
    "profit",
    "loss",
    "unrealised",
    "unrealized",
    "gain",
    "gain/loss",
    "profit/loss",
    "p&l",
    "unrealised pnl",
    "unrealized pnl",
    "gain loss",
  ],
  isin: ["isin"],
  cusip: ["cusip"],
  sedol: ["sedol"],
  exchange: ["exchange", "market", "listing"],
};

export const PUBLIC_MARKETS_PATH = "/portfolio/public-markets";
