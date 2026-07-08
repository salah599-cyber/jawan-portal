import { STALE_BALANCE_DAYS } from "@/lib/cash/constants";

export function toNumber(value: { toString(): string } | number | null | undefined): number | null {
  if (value == null) return null;
  const num = typeof value === "number" ? value : parseFloat(value.toString());
  return Number.isNaN(num) ? null : num;
}

export function isStaleBalance(balanceAsOf: Date | null | undefined, now = new Date()): boolean {
  if (!balanceAsOf) return true;
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - STALE_BALANCE_DAYS);
  return balanceAsOf < cutoff;
}

export function daysSinceBalanceUpdate(balanceAsOf: Date | null | undefined, now = new Date()): number | null {
  if (!balanceAsOf) return null;
  const diffMs = now.getTime() - balanceAsOf.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}
