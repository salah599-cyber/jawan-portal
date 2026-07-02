import { db } from "@/lib/db";
import { MSX_PORTFOLIO_ASSET_NAME } from "@/lib/msx/constants";
import { assetEntityFilter } from "@/lib/permissions/scoped-queries";
import type { UserContext } from "@/lib/permissions/types";

export type MsxHoldingRow = {
  id: string;
  symbol: string;
  name: string | null;
  quantity: number;
  costBasis: number | null;
  marketPrice: number | null;
  marketValue: number | null;
  unrealisedPnl: number | null;
  broker: string | null;
  accountNumber: string | null;
  currency: string;
  asOfDate: Date | null;
  updatedAt: Date;
};

export type MsxImportBatchRow = {
  id: string;
  fileName: string;
  uploadedBy: string;
  rowCount: number;
  createdAt: Date;
};

export type MsxPortfolioSummary = {
  assetId: string | null;
  entityId: string;
  entityName: string;
  totalMarketValue: number;
  totalCostBasis: number;
  totalUnrealisedPnl: number;
  holdingCount: number;
  brokerCount: number;
  currency: string;
  lastUpdated: Date | null;
};

function toNumber(value: { toString(): string } | number | null | undefined): number | null {
  if (value == null) return null;
  const num = typeof value === "number" ? value : parseFloat(value.toString());
  return Number.isNaN(num) ? null : num;
}

export async function findMsxPortfolioAsset(entityId: string) {
  return db.asset.findFirst({
    where: {
      entityId,
      category: "PUBLIC_EQUITY",
      name: MSX_PORTFOLIO_ASSET_NAME,
      status: { in: ["ACTIVE", "MONITOR"] },
    },
  });
}

export async function getMsxHoldings(ctx: UserContext, entityId?: string): Promise<MsxHoldingRow[]> {
  const entityFilter = assetEntityFilter(ctx);
  const asset = entityId
    ? await db.asset.findFirst({
        where: {
          ...entityFilter,
          entityId,
          category: "PUBLIC_EQUITY",
          name: MSX_PORTFOLIO_ASSET_NAME,
        },
      })
    : await db.asset.findFirst({
        where: {
          ...entityFilter,
          category: "PUBLIC_EQUITY",
          name: MSX_PORTFOLIO_ASSET_NAME,
        },
        orderBy: { updatedAt: "desc" },
      });

  if (!asset) return [];

  const holdings = await db.publicEquityHolding.findMany({
    where: { assetId: asset.id },
    orderBy: [{ broker: "asc" }, { symbol: "asc" }],
  });

  return holdings.map((holding) => ({
    id: holding.id,
    symbol: holding.symbol,
    name: holding.name,
    quantity: toNumber(holding.quantity) ?? 0,
    costBasis: toNumber(holding.costBasis),
    marketPrice: toNumber(holding.marketPrice),
    marketValue: toNumber(holding.marketValue),
    unrealisedPnl: toNumber(holding.unrealisedPnl),
    broker: holding.broker,
    accountNumber: holding.accountNumber,
    currency: holding.currency,
    asOfDate: holding.asOfDate,
    updatedAt: holding.updatedAt,
  }));
}

export async function getMsxImportBatches(ctx: UserContext, limit = 10): Promise<MsxImportBatchRow[]> {
  const entityFilter = assetEntityFilter(ctx);
  const assets = await db.asset.findMany({
    where: {
      ...entityFilter,
      category: "PUBLIC_EQUITY",
      name: MSX_PORTFOLIO_ASSET_NAME,
    },
    select: { id: true },
  });

  if (assets.length === 0) return [];

  const batches = await db.importBatch.findMany({
    where: {
      holdings: {
        some: { assetId: { in: assets.map((asset) => asset.id) } },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return batches.map((batch) => ({
    id: batch.id,
    fileName: batch.fileName,
    uploadedBy: batch.uploadedBy,
    rowCount: batch.rowCount,
    createdAt: batch.createdAt,
  }));
}

export async function getMsxPortfolioSummary(
  ctx: UserContext,
  entityId?: string,
): Promise<MsxPortfolioSummary | null> {
  const entity = entityId
    ? await db.entity.findFirst({ where: { id: entityId } })
    : await db.entity.findFirst({ orderBy: { name: "asc" } });

  if (!entity) return null;

  const asset = await findMsxPortfolioAsset(entity.id);
  const holdings = asset
    ? await db.publicEquityHolding.findMany({ where: { assetId: asset.id } })
    : [];

  const brokers = new Set(holdings.map((holding) => holding.broker).filter(Boolean));

  let totalMarketValue = 0;
  let totalCostBasis = 0;
  let totalUnrealisedPnl = 0;
  let lastUpdated: Date | null = null;

  for (const holding of holdings) {
    totalMarketValue += toNumber(holding.marketValue) ?? 0;
    totalCostBasis += toNumber(holding.costBasis) ?? 0;
    totalUnrealisedPnl += toNumber(holding.unrealisedPnl) ?? 0;
    if (!lastUpdated || holding.updatedAt > lastUpdated) {
      lastUpdated = holding.updatedAt;
    }
  }

  return {
    assetId: asset?.id ?? null,
    entityId: entity.id,
    entityName: entity.name,
    totalMarketValue,
    totalCostBasis,
    totalUnrealisedPnl,
    holdingCount: holdings.length,
    brokerCount: brokers.size,
    currency: asset?.currency ?? "OMR",
    lastUpdated,
  };
}

import { ensureDefaultEntity } from "@/lib/data/entities";

export async function listMsxPortfolioEntities(ctx: UserContext) {
  await ensureDefaultEntity();

  const entityFilter = assetEntityFilter(ctx);
  const filteredIds =
    "entityId" in entityFilter && entityFilter.entityId && "in" in entityFilter.entityId
      ? entityFilter.entityId.in
      : null;

  return db.entity.findMany({
    where: filteredIds ? { id: { in: filteredIds } } : {},
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}
