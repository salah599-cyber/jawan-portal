import type { BrokerSignature } from "@/lib/public-markets/parsers/common";

export const UK_BROKER_SIGNATURES: BrokerSignature[] = [
  { broker: "Hargreaves Lansdown", patterns: [/hargreaves\s*lansdown/i, /\bhl\b/i] },
  { broker: "Interactive Brokers", patterns: [/interactive\s*brokers/i, /\bibkr\b/i] },
  { broker: "AJ Bell", patterns: [/aj\s*bell/i] },
  { broker: "Barclays Smart Investor", patterns: [/barclays\s*smart/i] },
  { broker: "Freetrade", patterns: [/\bfreetrade\b/i] },
  { broker: "Trading 212", patterns: [/trading\s*212/i] },
  { broker: "IG", patterns: [/\big\s*group\b/i, /\big\s*markets\b/i] },
];
