import type { PublicMarket } from "@/lib/generated/prisma/client";
import { aoaToExcelBuffer, multiSheetAoaToExcelBuffer } from "@/lib/spreadsheet/excel-export";

const EQUITY_HEADERS = [
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

const EQUITY_COLUMN_WIDTHS = [10, 32, 10, 12, 12, 14, 14, 14, 10, 10, 10];

const OPTION_HEADERS = [
  "Underlying Symbol",
  "Option Type",
  "Strike Price",
  "Expiry Date",
  "Contracts",
  "Contract Multiplier",
  "Premium Paid",
  "Market Price",
  "Market Value",
  "Unrealised P&L",
  "Broker",
  "Account",
  "As Of Date",
] as const;

const OPTION_COLUMN_WIDTHS = [16, 12, 12, 12, 10, 16, 14, 12, 14, 14, 16, 14, 12];

type TemplateMarket = Extract<PublicMarket, "MSX" | "USA">;

type EquityTemplateConfig = {
  fileName: string;
  title: string;
  currency: string;
  symbolGuide: string;
  sampleHoldings: (string | number)[][];
};

const EQUITY_TEMPLATE_CONFIG: Record<TemplateMarket, EquityTemplateConfig> = {
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

const OMAN_STOCKS_SAMPLE = EQUITY_TEMPLATE_CONFIG.MSX.sampleHoldings;
const US_STOCKS_SAMPLE = EQUITY_TEMPLATE_CONFIG.USA.sampleHoldings;

const OPTIONS_SAMPLE: (string | number)[][] = [
  ["AAPL", "CALL", 200, "2026-06-19", 5, 100, 2500, 4.25, 2125, -375, "Interactive Brokers", "", "2026-07-18"],
  ["SPY", "PUT", 480, "2026-09-18", 2, 100, 1800, 6.1, 1220, -580, "Schwab", "", "2026-07-18"],
  ["MSFT", "CALL", 450, "2026-12-18", 3, 100, 4200, 8.75, 2625, -1575, "Fidelity", "", "2026-07-18"],
];

function buildEquitySheetRows(config: {
  title: string;
  currency: string;
  symbolGuide: string;
  uploadNote: string;
  sampleHoldings: (string | number)[][];
}): (string | number)[][] {
  return [
    [config.title],
    [config.uploadNote],
    [`Symbol format: ${config.symbolGuide}. Amounts are in ${config.currency}.`],
    [],
    [...EQUITY_HEADERS],
    ...config.sampleHoldings,
  ];
}

function buildOptionsSheetRows(): (string | number)[][] {
  return [
    ["Options Upload Template"],
    [
      "Fill in your option positions below. Underlying Symbol, Option Type, Strike Price, Expiry Date, and Contracts are required.",
    ],
    ["Option Type must be CALL or PUT. Amounts are in USD. Use manual entry in the portal for options after preparing this sheet."],
    [],
    [...OPTION_HEADERS],
    ...OPTIONS_SAMPLE,
  ];
}

export function isUploadTemplateMarket(market: string): market is TemplateMarket {
  return market === "MSX" || market === "USA";
}

export async function buildUploadTemplateBuffer(
  market: TemplateMarket,
): Promise<{ buffer: Buffer; fileName: string }> {
  const config = EQUITY_TEMPLATE_CONFIG[market];
  const buffer = await aoaToExcelBuffer(
    "Holdings",
    buildEquitySheetRows({
      title: config.title,
      currency: config.currency,
      symbolGuide: config.symbolGuide,
      uploadNote:
        "Fill in your holdings below. Symbol and Quantity are required. Delete the sample rows or replace them.",
      sampleHoldings: config.sampleHoldings,
    }),
  );

  return {
    buffer,
    fileName: config.fileName,
  };
}

export async function buildPortfolioUploadTemplateBuffer(): Promise<{
  buffer: Buffer;
  fileName: string;
}> {
  const buffer = await multiSheetAoaToExcelBuffer([
    {
      name: "Oman Stocks",
      columnWidths: EQUITY_COLUMN_WIDTHS,
      rows: buildEquitySheetRows({
        title: "Oman Stocks (MSX)",
        currency: "OMR",
        symbolGuide: "2-6 letter codes (e.g. BKMB, OQGN)",
        uploadNote:
          "Muscat Stock Exchange equities. Symbol and Quantity are required. Upload this sheet via Portfolio → Public Markets → MSX.",
        sampleHoldings: OMAN_STOCKS_SAMPLE,
      }),
    },
    {
      name: "US Stocks",
      columnWidths: EQUITY_COLUMN_WIDTHS,
      rows: buildEquitySheetRows({
        title: "US Stocks",
        currency: "USD",
        symbolGuide: "1-5 letter tickers (e.g. AAPL, MSFT, BRK.B)",
        uploadNote:
          "US listed equities. Symbol and Quantity are required. Upload this sheet via Portfolio → Public Markets → USA.",
        sampleHoldings: US_STOCKS_SAMPLE,
      }),
    },
    {
      name: "Options",
      columnWidths: OPTION_COLUMN_WIDTHS,
      rows: buildOptionsSheetRows(),
    },
  ]);

  return {
    buffer,
    fileName: "portfolio-upload-template.xlsx",
  };
}
