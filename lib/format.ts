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

export function formatDateInput(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export function formatDecimalInput(
  value: number | string | { toString(): string } | null | undefined,
): string {
  if (value == null || value === "") return "";
  return value.toString();
}
