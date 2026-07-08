import { db } from "@/lib/db";
import { ensureLpFundSchema } from "@/lib/db/ensure-lp-fund-schema";
import { ensureDefaultEntity, listEntities } from "@/lib/data/entities";
import { computeLpCommitmentMetrics } from "@/lib/lp/metrics";
import { toNumber } from "@/lib/lp/helpers";
import { ACTIVE_LP_COMMITMENT_STATUSES } from "@/lib/lp/constants";
import { lpCommitmentEntityFilter } from "@/lib/permissions/scoped-queries";
import type { UserContext } from "@/lib/permissions/types";
import { convertToOmr } from "@/lib/reports/helpers";

export type LpCommitmentListRow = {
  id: string;
  fundId: string;
  fundName: string;
  gpName: string | null;
  strategy: string;
  vintageYear: number | null;
  status: string;
  commitmentAmount: number;
  commitmentCurrency: string;
  entityId: string;
  entityName: string;
  assetId: string | null;
  paidInCapital: number;
  unfundedCommitment: number;
  latestNav: number | null;
  totalDistributions: number;
  tvpi: number | null;
  updatedAt: Date;
};

export type LpPortfolioSummary = {
  entityId: string;
  entityName: string;
  reportingCurrency: string;
  commitmentCount: number;
  activeCount: number;
  totalCommitted: number;
  totalPaidIn: number;
  totalUnfunded: number;
  totalNav: number;
  totalNavOmr: number;
  totalDistributed: number;
  lastUpdated: Date | null;
};

const commitmentInclude = {
  entity: { select: { name: true } },
  fund: {
    include: {
      gpManager: { select: { id: true, name: true, country: true, website: true } },
    },
  },
  capitalCalls: true,
  distributions: true,
  navUpdates: { orderBy: { asOfDate: "desc" as const } },
  documents: { orderBy: { createdAt: "desc" as const } },
  asset: { select: { id: true, status: true, currentValue: true, currency: true } },
} as const;

export type LpCommitmentDetail = NonNullable<Awaited<ReturnType<typeof getLpCommitment>>>;

async function ensureLpDataLayerReady() {
  await ensureLpFundSchema();
}

function buildMetricsFromCommitment(
  commitment: {
    commitmentAmount: { toString(): string };
    capitalCalls: Parameters<typeof computeLpCommitmentMetrics>[0]["capitalCalls"];
    distributions: Parameters<typeof computeLpCommitmentMetrics>[0]["distributions"];
    navUpdates: Parameters<typeof computeLpCommitmentMetrics>[0]["navUpdates"];
  },
) {
  return computeLpCommitmentMetrics({
    commitmentAmount: commitment.commitmentAmount,
    capitalCalls: commitment.capitalCalls,
    distributions: commitment.distributions,
    navUpdates: commitment.navUpdates,
  });
}

export async function listLpPortfolioEntities(ctx: UserContext) {
  await ensureLpDataLayerReady();
  await ensureDefaultEntity();
  const filter = lpCommitmentEntityFilter(ctx);
  const filteredIds =
    "entityId" in filter && filter.entityId && "in" in filter.entityId
      ? filter.entityId.in
      : null;

  if (filteredIds) {
    return db.entity.findMany({
      where: { id: { in: filteredIds } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
  }

  return listEntities().then((entities) =>
    entities.map((entity) => ({ id: entity.id, name: entity.name })),
  );
}

export async function listLpGpManagers(ctx: UserContext) {
  await ensureLpDataLayerReady();
  return db.lpGpManager.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, country: true },
  });
}

export async function listLpFunds(ctx: UserContext) {
  await ensureLpDataLayerReady();
  return db.lpFund.findMany({
    orderBy: [{ name: "asc" }],
    include: { gpManager: { select: { name: true } } },
  });
}

export async function listLpCommitments(
  ctx: UserContext,
  entityId?: string,
): Promise<LpCommitmentListRow[]> {
  await ensureLpDataLayerReady();
  const commitments = await db.lpCommitment.findMany({
    where: {
      ...lpCommitmentEntityFilter(ctx),
      ...(entityId ? { entityId } : {}),
    },
    include: {
      entity: { select: { name: true } },
      fund: { include: { gpManager: { select: { name: true } } } },
      capitalCalls: true,
      distributions: true,
      navUpdates: { orderBy: { asOfDate: "desc" }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
  });

  return commitments.map((commitment) => {
    const metrics = buildMetricsFromCommitment(commitment);
    return {
      id: commitment.id,
      fundId: commitment.fundId,
      fundName: commitment.fund.name,
      gpName: commitment.fund.gpManager?.name ?? null,
      strategy: commitment.fund.strategy,
      vintageYear: commitment.fund.vintageYear,
      status: commitment.status,
      commitmentAmount: toNumber(commitment.commitmentAmount),
      commitmentCurrency: commitment.commitmentCurrency,
      entityId: commitment.entityId,
      entityName: commitment.entity.name,
      assetId: commitment.assetId,
      paidInCapital: metrics.paidInCapital,
      unfundedCommitment: metrics.unfundedCommitment,
      latestNav: metrics.latestNav,
      totalDistributions: metrics.totalDistributions,
      tvpi: metrics.tvpi,
      updatedAt: commitment.updatedAt,
    };
  });
}

export async function getLpPortfolioSummary(
  ctx: UserContext,
  entityId?: string,
): Promise<LpPortfolioSummary | null> {
  const entity = entityId
    ? await db.entity.findFirst({ where: { id: entityId } })
    : await db.entity.findFirst({ orderBy: { name: "asc" } });

  if (!entity) return null;

  const commitments = await listLpCommitments(ctx, entity.id);
  if (commitments.length === 0) {
    return {
      entityId: entity.id,
      entityName: entity.name,
      reportingCurrency: "USD",
      commitmentCount: 0,
      activeCount: 0,
      totalCommitted: 0,
      totalPaidIn: 0,
      totalUnfunded: 0,
      totalNav: 0,
      totalNavOmr: 0,
      totalDistributed: 0,
      lastUpdated: null,
    };
  }

  const currencies = new Set(commitments.map((c) => c.commitmentCurrency));
  const reportingCurrency = currencies.size === 1 ? [...currencies][0] : "USD";

  const totalNavOmr = await Promise.all(
    commitments.map(async (c) =>
      c.latestNav != null ? convertToOmr(c.latestNav, c.commitmentCurrency) : 0,
    ),
  ).then((values) => values.reduce((sum, v) => sum + v, 0));

  return {
    entityId: entity.id,
    entityName: entity.name,
    reportingCurrency,
    commitmentCount: commitments.length,
    activeCount: commitments.filter((c) =>
      ACTIVE_LP_COMMITMENT_STATUSES.includes(
        c.status as (typeof ACTIVE_LP_COMMITMENT_STATUSES)[number],
      ),
    ).length,
    totalCommitted: commitments.reduce((sum, c) => sum + c.commitmentAmount, 0),
    totalPaidIn: commitments.reduce((sum, c) => sum + c.paidInCapital, 0),
    totalUnfunded: commitments.reduce((sum, c) => sum + c.unfundedCommitment, 0),
    totalNav: commitments.reduce((sum, c) => sum + (c.latestNav ?? 0), 0),
    totalNavOmr,
    totalDistributed: commitments.reduce((sum, c) => sum + c.totalDistributions, 0),
    lastUpdated: commitments.reduce<Date | null>((latest, row) => {
      if (!latest || row.updatedAt > latest) return row.updatedAt;
      return latest;
    }, null),
  };
}

export async function getLpCommitment(ctx: UserContext, id: string) {
  await ensureLpDataLayerReady();
  return db.lpCommitment.findFirst({
    where: { id, ...lpCommitmentEntityFilter(ctx) },
    include: commitmentInclude,
  });
}

export async function listGpManagerExposure(ctx: UserContext, entityId?: string) {
  const commitments = await listLpCommitments(ctx, entityId);
  const byGp = new Map<
    string,
    { gpName: string; commitmentCount: number; totalNavOmr: number; totalPaidIn: number }
  >();

  for (const row of commitments) {
    const gpName = row.gpName ?? "Unknown GP";
    const entry = byGp.get(gpName) ?? {
      gpName,
      commitmentCount: 0,
      totalNavOmr: 0,
      totalPaidIn: 0,
    };
    entry.commitmentCount += 1;
    entry.totalPaidIn += row.paidInCapital;
    if (row.latestNav != null) {
      entry.totalNavOmr += await convertToOmr(row.latestNav, row.commitmentCurrency);
    }
    byGp.set(gpName, entry);
  }

  return [...byGp.values()].sort((a, b) => b.totalNavOmr - a.totalNavOmr);
}
