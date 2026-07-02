import { BROKER_SIGNATURES } from "./constants";

export function detectBroker(fileName: string, content: string): string {
  for (const { broker, patterns } of BROKER_SIGNATURES) {
    if (patterns.some((pattern) => pattern.test(fileName))) {
      return broker;
    }
  }

  const haystack = content.toLowerCase();
  for (const { broker, patterns } of BROKER_SIGNATURES) {
    if (patterns.some((pattern) => pattern.test(haystack))) {
      return broker;
    }
  }

  return "Unknown Broker";
}

export function extractAccountNumber(content: string): string | undefined {
  const patterns = [
    /account\s*(?:no\.?|number|#)\s*[:\-]?\s*([A-Z0-9\-/]+)/i,
    /client\s*(?:id|code|no\.?)\s*[:\-]?\s*([A-Z0-9\-/]+)/i,
    /investor\s*(?:no\.?|number|#)\s*[:\-]?\s*([A-Z0-9\-/]+)/i,
    /portfolio\s*(?:no\.?|number|#)\s*[:\-]?\s*([A-Z0-9\-/]+)/i,
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match?.[1]) return match[1].trim();
  }

  return undefined;
}

export function extractAsOfDate(content: string): Date | undefined {
  const patterns = [
    /as\s*of\s*[:\-]?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i,
    /statement\s*date\s*[:\-]?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i,
    /report\s*date\s*[:\-]?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i,
    /(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{4})/i,
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match?.[1]) {
      const date = new Date(match[1]);
      if (!Number.isNaN(date.getTime())) return date;
    }
  }

  return undefined;
}
