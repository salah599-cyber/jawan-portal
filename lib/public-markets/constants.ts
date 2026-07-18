import type { PublicInstrumentType, PublicMarket } from "@/lib/generated/prisma/client";

export type PublicMarketSlug =
  | "MSX"
  | "AE"
  | "SA"
  | "KW"
  | "BH"
  | "QA"
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

export const PUBLIC_MARKET_UPLOAD_TEMPLATES: Partial<Record<PublicMarket, string>> = {
  MSX: "/templates/msx-upload-template.xlsx",
  USA: "/templates/usa-upload-template.xlsx",
};

export const PUBLIC_MARKET_ORDER: PublicMarket[] = [
  "MSX",
  "UAE",
  "SAUDI_ARABIA",
  "KUWAIT",
  "BAHRAIN",
  "QATAR",
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
  UAE: {
    market: "UAE",
    slug: "AE",
    label: "United Arab Emirates",
    shortLabel: "UAE",
    assetName: "Public Markets — UAE",
    currency: "AED",
    country: "United Arab Emirates",
    exchange: "DFM/ADX",
    description: "UAE listed equities from Dubai (DFM) and Abu Dhabi (ADX). Yahoo live prices cover DFM only.",
    marketDataUrl: "https://www.dfm.ae",
  },
  SAUDI_ARABIA: {
    market: "SAUDI_ARABIA",
    slug: "SA",
    label: "Saudi Arabia",
    shortLabel: "Saudi",
    assetName: "Public Markets — Saudi Arabia",
    currency: "SAR",
    country: "Saudi Arabia",
    exchange: "Tadawul",
    description: "Saudi listed equities from Tadawul with Yahoo live price refresh.",
    marketDataUrl: "https://www.saudiexchange.sa",
  },
  KUWAIT: {
    market: "KUWAIT",
    slug: "KW",
    label: "Kuwait",
    shortLabel: "Kuwait",
    assetName: "Public Markets — Kuwait",
    currency: "KWD",
    country: "Kuwait",
    exchange: "Boursa Kuwait",
    description: "Kuwait listed equities from Boursa Kuwait with Yahoo live price refresh.",
    marketDataUrl: "https://www.boursakuwait.com.kw",
  },
  BAHRAIN: {
    market: "BAHRAIN",
    slug: "BH",
    label: "Bahrain",
    shortLabel: "Bahrain",
    assetName: "Public Markets — Bahrain",
    currency: "BHD",
    country: "Bahrain",
    exchange: "Bahrain Bourse",
    description: "Bahrain listed equities via broker imports. Yahoo live prices are not available.",
    marketDataUrl: "https://www.bahrainbourse.com",
  },
  QATAR: {
    market: "QATAR",
    slug: "QA",
    label: "Qatar",
    shortLabel: "Qatar",
    assetName: "Public Markets — Qatar",
    currency: "QAR",
    country: "Qatar",
    exchange: "QSE",
    description: "Qatar listed equities from Qatar Stock Exchange with partial Yahoo live price coverage.",
    marketDataUrl: "https://www.qe.com.qa",
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
  AE: "UAE",
  SA: "SAUDI_ARABIA",
  KW: "KUWAIT",
  BH: "BAHRAIN",
  QA: "QATAR",
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

export function getMarketPricingNote(market: PublicMarket): string | null {
  switch (market) {
    case "MSX":
      return "Yahoo live prices are not available for MSX. Closing prices sync automatically from msx.om after market close (Sun–Thu); you can also refresh manually or import broker statements.";
    case "UAE":
      return "Yahoo live prices cover Dubai (DFM) listings. DFM closing prices also sync from dfm.ae after market close. Abu Dhabi (ADX) holdings require broker imports or manual prices.";
    case "BAHRAIN":
      return "Live Yahoo prices are not available for Bahrain-listed stocks; use broker imports or manual prices.";
    default:
      return null;
  }
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

export type PublicInstrumentSlug = "equity" | "options" | "structured-notes" | "crypto" | "all";

export const PUBLIC_INSTRUMENT_SLUGS: PublicInstrumentSlug[] = [
  "equity",
  "options",
  "structured-notes",
  "crypto",
];

export function instrumentTypeFromSlug(slug: PublicInstrumentSlug): PublicInstrumentType | null {
  switch (slug) {
    case "equity":
      return "EQUITY";
    case "options":
      return "OPTION";
    case "structured-notes":
      return "STRUCTURED_NOTE";
    case "crypto":
      return "CRYPTO";
    default:
      return null;
  }
}

export function resolveInstrumentFromSearchParam(param?: string | null): {
  slug: PublicInstrumentSlug;
  instrumentType: PublicInstrumentType | null;
} {
  const normalized = param?.trim().toLowerCase();
  if (normalized === "options") {
    return { slug: "options", instrumentType: "OPTION" };
  }
  if (normalized === "structured-notes" || normalized === "structured_notes") {
    return { slug: "structured-notes", instrumentType: "STRUCTURED_NOTE" };
  }
  if (normalized === "crypto") {
    return { slug: "crypto", instrumentType: "CRYPTO" };
  }
  if (normalized === "all") {
    return { slug: "all", instrumentType: null };
  }
  return { slug: "equity", instrumentType: "EQUITY" };
}
