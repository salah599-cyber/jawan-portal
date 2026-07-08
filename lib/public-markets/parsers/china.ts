import type { BrokerSignature } from "@/lib/public-markets/parsers/common";

export const CHINA_BROKER_SIGNATURES: BrokerSignature[] = [
  { broker: "CITIC Securities", patterns: [/citic\s*securities/i, /中信/i] },
  { broker: "Huatai Securities", patterns: [/huatai/i, /华泰/i] },
  { broker: "GF Securities", patterns: [/gf\s*securities/i, /广发/i] },
  { broker: "Interactive Brokers", patterns: [/interactive\s*brokers/i, /\bibkr\b/i] },
  { broker: "Futu", patterns: [/\bfutu\b/i, /\bmoomoo\b/i] },
  { broker: "Tiger Brokers", patterns: [/tiger\s*brokers/i] },
  { broker: "Stock Connect", patterns: [/stock\s*connect/i, /沪港通/i, /深港通/i] },
];
