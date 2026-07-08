export function formatOmr(
  amount: number | string | { toString(): string } | null | undefined,
): string {
  if (amount == null || amount === "") return "—";
  const value = typeof amount === "number" ? amount : parseFloat(amount.toString());
  if (Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-OM", {
    style: "currency",
    currency: "OMR",
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(value);
}

export function formatMoney(
  amount: number | string | { toString(): string } | null | undefined,
  currency = "OMR",
): string {
  if (amount == null || amount === "") return "—";
  const value = typeof amount === "number" ? amount : parseFloat(amount.toString());
  if (Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-OM", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

const DD_MM_YYYY: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
};

function parseDateValue(date: Date | string): Date | null {
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = parseDateValue(date);
  if (!d) return "—";
  return d.toLocaleDateString("en-GB", DD_MM_YYYY);
}

/** Format a calendar date in UTC (avoids local timezone shifting the day). */
export function formatDateUtc(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = parseDateValue(date);
  if (!d) return "—";
  return d.toLocaleDateString("en-GB", { ...DD_MM_YYYY, timeZone: "UTC" });
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = parseDateValue(date);
  if (!d) return "—";
  return d.toLocaleString("en-GB", {
    ...DD_MM_YYYY,
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const DATE_INPUT_PLACEHOLDER = "DD/MM/YYYY";

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DISPLAY_DATE_RE = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;

/** Parse ISO (YYYY-MM-DD) or display (DD/MM/YYYY) date strings. */
export function parseDateInput(value?: string | null): Date | null {
  if (!value?.trim()) return null;
  const trimmed = value.trim();

  const isoMatch = trimmed.match(ISO_DATE_RE);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const displayMatch = trimmed.match(DISPLAY_DATE_RE);
  if (displayMatch) {
    const [, day, month, year] = displayMatch;
    const dayNum = Number(day);
    const monthNum = Number(month);
    const yearNum = Number(year);
    if (monthNum < 1 || monthNum > 12 || dayNum < 1 || dayNum > 31) return null;
    const date = new Date(Date.UTC(yearNum, monthNum - 1, dayNum));
    if (
      date.getUTCFullYear() !== yearNum ||
      date.getUTCMonth() !== monthNum - 1 ||
      date.getUTCDate() !== dayNum
    ) {
      return null;
    }
    return date;
  }

  const fallback = new Date(trimmed);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

export function toIsoDateString(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Format a date for display in date inputs (DD/MM/YYYY). */
export function formatDateForInput(date: Date | string | null | undefined): string {
  const parsed = typeof date === "string" ? parseDateInput(date) : date;
  if (!parsed || Number.isNaN(parsed.getTime())) return "";
  const day = String(parsed.getUTCDate()).padStart(2, "0");
  const month = String(parsed.getUTCMonth() + 1).padStart(2, "0");
  const year = parsed.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

/** Format a date for native/hidden date input values (YYYY-MM-DD). */
export function formatDateInput(date: Date | string | null | undefined): string {
  const parsed = typeof date === "string" ? parseDateInput(date) : date;
  if (!parsed || Number.isNaN(parsed.getTime())) return "";
  return toIsoDateString(parsed);
}

export function formatDecimalInput(
  value: number | string | { toString(): string } | null | undefined,
): string {
  if (value == null || value === "") return "";
  return value.toString();
}
