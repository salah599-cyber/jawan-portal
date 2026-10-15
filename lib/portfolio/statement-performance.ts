import { db } from "@/lib/db";
import { getManagedPortfolioImportNav } from "@/lib/portfolio/managed-portfolio-valuations";
import { computeReturn } from "@/lib/portfolio/return-math";

export type StatementReturnMetrics = {
  periodReturnOmr: number | null;
  periodReturnPct: number | null;
  ytdReturnOmr: number | null;
  ytdReturnPct: number | null;
  lastStatementDate: Date | null;
  awaitingPeriodStatement: boolean;
};

async function listPortfolioSlices(entityIds: string[]): Promise<
  { entityId: string; managedPortfolioId: string | null }[]
> {
  const slices: { entityId: string; managedPortfolioId: string | null }[] = [];

  for (const entityId of entityIds) {
    slices.push({ entityId, managedPortfolioId: null });

    const portfolios = await db.managedPortfolio.findMany({
      where: { entityId, status: { in: ["ACTIVE", "MONITOR"] } },
      select: { id: true },
    });

    for (const portfolio of portfolios) {
      slices.push({ entityId, managedPortfolioId: portfolio.id });
    }
  }

  return slices;
}

async function sliceHasPublicHoldings(
  entityId: string,
  managedPortfolioId: string | null,
): Promise<boolean> {
  const count = await db.publicEquityHolding.count({
    where: {
      managedPortfolioId,
      instrumentType: "EQUITY",
      asset: { entityId, category: "PUBLIC_EQUITY" },
    },
  });
  return count > 0;
}

/**
 * Broker-statement returns for public-market slices (import snapshots), combined
 * with non–public-equity totals supplied by the caller.
 */
export async function computeStatementReturnMetrics(
  entityIds: string[],
  periodStart: Date,
  yearStart: Date,
  nonPublicEquity: {
    currentOmr: number;
    periodBaselineOmr: number;
    ytdCurrentOmr?: number;
    ytdBaselineOmr: number;
  },
): Promise<StatementReturnMetrics> {
  const nonPublicYtdCurrentOmr = nonPublicEquity.ytdCurrentOmr ?? nonPublicEquity.currentOmr;

  if (entityIds.length === 0) {
    return {
      periodReturnOmr: null,
      periodReturnPct: null,
      ytdReturnOmr: null,
      ytdReturnPct: null,
      lastStatementDate: null,
      awaitingPeriodStatement: false,
    };
  }

  const slices = await listPortfolioSlices(entityIds);
  let periodBaselineOmr = nonPublicEquity.periodBaselineOmr;
  let periodCurrentOmr = nonPublicEquity.currentOmr;
  let ytdBaselineOmr = nonPublicEquity.ytdBaselineOmr;
  let ytdCurrentOmr = nonPublicYtdCurrentOmr;
  let lastStatementDate: Date | null = null;
  let awaitingPeriodStatement = false;
  let trackedPublicSlice = false;

  for (const slice of slices) {
    const hasHoldings = await sliceHasPublicHoldings(slice.entityId, slice.managedPortfolioId);
    if (!hasHoldings) continue;

    trackedPublicSlice = true;

    const periodBaseline = await getManagedPortfolioImportNav(
      slice.entityId,
      slice.managedPortfolioId,
      { before: periodStart },
    );
    const periodCurrent = await getManagedPortfolioImportNav(slice.entityId, slice.managedPortfolioId, {
      onOrAfter: periodStart,
    });
    const ytdBaseline = await getManagedPortfolioImportNav(slice.entityId, slice.managedPortfolioId, {
      before: yearStart,
    });
    const ytdCurrent = await getManagedPortfolioImportNav(slice.entityId, slice.managedPortfolioId, {
      onOrAfter: yearStart,
    });

    if (!periodBaseline && !periodCurrent) {
      // Still allow YTD pairing below when import history exists for the year.
    } else if (periodBaseline && periodCurrent) {
      // Only pair complete opening/closing statement marks for the period.
      periodBaselineOmr += periodBaseline.valueOmr;
      periodCurrentOmr += periodCurrent.valueOmr;
      if (!lastStatementDate || periodCurrent.valuedAt > lastStatementDate) {
        lastStatementDate = periodCurrent.valuedAt;
      }
    } else if (periodBaseline && !periodCurrent) {
      awaitingPeriodStatement = true;
    } else if (!periodBaseline && periodCurrent) {
      // Closing mark without an opening statement cannot form a period return.
      if (!lastStatementDate || periodCurrent.valuedAt > lastStatementDate) {
        lastStatementDate = periodCurrent.valuedAt;
      }
    }

    if (ytdBaseline && ytdCurrent) {
      ytdBaselineOmr += ytdBaseline.valueOmr;
      ytdCurrentOmr += ytdCurrent.valueOmr;
      if (!lastStatementDate || ytdCurrent.valuedAt > lastStatementDate) {
        lastStatementDate = ytdCurrent.valuedAt;
      }
    } else if (ytdCurrent && (!lastStatementDate || ytdCurrent.valuedAt > lastStatementDate)) {
      lastStatementDate = ytdCurrent.valuedAt;
    }
  }

  if (!trackedPublicSlice) {
    const periodReturn = computeReturn(
      nonPublicEquity.currentOmr,
      nonPublicEquity.periodBaselineOmr,
    );
    const ytdReturn = computeReturn(nonPublicYtdCurrentOmr, nonPublicEquity.ytdBaselineOmr);
    return {
      periodReturnOmr: periodReturn?.returnOmr ?? null,
      periodReturnPct: periodReturn?.returnPct ?? null,
      ytdReturnOmr: ytdReturn?.returnOmr ?? null,
      ytdReturnPct: ytdReturn?.returnPct ?? null,
      lastStatementDate: null,
      awaitingPeriodStatement: false,
    };
  }

  const periodReturn = awaitingPeriodStatement
    ? null
    : computeReturn(periodCurrentOmr, periodBaselineOmr);
  const ytdReturn = computeReturn(ytdCurrentOmr, ytdBaselineOmr);

  return {
    periodReturnOmr: periodReturn?.returnOmr ?? null,
    periodReturnPct: periodReturn?.returnPct ?? null,
    ytdReturnOmr: ytdReturn?.returnOmr ?? null,
    ytdReturnPct: ytdReturn?.returnPct ?? null,
    lastStatementDate,
    awaitingPeriodStatement,
  };
}
