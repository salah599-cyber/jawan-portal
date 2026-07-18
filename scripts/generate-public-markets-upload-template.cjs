/**
 * Generates sample Excel files for Public Markets brokerage upload.
 * Usage:
 *   node scripts/generate-public-markets-upload-template.cjs [market] [outputPath]
 *   node scripts/generate-public-markets-upload-template.cjs --all
 *
 * Markets: MSX, USA (default: MSX)
 */
const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

const TEMPLATES_DIR = path.join(__dirname, "..", "public", "templates");

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
];

const HOLDINGS_COL_WIDTHS = [
  { wch: 10 },
  { wch: 32 },
  { wch: 10 },
  { wch: 12 },
  { wch: 12 },
  { wch: 14 },
  { wch: 14 },
  { wch: 14 },
  { wch: 10 },
  { wch: 10 },
  { wch: 10 },
];

const MARKET_TEMPLATES = {
  MSX: {
    fileName: "msx-upload-template.xlsx",
    title: "MSX — Brokerage Upload Template",
    marketLabel: "Muscat Stock Exchange (MSX)",
    currency: "OMR",
    uploadPath: "Portfolio → MSX → Import Brokerage Reports",
    acceptedFormats: "PDF and Excel (.xlsx, .xls)",
    symbolGuide: "2–6 letter codes (e.g. BKMB, OQGN)",
    sampleHoldings: [
      ["BKMB", "Bank Muscat SAOG", 5000, 4250, 0.92, 4600, 350, "", "", "", "MSX"],
      ["OQGN", "OQ Exploration & Production", 10000, 1200, 0.135, 1350, 150, "", "", "", "MSX"],
      ["GULF", "Gulf Investment House", 2500, 187.5, 0.082, 205, 17.5, "", "", "", "MSX"],
      ["NBOB", "National Bank of Oman", 3000, 900, 0.315, 945, 45, "", "", "", "MSX"],
      ["ZAIN", "Oman Telecommunications", 8000, 640, 0.085, 680, 40, "", "", "", "MSX"],
    ],
    notes: [
      "• Delete the sample rows before uploading your real portfolio, or replace them.",
      "• Broker exports with different column names (Ticker, Shares, LTP, etc.) are also supported.",
      "• MSX accepts PDF and Excel; you can also upload native broker statements directly.",
      "• Closing prices sync automatically from msx.om after market close (Sun–Thu).",
    ],
  },
  USA: {
    fileName: "usa-upload-template.xlsx",
    title: "USA — Brokerage Upload Template",
    marketLabel: "United States (NYSE / NASDAQ)",
    currency: "USD",
    uploadPath: "Portfolio → Public Markets → USA → Import Brokerage Reports",
    acceptedFormats: "Excel (.xlsx, .xls) and CSV",
    symbolGuide: "1–5 letter tickers (e.g. AAPL, MSFT, BRK.B)",
    sampleHoldings: [
      ["AAPL", "Apple Inc.", 100, 15000, 195.5, 19550, 4550, "US0378331005", "037833100", "", "NASDAQ"],
      ["MSFT", "Microsoft Corporation", 50, 18000, 420.25, 21012.5, 3012.5, "US5949181045", "594918104", "", "NASDAQ"],
      ["GOOGL", "Alphabet Inc. Class A", 75, 10500, 175.8, 13185, 2685, "US02079K3059", "02079K305", "", "NASDAQ"],
      ["BRK.B", "Berkshire Hathaway Inc. Class B", 25, 9000, 410.0, 10250, 1250, "US0846707026", "084670702", "", "NYSE"],
      ["VOO", "Vanguard S&P 500 ETF", 30, 12000, 485.75, 14572.5, 2572.5, "US9229083632", "922908363", "", "NYSE"],
    ],
    notes: [
      "• Delete the sample rows before uploading your real portfolio, or replace them.",
      "• Broker exports from Schwab, Interactive Brokers, Fidelity, etc. are also supported.",
      "• Use class suffixes for share classes (e.g. BRK.B, GOOGL).",
      "• CUSIP is optional but helps identify securities when symbols differ by broker.",
    ],
  },
};

function buildInstructions(config) {
  return [
    [config.title],
    [""],
    ["How to use"],
    ["1. Fill the Holdings sheet with your positions (Symbol and Quantity are required)."],
    [`2. Save as .xlsx and upload via ${config.uploadPath}.`],
    ["3. Select the entity that owns these holdings before uploading."],
    [""],
    ["Column guide"],
    ["Symbol", `Ticker code — ${config.symbolGuide}`],
    ["Name", "Security name (optional)"],
    ["Quantity", "Number of shares/units held (required)"],
    ["Cost Basis", `Total purchase cost for the position (${config.currency})`],
    ["Market Price", `Latest price per share (${config.currency})`],
    ["Market Value", `Current position value (${config.currency})`],
    ["Unrealised P&L", "Gain or loss vs cost basis"],
    ["ISIN / CUSIP / SEDOL", "Security identifiers when available"],
    ["Exchange", "Listing exchange (optional; defaults to NYSE/NASDAQ for USA)"],
    [""],
    ["Accepted file formats"],
    [config.acceptedFormats],
    [""],
    ["Notes"],
    ...config.notes.map((note) => [note]),
  ];
}

function buildWorkbook(config) {
  const workbook = XLSX.utils.book_new();

  const holdingsSheet = XLSX.utils.aoa_to_sheet([HOLDINGS_HEADERS, ...config.sampleHoldings]);
  holdingsSheet["!cols"] = HOLDINGS_COL_WIDTHS;
  XLSX.utils.book_append_sheet(workbook, holdingsSheet, "Holdings");

  const instructionsSheet = XLSX.utils.aoa_to_sheet(buildInstructions(config));
  instructionsSheet["!cols"] = [{ wch: 22 }, { wch: 72 }];
  XLSX.utils.book_append_sheet(workbook, instructionsSheet, "Instructions");

  return workbook;
}

function writeTemplate(market, outputPath) {
  const config = MARKET_TEMPLATES[market];
  if (!config) {
    throw new Error(`Unknown market "${market}". Supported: ${Object.keys(MARKET_TEMPLATES).join(", ")}`);
  }

  const resolvedPath = path.resolve(outputPath || path.join(TEMPLATES_DIR, config.fileName));
  fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });

  const workbook = buildWorkbook(config);
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  fs.writeFileSync(resolvedPath, buffer);

  console.log(`Created: ${resolvedPath}`);
}

function main() {
  const args = process.argv.slice(2);

  if (args.includes("--all")) {
    for (const market of Object.keys(MARKET_TEMPLATES)) {
      writeTemplate(market);
    }
    return;
  }

  const market = (args[0] || "MSX").toUpperCase();
  const outputPath = args[1];
  writeTemplate(market, outputPath);
}

main();
