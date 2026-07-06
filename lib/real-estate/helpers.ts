import { parseDateInput as parseDateInputValue } from "@/lib/format";

export function toNumber(value: unknown): number {
  if (value == null || value === "") return 0;
  const n = typeof value === "number" ? value : parseFloat(String(value));
  return Number.isNaN(n) ? 0 : n;
}

export function sumDecimals(values: unknown[]): number {
  return values.reduce<number>((sum, value) => sum + toNumber(value), 0);
}

export function parseDecimalInput(value?: string | null) {
  if (!value || value.trim() === "") return undefined;
  return value.trim();
}

export function parseDateInput(value?: string | null) {
  return parseDateInputValue(value) ?? undefined;
}

export function parseIntInput(value?: string | null) {
  if (!value || value.trim() === "") return undefined;
  const n = parseInt(value, 10);
  return Number.isNaN(n) ? undefined : n;
}

export function monthsBetween(start: Date, end: Date) {
  return (
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth()) +
    (end.getDate() >= start.getDate() ? 0 : -1)
  );
}

export function addMonths(date: Date, months: number) {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

export function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function formatPeriodLabel(date: Date, frequency: string) {
  const month = date.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  if (frequency === "QUARTERLY") {
    const quarter = Math.floor(date.getMonth() / 3) + 1;
    return `Q${quarter} ${date.getFullYear()}`;
  }
  if (frequency === "SEMI_ANNUAL") {
    const half = date.getMonth() < 6 ? "H1" : "H2";
    return `${half} ${date.getFullYear()}`;
  }
  if (frequency === "ANNUAL") {
    return String(date.getFullYear());
  }
  return month;
}

export function frequencyMonths(frequency: string) {
  switch (frequency) {
    case "QUARTERLY":
      return 3;
    case "SEMI_ANNUAL":
      return 6;
    case "ANNUAL":
      return 12;
    default:
      return 1;
  }
}
