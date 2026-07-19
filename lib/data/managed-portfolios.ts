import { db } from "@/lib/db";
import type { PublicMarket } from "@/lib/generated/prisma/client";
import { ensurePublicMarketsSchema } from "@/lib/db/ensure-public-markets-schema";
import { convertToOmr } from "@/lib/public-markets/fx";
import { normalizeHoldingValues } from "@/lib/public-markets/valuation";
import { assetEntityFilter } from "@/lib/permissions/scoped-queries";
import type { UserContext } from "@/lib/permissions/types";

export type ManagedPortfolioRow = {
  id: string;
  entityId: string;
  entityName: string;
  name: string;
  managerName: string;
  accountNumber: string | null;
  notes: string | null;
  status: string;
  holdingCount: number;
  totalMarketValueOmr: number;
  totalCostBasisOmr: number;
  totalUnrealisedPnlOmr: number;
  lastUpdated: Date | null;
};

export type ManagedPortfolioSummary = {
  id: string | null;
  label: string;
  managerName: string | null;
  holdingCount: number;
  totalMarketValueOmr: number;
  totalCostBasisOmr: number;
  totalUnrealisedPnlOmr: number;
  lastUpdated: Date | null;
};

function toNumber(value: { toString(): string } | number | null | undefined): number | null {
  if (value == null) return null;
  const num = typeof value === "number" ? value : parseFloat(value.toString());
  return Number.isNaN(num) ? null : num;
}

export async function listManagedPortfolios(
  ctx: UserContext,
  entityId: string,
): Promise<ManagedPortfolioRow[]> {
  await ensurePublicMarketsSchema();
  const entityFilter = assetEntityFilter(ctx);
  const filteredIds =
    "entityId" in entityFilter && entityFilter.entityId && "in" in entityFilter.entityId
      ? entityFilter.entityId.in
      : null;

  if (filteredIds && !filteredIds.includes(entityId)) {
    return [];
  }

  const portfolios = await db.managedPortfolio.findMany({
    where: {
      entityId,
      status: { in: ["ACTIVE", "MONITOR"] },
    },
    include: {
      entity: { select: { name: true } },
      holdings: {
        select: {
          quantity: true,
          costBasis: true,
          marketValue: true,
          unrealisedPnl: true,
          currency: true,
          updatedAt: true,
        },
      },
    },
    orderBy: [{ managerName: "asc" }, { name: "asc" }],
  });

  const rows: ManagedPortfolioRow[] = [];

  for (const portfolio of portfolios) {
    let totalMarketValueOmr = 0;
    let totalCostBasisOmr = 0;
    let totalUnrealisedPnlOmr = 0;
    let lastUpdated: Date | null = null;

    for (const holding of portfolio.holdings) {
      const normalized = normalizeHoldingValues(
        {
          quantity: toNumber(holding.quantity) ?? 0,
          costBasis: toNumber(holding.costBasis),
          marketValue: toNumber(holding.marketValue),
          unrealisedPnl: toNumber(holding.unrealisedPnl),
        },
        { costBasisIsTotal: true },
      );

      const marketValue = normalized.marketValue ?? 0;
      totalMarketValueOmr += await convertToOmr(marketValue, holding.currency);
      totalCostBasisOmr += await convertToOmr(normalized.costBasis ?? 0, holding.currency);
      totalUnrealisedPnlOmr += await convertToOmr(normalized.unrealisedPnl ?? 0, holding.currency);

      if (!lastUpdated || holding.updatedAt > lastUpdated) {
        lastUpdated = holding.updatedAt;
      }
    }

    rows.push({
      id: portfolio.id,
      entityId: portfolio.entityId,
      entityName: portfolio.entity.name,
      name: portfolio.name,
      managerName: portfolio.managerName,
      accountNumber: portfolio.accountNumber,
      notes: portfolio.notes,
      status: portfolio.status,
      holdingCount: portfolio.holdings.length,
      totalMarketValueOmr,
      totalCostBasisOmr,
      totalUnrealisedPnlOmr,
      lastUpdated,
    });
  }

  return rows;
}

export async function getManagedPortfolioById(
  ctx: UserContext,
  portfolioId: string,
): Promise<ManagedPortfolioRow | null> {
  const portfolio = await db.managedPortfolio.findUnique({
    where: { id: portfolioId },
    select: { entityId: true },
  });

  if (!portfolio) return null;

  const rows = await listManagedPortfolios(ctx, portfolio.entityId);
  return rows.find((entry) => entry.id === portfolioId) ?? null;
}

export async function summarizePrivateHoldings(
  ctx: UserContext,
  entityId: string,
  market?: PublicMarket | null,
): Promise<ManagedPortfolioSummary> {
  await ensurePublicMarketsSchema();
  const entityFilter = assetEntityFilter(ctx);

  const assets = await db.asset.findMany({
    where: {
      ...entityFilter,
      entityId,
      category: "PUBLIC_EQUITY",
    },
    select: { id: true },
  });

  const holdings = await db.publicEquityHolding.findMany({
    where: {
      assetId: { in: assets.map((asset) => asset.id) },
      managedPortfolioId: null,
      instrumentType: "EQUITY",
      ...(market ? { market } : {}),
    },
    select: {
      quantity: true,
      costBasis: true,
      marketValue: true,
      unrealisedPnl: true,
      currency: true,
      updatedAt: true,
    },
  });

  let totalMarketValueOmr = 0;
  let totalCostBasisOmr = 0;
  let totalUnrealisedPnlOmr = 0;
  let lastUpdated: Date | null = null;

  for (const holding of holdings) {
    const normalized = normalizeHoldingValues(
      {
        quantity: toNumber(holding.quantity) ?? 0,
        costBasis: toNumber(holding.costBasis),
        marketValue: toNumber(holding.marketValue),
        unrealisedPnl: toNumber(holding.unrealisedPnl),
      },
      { costBasisIsTotal: true },
    );
    const marketValue = normalized.marketValue ?? 0;
    totalMarketValueOmr += await convertToOmr(marketValue, holding.currency);
    totalCostBasisOmr += await convertToOmr(normalized.costBasis ?? 0, holding.currency);
    totalUnrealisedPnlOmr += await convertToOmr(normalized.unrealisedPnl ?? 0, holding.currency);
    if (!lastUpdated || holding.updatedAt > lastUpdated) {
      lastUpdated = holding.updatedAt;
    }
  }

  return {
    id: null,
    label: "Private holdings",
    managerName: null,
    holdingCount: holdings.length,
    totalMarketValueOmr,
    totalCostBasisOmr,
    totalUnrealisedPnlOmr,
    lastUpdated,
  };
}

export async function getManagedPortfolioSummaries(
  ctx: UserContext,
  entityId: string,
  market?: PublicMarket | null,
): Promise<ManagedPortfolioSummary[]> {
  const [privateSummary, managed] = await Promise.all([
    summarizePrivateHoldings(ctx, entityId, market ?? null),
    listManagedPortfolios(ctx, entityId),
  ]);

  const managedSummaries: ManagedPortfolioSummary[] = [];

  for (const portfolio of managed) {
    const holdings = await db.publicEquityHolding.findMany({
      where: {
        managedPortfolioId: portfolio.id,
        instrumentType: "EQUITY",
        ...(market ? { market } : {}),
      },
      select: {
        quantity: true,
        costBasis: true,
        marketValue: true,
        unrealisedPnl: true,
        currency: true,
        updatedAt: true,
      },
    });

    let totalMarketValueOmr = 0;
    let totalCostBasisOmr = 0;
    let totalUnrealisedPnlOmr = 0;
    let lastUpdated: Date | null = null;

    for (const holding of holdings) {
      const normalized = normalizeHoldingValues(
        {
          quantity: toNumber(holding.quantity) ?? 0,
          costBasis: toNumber(holding.costBasis),
          marketValue: toNumber(holding.marketValue),
          unrealisedPnl: toNumber(holding.unrealisedPnl),
        },
        { costBasisIsTotal: true },
      );
      const marketValue = normalized.marketValue ?? 0;
      totalMarketValueOmr += await convertToOmr(marketValue, holding.currency);
      totalCostBasisOmr += await convertToOmr(normalized.costBasis ?? 0, holding.currency);
      totalUnrealisedPnlOmr += await convertToOmr(normalized.unrealisedPnl ?? 0, holding.currency);
      if (!lastUpdated || holding.updatedAt > lastUpdated) {
        lastUpdated = holding.updatedAt;
      }
    }

    if (holdings.length === 0) continue;

    managedSummaries.push({
      id: portfolio.id,
      label: portfolio.name,
      managerName: portfolio.managerName,
      holdingCount: holdings.length,
      totalMarketValueOmr,
      totalCostBasisOmr,
      totalUnrealisedPnlOmr,
      lastUpdated,
    });
  }

  return [privateSummary, ...managedSummaries].filter((summary) => summary.holdingCount > 0);
}
