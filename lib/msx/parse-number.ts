import { fitsHoldingDecimal } from "@/lib/public-markets/valuation";

export function parseNumeric(value: unknown): number | undefined {
  if (value == null || value === "") return undefined;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }

  const raw = String(value).trim();
  if (!raw || raw === "-" || raw === "—") return undefined;

  const normalized = raw
    .replace(/[,\s]/g, "")
    .replace(/[()]/g, "")
    .replace(/OMR|USD|Baisa|baisa/gi, "")
    .replace(/%$/, "");

  const negative = /^\(.*\)$/.test(raw) || raw.startsWith("-");
  const parsed = parseFloat(normalized.replace(/[^\d.-]/g, ""));
  if (Number.isNaN(parsed)) return undefined;
  return negative && parsed > 0 ? -parsed : parsed;
}

export function parseQuantity(value: unknown): number | undefined {
  const num = parseNumeric(value);
  if (num == null) return undefined;
  const quantity = Math.abs(num);
  // Reject values that cannot be stored on PublicEquityHolding.quantity Decimal(18, 6).
  // PDF/Excel mis-parses often glue columns into huge integers that overflow Postgres.
  if (!fitsHoldingDecimal(quantity, "quantity")) return undefined;
  return quantity;
}
