import { db } from "@/lib/db";
import type { PublicMarket } from "@/lib/generated/prisma/client";
import { ensureDefaultEntity } from "@/lib/data/entities";
import { ensurePublicMarketsSchema } from "@/lib/db/ensure-public-markets-schema";
import {
  MARKET_CONFIG,
  PUBLIC_MARKET_ORDER,
  isAllMarketsSlug,
  marketFromSlug,
} from "@/lib/public-markets/constants";
import { convertToOmr } from "@/lib/public-markets/fx";
import { normalizeHoldingValues } from "@/lib/public-markets/valuation";
import { assetEntityFilter } from "@/lib/permissions/scoped-queries";
import type { UserContext } from "@/lib/permissions/types";

export type PublicHoldingRow = {
  id: string;
  market: PublicMarket;
  marketLabel: string;
  symbol: string;
  name: string | null;
  quantity: number;
  costBasis: number | null;
  marketPrice: number | null;
  marketValue: number | null;
  marketValueOmr: number | null;
  unrealisedPnl: number | null;
  broker: string | null;
  accountNumber: string | null;
  exchange: string | null;
  isin: string | null;
  cusip: string | null;
  sedol: string | null;
  country: string | null;
  source: string;
  currency: string;
  asOfDate: Date | null;
  priceFetchedAt: Date | null;
  priceSource: string | null;
  updatedAt: Date;
  entityId: string;
  entityName: string;
};

export type PublicImportBatchRow = {
  id: string;
  fileName: string;
  uploadedBy: string;
  rowCount: number;
  market: PublicMarket | null;
  marketLabel: string | null;
  broker: string | null;
  accountNumber: string | null;
  asOfDate: Date | null;
  parserId: string | null;
  createdAt: Date;
};

export type PublicMarketSummary = {
  market: PublicMarket;
  label: string;
  shortLabel: string;
  assetId: string | null;
  entityId: string;
  entityName: string;
  totalMarketValue: number;
  totalMarketValueOmr: number;
  totalCostBasis: number;
  totalUnrealisedPnl: number;
  holdingCount: number;
  brokerCount: number;
  currency: string;
  lastUpdated: Date | null;
  lastPriceRefresh: Date | null;
};

export type AllMarketsSummary = {
  entityId: string;
  entityName: string;
  totalMarketValueOmr: number;
  totalCostBasisOmr: number;
  totalUnrealisedPnlOmr: number;
  holdingCount: number;
  brokerCount: number;
  marketCount: number;
  lastUpdated: Date | null;
  lastPriceRefresh: Date | null;
  byMarket: PublicMarketSummary[];
};

function toNumber(value: { toString(): string } | number | null | undefined): number | null {
  if (value == null) return null;
  const num = typeof value === "number" ? value : parseFloat(value.toString());
  return Number.isNaN(num) ? null : num;
}

async function ensurePublicMarketsDataLayerReady() {
  await ensurePublicMarketsSchema();
}

export async function findPortfolioAsset(entityId: string, market: PublicMarket) {
  return db.asset.findFirst({
    where: {
      entityId,
      category: "PUBLIC_EQUITY",
      name: MARKET_CONFIG[market].assetName,
      status: { in: ["ACTIVE", "MONITOR"] },
    },
  });
}

async function mapHoldingRow(
  holding: Awaited<ReturnType<typeof db.publicEquityHolding.findMany>>[number] & {
    asset: { entityId: string; entity: { name: string } };
  },
): Promise<PublicHoldingRow> {
  const quantity = toNumber(holding.quantity) ?? 0;
  const normalized = normalizeHoldingValues({
    quantity,
    costBasis: toNumber(holding.costBasis),
    marketPrice: toNumber(holding.marketPrice),
    marketValue: toNumber(holding.marketValue),
    unrealisedPnl: toNumber(holding.unrealisedPnl),
  });
  const marketValue = normalized.marketValue;
  const marketValueOmr =
    marketValue != null ? await convertToOmr(marketValue, holding.currency) : null;

  return {
    id: holding.id,
    market: holding.market,
    marketLabel: MARKET_CONFIG[holding.market].shortLabel,
    symbol: holding.symbol,
    name: holding.name,
    quantity,
    costBasis: normalized.costBasis,
    marketPrice: normalized.marketPrice,
    marketValue,
    marketValueOmr,
    unrealisedPnl: normalized.unrealisedPnl,
    broker: holding.broker,
    accountNumber: holding.accountNumber,
    exchange: holding.exchange,
    isin: holding.isin,
    cusip: holding.cusip,
    sedol: holding.sedol,
    country: holding.country,
    source: holding.source,
    currency: holding.currency,
    asOfDate: holding.asOfDate,
    priceFetchedAt: holding.priceFetchedAt ?? null,
    priceSource: holding.priceSource ?? null,
    updatedAt: holding.updatedAt,
    entityId: holding.asset.entityId,
    entityName: holding.asset.entity.name,
  };
}

export async function getPublicHoldings(
  ctx: UserContext,
  options: { entityId?: string; market?: PublicMarket | null } = {},
): Promise<PublicHoldingRow[]> {
  await ensurePublicMarketsDataLayerReady();
  const entityFilter = assetEntityFilter(ctx);
  const { entityId, market } = options;

  const assets = await db.asset.findMany({
    where: {
      ...entityFilter,
      ...(entityId ? { entityId } : {}),
      category: "PUBLIC_EQUITY",
      name: market
        ? MARKET_CONFIG[market].assetName
        : { in: PUBLIC_MARKET_ORDER.map((m) => MARKET_CONFIG[m].assetName) },
    },
    select: { id: true },
  });

  if (assets.length === 0) return [];

  const holdings = await db.publicEquityHolding.findMany({
    where: {
      assetId: { in: assets.map((asset) => asset.id) },
      ...(market ? { market } : {}),
    },
    include: {
      asset: {
        select: {
          entityId: true,
          entity: { select: { name: true } },
        },
      },
    },
    orderBy: [{ market: "asc" }, { broker: "asc" }, { symbol: "asc" }],
  });

  return Promise.all(holdings.map(mapHoldingRow));
}

export async function getPublicImportBatches(
  ctx: UserContext,
  options: { market?: PublicMarket | null; limit?: number } = {},
): Promise<PublicImportBatchRow[]> {
  await ensurePublicMarketsDataLayerReady();
  const { market, limit = 15 } = options;
  const entityFilter = assetEntityFilter(ctx);

  const assets = await db.asset.findMany({
    where: {
      ...entityFilter,
      category: "PUBLIC_EQUITY",
      name: market
        ? MARKET_CONFIG[market].assetName
        : { in: PUBLIC_MARKET_ORDER.map((m) => MARKET_CONFIG[m].assetName) },
    },
    select: { id: true },
  });

  if (assets.length === 0) return [];

  const batches = await db.importBatch.findMany({
    where: {
      holdings: {
        some: {
          assetId: { in: assets.map((asset) => asset.id) },
          ...(market ? { market } : {}),
        },
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
    market: batch.market,
    marketLabel: batch.market ? MARKET_CONFIG[batch.market].shortLabel : null,
    broker: batch.broker,
    accountNumber: batch.accountNumber,
    asOfDate: batch.asOfDate,
    parserId: batch.parserId,
    createdAt: batch.createdAt,
  }));
}

async function buildMarketSummary(
  entity: { id: string; name: string },
  market: PublicMarket,
): Promise<PublicMarketSummary> {
  const config = MARKET_CONFIG[market];
  const asset = await findPortfolioAsset(entity.id, market);
  const holdings = asset
    ? await db.publicEquityHolding.findMany({ where: { assetId: asset.id, market } })
    : [];

  const brokers = new Set(holdings.map((holding) => holding.broker).filter(Boolean));

  let totalMarketValue = 0;
  let totalCostBasis = 0;
  let totalUnrealisedPnl = 0;
  let totalMarketValueOmr = 0;
  let lastUpdated: Date | null = null;
  let lastPriceRefresh: Date | null = null;

  for (const holding of holdings) {
    const normalized = normalizeHoldingValues({
      quantity: toNumber(holding.quantity) ?? 0,
      costBasis: toNumber(holding.costBasis),
      marketPrice: toNumber(holding.marketPrice),
      marketValue: toNumber(holding.marketValue),
      unrealisedPnl: toNumber(holding.unrealisedPnl),
    });
    const marketValue = normalized.marketValue ?? 0;
    totalMarketValue += marketValue;
    totalCostBasis += normalized.costBasis ?? 0;
    totalUnrealisedPnl += normalized.unrealisedPnl ?? 0;
    totalMarketValueOmr += await convertToOmr(marketValue, holding.currency);
    if (!lastUpdated || holding.updatedAt > lastUpdated) {
      lastUpdated = holding.updatedAt;
    }
    if (
      holding.priceFetchedAt &&
      (!lastPriceRefresh || holding.priceFetchedAt > lastPriceRefresh)
    ) {
      lastPriceRefresh = holding.priceFetchedAt;
    }
  }

  return {
    market,
    label: config.label,
    shortLabel: config.shortLabel,
    assetId: asset?.id ?? null,
    entityId: entity.id,
    entityName: entity.name,
    totalMarketValue,
    totalMarketValueOmr,
    totalCostBasis,
    totalUnrealisedPnl,
    holdingCount: holdings.length,
    brokerCount: brokers.size,
    currency: config.currency,
    lastUpdated,
    lastPriceRefresh,
  };
}

export async function getPublicMarketSummary(
  ctx: UserContext,
  entityId: string | undefined,
  market: PublicMarket,
): Promise<PublicMarketSummary | null> {
  await ensurePublicMarketsDataLayerReady();
  const entity = entityId
    ? await db.entity.findFirst({ where: { id: entityId } })
    : await db.entity.findFirst({ orderBy: { name: "asc" } });

  if (!entity) return null;

  return buildMarketSummary(entity, market);
}

export async function getAllMarketsSummary(
  ctx: UserContext,
  entityId?: string,
): Promise<AllMarketsSummary | null> {
  await ensurePublicMarketsDataLayerReady();
  const entity = entityId
    ? await db.entity.findFirst({ where: { id: entityId } })
    : await db.entity.findFirst({ orderBy: { name: "asc" } });

  if (!entity) return null;

  const byMarket = await Promise.all(
    PUBLIC_MARKET_ORDER.map((market) => buildMarketSummary(entity, market)),
  );

  const activeMarkets = byMarket.filter((summary) => summary.holdingCount > 0);

  return {
    entityId: entity.id,
    entityName: entity.name,
    totalMarketValueOmr: activeMarkets.reduce((sum, m) => sum + m.totalMarketValueOmr, 0),
    totalCostBasisOmr: await Promise.all(
      activeMarkets.map(async (m) => convertToOmr(m.totalCostBasis, m.currency)),
    ).then((values) => values.reduce((sum, v) => sum + v, 0)),
    totalUnrealisedPnlOmr: await Promise.all(
      activeMarkets.map(async (m) => convertToOmr(m.totalUnrealisedPnl, m.currency)),
    ).then((values) => values.reduce((sum, v) => sum + v, 0)),
    holdingCount: activeMarkets.reduce((sum, m) => sum + m.holdingCount, 0),
    brokerCount: new Set(
      (
        await getPublicHoldings(ctx, { entityId: entity.id })
      )
        .map((h) => h.broker)
        .filter(Boolean),
    ).size,
    marketCount: activeMarkets.length,
    lastUpdated: activeMarkets.reduce<Date | null>((latest, m) => {
      if (!m.lastUpdated) return latest;
      if (!latest || m.lastUpdated > latest) return m.lastUpdated;
      return latest;
    }, null),
    lastPriceRefresh: activeMarkets.reduce<Date | null>((latest, m) => {
      if (!m.lastPriceRefresh) return latest;
      if (!latest || m.lastPriceRefresh > latest) return m.lastPriceRefresh;
      return latest;
    }, null),
    byMarket,
  };
}

export async function listPublicMarketsEntities(ctx: UserContext) {
  await ensurePublicMarketsDataLayerReady();
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

export function resolveMarketFromSearchParam(marketParam?: string | null) {
  if (isAllMarketsSlug(marketParam)) {
    return { mode: "all" as const, market: null };
  }
  const market = marketFromSlug(marketParam);
  return { mode: "single" as const, market: market ?? "MSX" };
}
