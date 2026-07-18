import type { PublicMarket } from "@/lib/generated/prisma/client";
import { aoaToExcelBuffer } from "@/lib/spreadsheet/excel-export";

const HOLDINGS_HEADERS = [
  "Symbol",
  "Name",
  "Quantity",
  "Cost Basis",
  "Market Price",
  "Market Value",
  "Unrealised P&L",
  "ISIN",
  "CUSIP",
  "SEDOL",
  "Exchange",
] as const;

type TemplateMarket = Extract<PublicMarket, "MSX" | "USA">;

type TemplateConfig = {
  fileName: string;
  title: string;
  currency: string;
  symbolGuide: string;
  sampleHoldings: (string | number)[][];
};

const TEMPLATE_CONFIG: Record<TemplateMarket, TemplateConfig> = {
  MSX: {
    fileName: "msx-upload-template.xlsx",
    title: "MSX Brokerage Upload Template",
    currency: "OMR",
    symbolGuide: "2-6 letter codes (e.g. BKMB, OQGN)",
    sampleHoldings: [
      ["BKMB", "Bank Muscat SAOG", 5000, 4250, 0.92, 4600, 350, "", "", "", "MSX"],
      ["OQGN", "OQ Exploration & Production", 10000, 1200, 0.135, 1350, 150, "", "", "", "MSX"],
      ["GULF", "Gulf Investment House", 2500, 187.5, 0.082, 205, 17.5, "", "", "", "MSX"],
      ["NBOB", "National Bank of Oman", 3000, 900, 0.315, 945, 45, "", "", "", "MSX"],
      ["ZAIN", "Oman Telecommunications", 8000, 640, 0.085, 680, 40, "", "", "", "MSX"],
    ],
  },
  USA: {
    fileName: "usa-upload-template.xlsx",
    title: "USA Brokerage Upload Template",
    currency: "USD",
    symbolGuide: "1-5 letter tickers (e.g. AAPL, MSFT, BRK.B)",
    sampleHoldings: [
      ["AAPL", "Apple Inc.", 100, 15000, 195.5, 19550, 4550, "US0378331005", "037833100", "", "NASDAQ"],
      ["MSFT", "Microsoft Corporation", 50, 18000, 420.25, 21012.5, 3012.5, "US5949181045", "594918104", "", "NASDAQ"],
      ["GOOGL", "Alphabet Inc. Class A", 75, 10500, 175.8, 13185, 2685, "US02079K3059", "02079K305", "", "NASDAQ"],
      ["BRK.B", "Berkshire Hathaway Inc. Class B", 25, 9000, 410.0, 10250, 1250, "US0846707026", "084670702", "", "NYSE"],
      ["VOO", "Vanguard S&P 500 ETF", 30, 12000, 485.75, 14572.5, 2572.5, "US9229083632", "922908363", "", "NYSE"],
    ],
  },
};

function buildHoldingsRows(config: TemplateConfig): (string | number)[][] {
  return [
    [config.title],
    ["Fill in your holdings below. Symbol and Quantity are required. Delete the sample rows or replace them."],
    [`Symbol format: ${config.symbolGuide}. Amounts are in ${config.currency}.`],
    [],
    [...HOLDINGS_HEADERS],
    ...config.sampleHoldings,
  ];
}

export function isUploadTemplateMarket(market: string): market is TemplateMarket {
  return market === "MSX" || market === "USA";
}

export async function buildUploadTemplateBuffer(
  market: TemplateMarket,
): Promise<{ buffer: Buffer; fileName: string }> {
  const config = TEMPLATE_CONFIG[market];
  const buffer = await aoaToExcelBuffer("Holdings", buildHoldingsRows(config));

  return {
    buffer,
    fileName: config.fileName,
  };
}
