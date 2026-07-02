import { db } from "@/lib/db";
import { getModulePermission } from "@/lib/permissions/access";
import type { UserContext } from "@/lib/permissions/types";
import type { ReportParams } from "@/lib/reports/types";

export function reportsEntityFilter(ctx: UserContext) {
  const level = getModulePermission(ctx, "REPORTS");
  if (level === "FULL" || level === "READ") return {};
  if (level === "FILTERED") return { id: { in: ctx.entityIds } };
  return { id: "__none__" };
}

export function weightedValue(
  amount: { toString(): string } | null | undefined,
  ownershipPct: { toString(): string },
): number {
  if (!amount) return 0;
  const value = parseFloat(amount.toString());
  const pct = parseFloat(ownershipPct.toString());
  if (Number.isNaN(value) || Number.isNaN(pct)) return 0;
  return (value * pct) / 100;
}

export function toNumber(value: { toString(): string } | number | null | undefined): number | null {
  if (value == null) return null;
  const num = typeof value === "number" ? value : parseFloat(value.toString());
  return Number.isNaN(num) ? null : num;
}

export function formatAmount(value: number | null | undefined, currency = ""): string {
  if (value == null || Number.isNaN(value)) return "—";
  const formatted = new Intl.NumberFormat("en-OM", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  return currency ? `${formatted} ${currency}` : formatted;
}

export function formatDateValue(value: Date | null | undefined): string {
  if (!value) return "—";
  return value.toLocaleDateString("en-GB");
}

export async function resolveEntityName(entityId?: string): Promise<string | undefined> {
  if (!entityId) return undefined;
  const entity = await db.entity.findUnique({ where: { id: entityId }, select: { name: true } });
  return entity?.name;
}

export function parseDateRange(params: ReportParams): { from?: Date; to?: Date } {
  const from = params.fromDate ? new Date(params.fromDate) : undefined;
  const to = params.toDate ? new Date(params.toDate) : undefined;
  if (to) to.setHours(23, 59, 59, 999);
  return { from, to };
}

export function entityWhere(entityId: string | undefined, entityFilter: Record<string, unknown>) {
  return {
    ...entityFilter,
    ...(entityId ? { entityId } : {}),
  };
}

const FALLBACK_RATES_TO_OMR: Record<string, number> = {
  OMR: 1,
  USD: 0.385,
  HKD: 0.049,
  CNY: 0.053,
  INR: 0.0046,
  GBP: 0.49,
  EUR: 0.42,
};

export async function getRateToOmr(fromCurrency: string): Promise<number> {
  const currency = fromCurrency.toUpperCase();
  if (currency === "OMR") return 1;

  const latest = await db.fxRate.findFirst({
    where: { fromCurrency: currency, toCurrency: "OMR" },
    orderBy: { effectiveAt: "desc" },
  });

  if (latest) {
    const rate = parseFloat(latest.rate.toString());
    if (!Number.isNaN(rate) && rate > 0) return rate;
  }

  return FALLBACK_RATES_TO_OMR[currency] ?? 1;
}

export async function convertToOmr(amount: number, fromCurrency: string): Promise<number> {
  const rate = await getRateToOmr(fromCurrency);
  return amount * rate;
}
