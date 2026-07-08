import type { BrokerSignature } from "@/lib/public-markets/parsers/common";

export const INDIA_BROKER_SIGNATURES: BrokerSignature[] = [
  { broker: "Zerodha", patterns: [/\bzerodha\b/i, /\bkite\b/i] },
  { broker: "ICICI Direct", patterns: [/icici\s*direct/i] },
  { broker: "HDFC Securities", patterns: [/hdfc\s*securities/i] },
  { broker: "Kotak Securities", patterns: [/kotak\s*securities/i] },
  { broker: "Angel One", patterns: [/angel\s*one/i, /\bangel\s*broking/i] },
  { broker: "Groww", patterns: [/\bgroww\b/i] },
  { broker: "Interactive Brokers", patterns: [/interactive\s*brokers/i, /\bibkr\b/i] },
];
