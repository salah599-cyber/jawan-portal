import type { BrokerSignature } from "@/lib/public-markets/parsers/common";

export const US_BROKER_SIGNATURES: BrokerSignature[] = [
  { broker: "Charles Schwab", patterns: [/charles\s*schwab/i, /\bschwab\b/i] },
  { broker: "Interactive Brokers", patterns: [/interactive\s*brokers/i, /\bibkr\b/i] },
  { broker: "Fidelity", patterns: [/\bfidelity\b/i] },
  { broker: "TD Ameritrade", patterns: [/td\s*ameritrade/i, /\btda\b/i] },
  { broker: "E*TRADE", patterns: [/e\s*\*?\s*trade/i] },
  { broker: "Merrill Lynch", patterns: [/merrill\s*lynch/i, /\bbofa\s*securities/i] },
  { broker: "Vanguard", patterns: [/\bvanguard\b/i] },
  { broker: "Robinhood", patterns: [/\brobinhood\b/i] },
];
