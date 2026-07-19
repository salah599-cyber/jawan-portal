import { db } from "@/lib/db";
import { convertToOmr } from "@/lib/public-markets/fx";
import { normalizeHoldingValues } from "@/lib/public-markets/valuation";

function sameUtcDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

function toNumber(value: { toString(): string } | number | null | undefined): number | null {
  if (value == null) return null;
  const num = typeof value === "number" ? value : parseFloat(value.toString());
  return Number.isNaN(num) ? null : num;
}

export async function computePortfolioTotalsOmr(
  entityId: string,
  managedPortfolioId: string | null,
  market?: string | null,
): Promise<{ valueOmr: number; costBasisOmr: number }> {
  const holdings = await db.publicEquityHolding.findMany({
    where: {
      managedPortfolioId,
      instrumentType: "EQUITY",
      asset: { entityId, category: "PUBLIC_EQUITY" },
      ...(market ? { market: market as never } : {}),
    },
    select: {
      quantity: true,
      costBasis: true,
      marketValue: true,
      currency: true,
    },
  });

  let valueOmr = 0;
  let costBasisOmr = 0;

  for (const holding of holdings) {
    const normalized = normalizeHoldingValues(
      {
        quantity: toNumber(holding.quantity) ?? 0,
        costBasis: toNumber(holding.costBasis),
        marketValue: toNumber(holding.marketValue),
      },
      { costBasisIsTotal: true },
    );
    valueOmr += await convertToOmr(normalized.marketValue ?? 0, holding.currency);
    costBasisOmr += await convertToOmr(normalized.costBasis ?? 0, holding.currency);
  }

  return { valueOmr, costBasisOmr };
}

export async function recordManagedPortfolioValuation(input: {
  entityId: string;
  managedPortfolioId: string | null;
  valueOmr: number;
  costBasisOmr?: number;
  valuedAt?: Date;
  notes?: string;
}): Promise<void> {
  if (input.valueOmr <= 0) return;

  const valuedAt = input.valuedAt ?? new Date();
  const latest = await db.managedPortfolioValuation.findFirst({
    where: {
      entityId: input.entityId,
      managedPortfolioId: input.managedPortfolioId,
    },
    orderBy: { valuedAt: "desc" },
  });

  if (
    latest &&
    latest.valueOmr.toString() === input.valueOmr.toFixed(2) &&
    sameUtcDay(latest.valuedAt, valuedAt)
  ) {
    return;
  }

  await db.managedPortfolioValuation.create({
    data: {
      entityId: input.entityId,
      managedPortfolioId: input.managedPortfolioId,
      valueOmr: input.valueOmr.toFixed(2),
      costBasisOmr:
        input.costBasisOmr != null && input.costBasisOmr > 0
          ? input.costBasisOmr.toFixed(2)
          : null,
      valuedAt,
      notes: input.notes,
    },
  });
}

export async function getManagedPortfolioValueAtDate(
  entityId: string,
  managedPortfolioId: string | null,
  asOfDate: Date,
): Promise<number | null> {
  const valuation = await db.managedPortfolioValuation.findFirst({
    where: {
      entityId,
      managedPortfolioId,
      valuedAt: { lt: asOfDate },
    },
    orderBy: { valuedAt: "desc" },
  });

  if (!valuation) return null;
  const value = parseFloat(valuation.valueOmr.toString());
  return Number.isNaN(value) || value <= 0 ? null : value;
}

export async function snapshotManagedPortfolioValuation(
  entityId: string,
  managedPortfolioId: string | null,
  notes?: string,
): Promise<void> {
  const totals = await computePortfolioTotalsOmr(entityId, managedPortfolioId);
  await recordManagedPortfolioValuation({
    entityId,
    managedPortfolioId,
    valueOmr: totals.valueOmr,
    costBasisOmr: totals.costBasisOmr,
    notes,
  });
}

export async function snapshotAllManagedPortfoliosForEntity(
  entityId: string,
  notes?: string,
): Promise<void> {
  await snapshotManagedPortfolioValuation(entityId, null, notes);

  const portfolios = await db.managedPortfolio.findMany({
    where: { entityId, status: { in: ["ACTIVE", "MONITOR"] } },
    select: { id: true },
  });

  for (const portfolio of portfolios) {
    await snapshotManagedPortfolioValuation(entityId, portfolio.id, notes);
  }
}
