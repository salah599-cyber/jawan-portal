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

export {
  convertFromOmr,
  convertFromOmrSync,
  convertToOmr,
  getFallbackRateToOmr,
  getLatestFxUpdatedAt,
  getRateToOmr,
  getRatesToOmr,
} from "@/lib/fx";
