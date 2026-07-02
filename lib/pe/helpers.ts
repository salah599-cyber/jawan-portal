export function parseDate(value?: string | null): Date | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) throw new Error("Invalid date.");
  return date;
}

export function parseDecimal(value?: string | null): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return trimmed;
}

export function parseIntRating(value?: string | null): number | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  const num = parseInt(trimmed, 10);
  if (Number.isNaN(num) || num < 1 || num > 5) throw new Error("Risk rating must be between 1 and 5.");
  return num;
}

export function toNumber(value: { toString(): string } | number | null | undefined): number {
  if (value == null) return 0;
  const num = typeof value === "number" ? value : parseFloat(value.toString());
  return Number.isNaN(num) ? 0 : num;
}

export function sumDecimals(
  values: Array<{ toString(): string } | number | null | undefined>,
): number {
  return values.reduce<number>((sum, value) => sum + toNumber(value), 0);
}
