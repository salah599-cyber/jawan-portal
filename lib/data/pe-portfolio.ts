import { db } from "@/lib/db";
import { ensurePeSchema } from "@/lib/db/ensure-pe-schema";
import { ensureDefaultEntity, listEntities } from "@/lib/data/entities";
import type { PeCompanyStatus } from "@/lib/generated/prisma/client";
import { peCompanyEntityFilter } from "@/lib/permissions/scoped-queries";
import type { UserContext } from "@/lib/permissions/types";
import { toNumber } from "@/lib/pe/helpers";
import {
  aggregatePePortfolioMoic,
  computePeCompanyMetrics,
} from "@/lib/pe/metrics";

export type PeCompanyListRow = {
  id: string;
  name: string;
  tradingName: string | null;
  country: string | null;
  sector: string | null;
  stage: string;
  status: string;
  reportingCurrency: string;
  entityId: string;
  entityName: string;
  assetId: string | null;
  totalInvested: number;
  latestFairValue: number | null;
  totalDistributed: number;
  totalValue: number;
  moic: number | null;
  netIrr: number | null;
  investmentCount: number;
  updatedAt: Date;
};

export type PePortfolioSummary = {
  entityId: string;
  entityName: string;
  reportingCurrency: string;
  companyCount: number;
  activeCount: number;
  totalInvested: number;
  totalFairValue: number;
  totalDistributed: number;
  unrealisedGain: number;
  portfolioMoic: number | null;
  lastUpdated: Date | null;
};

const companyInclude = {
  entity: true,
  investments: { orderBy: { investmentDate: "desc" as const } },
  shareholders: { orderBy: { shareholderName: "asc" as const } },
  capTableRounds: { orderBy: { roundDate: "desc" as const } },
  dilutionEvents: { orderBy: { eventDate: "desc" as const } },
  valuations: { orderBy: { valuationDate: "desc" as const } },
  distributions: { orderBy: { distributionDate: "desc" as const } },
  exit: true,
  contacts: { orderBy: { name: "asc" as const } },
  governance: true,
  monitoringReports: {
    orderBy: { reportDate: "desc" as const },
    include: { document: true },
  },
  documents: { orderBy: { createdAt: "desc" as const } },
  asset: { select: { id: true, status: true, currentValue: true, currency: true } },
} as const;

export type PeCompanyDetail = NonNullable<Awaited<ReturnType<typeof getPeCompany>>>;

async function ensurePeDataLayerReady() {
  await ensurePeSchema();
}

export async function listPePortfolioEntities(ctx: UserContext) {
  await ensurePeDataLayerReady();
  await ensureDefaultEntity();
  const filter = peCompanyEntityFilter(ctx);
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

export async function listPeCompanies(
  ctx: UserContext,
  entityId?: string,
): Promise<PeCompanyListRow[]> {
  await ensurePeDataLayerReady();
  const where = {
    ...peCompanyEntityFilter(ctx),
    status: { notIn: ["EXITED", "WRITTEN_OFF"] as PeCompanyStatus[] },
    ...(entityId ? { entityId } : {}),
  };

  const companies = await db.peCompany.findMany({
    where,
    include: {
      entity: { select: { name: true } },
      investments: {
        select: { amountReporting: true, investmentDate: true },
        orderBy: { investmentDate: "asc" },
      },
      valuations: {
        orderBy: { valuationDate: "desc" },
        take: 1,
        select: { stakeFairValueReporting: true, valuationDate: true },
      },
      distributions: {
        select: { amountReporting: true, distributionDate: true },
        orderBy: { distributionDate: "asc" },
      },
      exit: {
        select: { exitProceedsReporting: true, exitDate: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return companies.map((company) => {
    const latestFairValue = company.valuations[0]
      ? toNumber(company.valuations[0].stakeFairValueReporting)
      : null;
    const metrics = computePeCompanyMetrics({
      investments: company.investments
        .filter((row) => row.amountReporting != null)
        .map((row) => ({
          date: row.investmentDate,
          amount: row.amountReporting!,
        })),
      distributions: company.distributions.map((row) => ({
        date: row.distributionDate,
        amount: row.amountReporting,
      })),
      latestFairValue,
      latestValuationDate: company.valuations[0]?.valuationDate ?? null,
      exitProceeds: company.exit?.exitProceedsReporting
        ? toNumber(company.exit.exitProceedsReporting)
        : null,
      exitDate: company.exit?.exitDate ?? null,
    });

    return {
      id: company.id,
      name: company.name,
      tradingName: company.tradingName,
      country: company.country,
      sector: company.sector,
      stage: company.stage,
      status: company.status,
      reportingCurrency: company.reportingCurrency,
      entityId: company.entityId,
      entityName: company.entity.name,
      assetId: company.assetId,
      totalInvested: metrics.totalInvested,
      latestFairValue,
      totalDistributed: metrics.totalDistributed,
      totalValue: metrics.totalValue,
      moic: metrics.moic,
      netIrr: metrics.netIrr,
      investmentCount: company.investments.length,
      updatedAt: company.updatedAt,
    };
  });
}

export async function getPePortfolioSummary(
  ctx: UserContext,
  entityId?: string,
): Promise<PePortfolioSummary | null> {
  const entity = entityId
    ? await db.entity.findFirst({ where: { id: entityId } })
    : await db.entity.findFirst({ orderBy: { name: "asc" } });

  if (!entity) return null;

  const companies = await listPeCompanies(ctx, entity.id);
  if (companies.length === 0) {
    return {
      entityId: entity.id,
      entityName: entity.name,
      reportingCurrency: "USD",
      companyCount: 0,
      activeCount: 0,
      totalInvested: 0,
      totalFairValue: 0,
      totalDistributed: 0,
      unrealisedGain: 0,
      portfolioMoic: null,
      lastUpdated: null,
    };
  }

  const totalInvested = companies.reduce((sum, c) => sum + c.totalInvested, 0);
  const totalFairValue = companies.reduce((sum, c) => sum + (c.latestFairValue ?? 0), 0);
  const totalDistributed = companies.reduce((sum, c) => sum + c.totalDistributed, 0);
  const activeCount = companies.filter(
    (c) => c.status === "ACTIVE" || c.status === "FOLLOW_ON_PENDING" || c.status === "WATCHLIST",
  ).length;
  const lastUpdated = companies.reduce<Date | null>((latest, company) => {
    if (!latest || company.updatedAt > latest) return company.updatedAt;
    return latest;
  }, null);

  const currencies = new Set(companies.map((c) => c.reportingCurrency));
  const reportingCurrency = currencies.size === 1 ? [...currencies][0] : "USD";

  return {
    entityId: entity.id,
    entityName: entity.name,
    reportingCurrency,
    companyCount: companies.length,
    activeCount,
    totalInvested,
    totalFairValue,
    totalDistributed,
    unrealisedGain: totalFairValue - totalInvested,
    portfolioMoic: aggregatePePortfolioMoic(
      companies.map((company) => ({
        totalInvested: company.totalInvested,
        totalDistributed: company.totalDistributed,
        carryingValue: company.latestFairValue ?? company.totalInvested,
        totalValue: company.totalValue,
        moic: company.moic,
        netIrr: company.netIrr,
      })),
    ),
    lastUpdated,
  };
}

export async function getPeCompany(ctx: UserContext, id: string) {
  await ensurePeDataLayerReady();
  return db.peCompany.findFirst({
    where: { id, ...peCompanyEntityFilter(ctx) },
    include: companyInclude,
  });
}
