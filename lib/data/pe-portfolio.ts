import { db } from "@/lib/db";
import { ensurePeSchema } from "@/lib/db/ensure-pe-schema";
import { ensureDefaultEntity, listEntities } from "@/lib/data/entities";
import { peCompanyEntityFilter } from "@/lib/permissions/scoped-queries";
import type { UserContext } from "@/lib/permissions/types";
import { sumDecimals, toNumber } from "@/lib/pe/helpers";

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
    ...(entityId ? { entityId } : {}),
  };

  const companies = await db.peCompany.findMany({
    where,
    include: {
      entity: { select: { name: true } },
      investments: { select: { amountReporting: true } },
      valuations: { orderBy: { valuationDate: "desc" }, take: 1, select: { stakeFairValueReporting: true } },
      distributions: { select: { amountReporting: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return companies.map((company) => ({
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
    totalInvested: sumDecimals(company.investments.map((i) => i.amountReporting)),
    latestFairValue: company.valuations[0]
      ? toNumber(company.valuations[0].stakeFairValueReporting)
      : null,
    totalDistributed: sumDecimals(company.distributions.map((d) => d.amountReporting)),
    investmentCount: company.investments.length,
    updatedAt: company.updatedAt,
  }));
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
