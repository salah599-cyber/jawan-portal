const BROKER_ALIASES: Array<{ canonical: string; patterns: RegExp[] }> = [
  { canonical: "UBS", patterns: [/\bubs\b/i, /ubs\s+ag/i] },
  { canonical: "Credit Suisse", patterns: [/\bcredit\s+suisse\b/i] },
  { canonical: "Goldman Sachs", patterns: [/\bgoldman\b/i, /\bgs\b/i] },
  { canonical: "Morgan Stanley", patterns: [/\bmorgan\s+stanley\b/i, /\bms\b/i] },
  { canonical: "JPMorgan", patterns: [/\bjp\s*morgan\b/i, /\bjpm\b/i] },
  { canonical: "Bank Muscat", patterns: [/\bbank\s+muscat\b/i, /\bbkmb\b/i] },
  { canonical: "National Bank of Oman", patterns: [/\bnational\s+bank\s+of\s+oman\b/i, /\bnbo\b/i] },
  { canonical: "Ahli Bank", patterns: [/\bahli\s+bank\b/i] },
  { canonical: "HSBC", patterns: [/\bhsbc\b/i] },
  { canonical: "Standard Chartered", patterns: [/\bstandard\s+chartered\b/i] },
  { canonical: "Interactive Brokers", patterns: [/\binteractive\s+brokers\b/i, /\bibkr\b/i] },
  { canonical: "Charles Schwab", patterns: [/\bschwab\b/i] },
  { canonical: "Fidelity", patterns: [/\bfidelity\b/i] },
  { canonical: "Vanguard", patterns: [/\bvanguard\b/i] },
];

export function normalizeBrokerName(
  broker: string | null | undefined,
  fallback = "Unknown Broker",
): string {
  const trimmed = broker?.trim();
  if (!trimmed) return fallback;

  for (const { canonical, patterns } of BROKER_ALIASES) {
    if (patterns.some((pattern) => pattern.test(trimmed))) {
      return canonical;
    }
  }

  return trimmed.replace(/\s+/g, " ");
}
