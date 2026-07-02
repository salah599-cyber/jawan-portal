import type { BrokerSignature } from "@/lib/public-markets/parsers/common";

export const HK_BROKER_SIGNATURES: BrokerSignature[] = [
  { broker: "HSBC", patterns: [/\bhsbc\b/i, /hongkong\s*and\s*shanghai/i] },
  { broker: "Interactive Brokers", patterns: [/interactive\s*brokers/i, /\bibkr\b/i] },
  { broker: "Futu", patterns: [/\bfutu\b/i, /\bmoomoo\b/i] },
  { broker: "Tiger Brokers", patterns: [/tiger\s*brokers/i, /\btigertrade\b/i] },
  { broker: "BOCI", patterns: [/\bboci\b/i, /bank\s*of\s*china\s*international/i] },
  { broker: "CITIC Securities", patterns: [/citic\s*securities/i] },
  { broker: "Phillip Securities", patterns: [/phillip\s*securities/i] },
];
