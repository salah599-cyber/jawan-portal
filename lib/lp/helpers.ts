export function toNumber(value: { toString(): string } | number | null | undefined): number {
  if (value == null) return 0;
  const num = typeof value === "number" ? value : parseFloat(value.toString());
  return Number.isNaN(num) ? 0 : num;
}

export function sumDecimals(values: Array<{ toString(): string } | number | null | undefined>): number {
  return values.reduce<number>((sum, value) => sum + toNumber(value), 0);
}

export function parseDecimal(value: string | null | undefined): number | null {
  if (value == null || value.trim() === "") return null;
  const num = parseFloat(value);
  return Number.isNaN(num) ? null : num;
}

export function parseDate(value: string | null | undefined): Date | null {
  if (!value?.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function parseIntOptional(value: string | null | undefined): number | null {
  if (!value?.trim()) return null;
  const num = parseInt(value, 10);
  return Number.isNaN(num) ? null : num;
}

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function resolveCapitalCallStatus(
  status: string,
  dueDate: Date | null | undefined,
): "PENDING" | "PAID" | "OVERDUE" | "CANCELLED" {
  if (status === "PAID" || status === "CANCELLED") {
    return status;
  }
  if (dueDate && startOfDay(dueDate) < startOfDay(new Date())) {
    return "OVERDUE";
  }
  return status === "OVERDUE" ? "OVERDUE" : "PENDING";
}
