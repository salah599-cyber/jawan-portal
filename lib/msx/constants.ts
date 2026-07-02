/** Common MSX-listed symbols for validation hints (not exhaustive). */
export const KNOWN_MSX_SYMBOLS = new Set([
  "ABOB", "ABRJ", "AFIC", "AHIC", "ALAN", "AMAT", "ASCO", "ATMI", "BAHW", "BARK",
  "BKMB", "BKNZ", "BLSH", "BMUS", "BOB", "BORG", "BRK", "CAPI", "DHOF", "DIDI",
  "DUQM", "GICO", "GOLF", "GULF", "IFIN", "INVH", "MASM", "MEDC", "MENA", "MKON",
  "MPCS", "MREN", "MSPW", "MSTI", "MTHL", "NBOB", "NCC", "NCT", "NFC", "NFOB",
  "NHGI", "NOMC", "OAB", "OABR", "OABT", "OAS", "OBC", "OCCI", "OCHL", "OCT",
  "OETC", "OFIC", "OHI", "OIFC", "OIH", "OILS", "OMAN", "OMCI", "OMKT", "OMRE",
  "OQGN", "ORDS", "ORIC", "OTEL", "PHAR", "REEM", "RFOB", "ROPI", "SAB", "SABP",
  "SAOG", "SAOL", "SHRQ", "SMUK", "SOHR", "SUKK", "TAKA", "TAWA", "TRC", "UBOB",
  "UNIC", "VOLT", "WATY", "ZAIN",
]);

export const MSX_SYMBOL_PATTERN = /^[A-Z]{2,6}$/;

export const BROKER_SIGNATURES: Array<{ broker: string; patterns: RegExp[] }> = [
  { broker: "Bank Muscat", patterns: [/bank\s*muscat/i, /\bbmus\b/i] },
  { broker: "Oman Arab Bank Securities", patterns: [/oman\s*arab\s*bank/i, /\boabs\b/i] },
  { broker: "National Bank of Oman", patterns: [/national\s*bank\s*of\s*oman/i, /\bnbo\s*securities/i] },
  { broker: "Ahli Bank", patterns: [/ahli\s*bank/i, /\bahlibank/i] },
  { broker: "Muscat Capital", patterns: [/muscat\s*capital/i] },
  { broker: "Ominvest", patterns: [/\bominvest\b/i] },
  { broker: "United Securities", patterns: [/united\s*securities/i] },
  { broker: "Gulf Securities", patterns: [/gulf\s*securities/i] },
  { broker: "Bank Dhofar", patterns: [/bank\s*dhofar/i, /\bdhofar\s*securities/i] },
  { broker: "MCD", patterns: [/muscat\s*clearing/i, /\bmcd\b/i, /muscat\s*depository/i] },
  { broker: "Sohar International", patterns: [/sohar\s*international/i] },
];

export const MSX_PORTFOLIO_ASSET_NAME = "MSX Portfolio";

export const COLUMN_ALIASES: Record<string, string[]> = {
  symbol: ["symbol", "ticker", "code", "security code", "stock code", "scrip", "isin"],
  name: ["name", "security", "company", "description", "security name", "stock name", "instrument"],
  quantity: ["quantity", "qty", "shares", "units", "holding", "balance", "no of shares", "no. of shares"],
  costBasis: ["cost", "cost basis", "average cost", "avg cost", "book value", "total cost", "invested"],
  marketPrice: ["price", "market price", "last price", "closing price", "unit price", "current price"],
  marketValue: ["market value", "value", "current value", "total value", "portfolio value", "amount"],
  unrealisedPnl: ["pnl", "profit", "loss", "unrealised", "unrealized", "gain", "gain/loss", "profit/loss"],
};
