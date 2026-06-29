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

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
