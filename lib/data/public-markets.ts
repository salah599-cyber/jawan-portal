import { db } from "@/lib/db";
import type { PublicInstrumentType, PublicMarket, PublicOptionType } from "@/lib/generated/prisma/client";
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
  instrumentType: PublicInstrumentType;
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
  brokerAccountId: string | null;
  brokerAccountLabel: string | null;
  isManaged: boolean;
  exchange: string | null;
  isin: string | null;
  cusip: string | null;
  sedol: string | null;
  country: string | null;
  source: string;
  managedPortfolioId: string | null;
  managedPortfolioName: string | null;
  managedPortfolioLabel: string;
  currency: string;
  asOfDate: Date | null;
  priceFetchedAt: Date | null;
  priceSource: string | null;
  updatedAt: Date;
  entityId: string;
  entityName: string;
  option: {
    underlyingSymbol: string;
    optionType: PublicOptionType;
    strikePrice: number;
    expiryDate: Date;
    contractMultiplier: number;
    premiumPaid: number | null;
  } | null;
  structuredNote: {
    issuer: string;
    productName: string;
    notionalAmount: number;
    issueDate: Date | null;
    maturityDate: Date;
    couponRate: number | null;
    barrierLevel: number | null;
    payoffNotes: string | null;
  } | null;
  crypto: {
    coinGeckoId: string;
    custodian: string | null;
  } | null;
  bond: {
    bondName: string;
    faceValue: number;
    pricePercent: number | null;
  } | null;
};

export type PublicImportBatchRow = {
  id: string;
  fileName: string;
  uploadedBy: string;
  rowCount: number;
  market: PublicMarket | null;
  marketLabel: string | null;
  managedPortfolioLabel: string | null;
  broker: string | null;
  accountNumber: string | null;
  isManaged: boolean;
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
  equityCount: number;
  optionCount: number;
  structuredNoteCount: number;
  cryptoCount: number;
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
  equityCount: number;
  optionCount: number;
  structuredNoteCount: number;
  cryptoCount: number;
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
    managedPortfolio?: {
      id: string;
      name: string;
      managerName: string;
    } | null;
    optionDetail?: {
      underlyingSymbol: string;
      optionType: PublicOptionType;
      strikePrice: { toString(): string };
      expiryDate: Date;
      contractMultiplier: number;
      premiumPaid: { toString(): string } | null;
    } | null;
    structuredNoteDetail?: {
      issuer: string;
      productName: string;
      notionalAmount: { toString(): string };
      issueDate: Date | null;
      maturityDate: Date;
      couponRate: { toString(): string } | null;
      barrierLevel: { toString(): string } | null;
      payoffNotes: string | null;
    } | null;
    cryptoDetail?: {
      coinGeckoId: string;
      custodian: string | null;
    } | null;
    bondDetail?: {
      bondName: string;
      faceValue: { toString(): string };
      pricePercent: { toString(): string } | null;
    } | null;
    brokerAccount?: {
      label: string | null;
      broker: string;
    } | null;
  },
): Promise<PublicHoldingRow> {
  const quantity = toNumber(holding.quantity) ?? 0;
  const normalized = normalizeHoldingValues({
    quantity,
    costBasis: toNumber(holding.costBasis),
    marketPrice: toNumber(holding.marketPrice),
    marketValue: toNumber(holding.marketValue),
    unrealisedPnl: toNumber(holding.unrealisedPnl),
  }, { costBasisIsTotal: true });
  const marketValue = normalized.marketValue;
  const marketValueOmr =
    marketValue != null ? await convertToOmr(marketValue, holding.currency) : null;

  return {
    id: holding.id,
    market: holding.market,
    marketLabel: MARKET_CONFIG[holding.market].shortLabel,
    instrumentType: holding.instrumentType,
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
    brokerAccountId: holding.brokerAccountId ?? null,
    brokerAccountLabel: holding.brokerAccount?.label ?? holding.brokerAccount?.broker ?? null,
    isManaged: holding.isManaged,
    exchange: holding.exchange,
    isin: holding.isin,
    cusip: holding.cusip,
    sedol: holding.sedol,
    country: holding.country,
    source: holding.source,
    managedPortfolioId: holding.managedPortfolioId ?? null,
    managedPortfolioName: holding.managedPortfolio?.name ?? null,
    managedPortfolioLabel: holding.managedPortfolio
      ? `${holding.managedPortfolio.managerName} — ${holding.managedPortfolio.name}`
      : "Private holdings",
    currency: holding.currency,
    asOfDate: holding.asOfDate,
    priceFetchedAt: holding.priceFetchedAt ?? null,
    priceSource: holding.priceSource ?? null,
    updatedAt: holding.updatedAt,
    entityId: holding.asset.entityId,
    entityName: holding.asset.entity.name,
    option: holding.optionDetail
      ? {
          underlyingSymbol: holding.optionDetail.underlyingSymbol,
          optionType: holding.optionDetail.optionType,
          strikePrice: toNumber(holding.optionDetail.strikePrice) ?? 0,
          expiryDate: holding.optionDetail.expiryDate,
          contractMultiplier: holding.optionDetail.contractMultiplier,
          premiumPaid: toNumber(holding.optionDetail.premiumPaid),
        }
      : null,
    structuredNote: holding.structuredNoteDetail
      ? {
          issuer: holding.structuredNoteDetail.issuer,
          productName: holding.structuredNoteDetail.productName,
          notionalAmount: toNumber(holding.structuredNoteDetail.notionalAmount) ?? 0,
          issueDate: holding.structuredNoteDetail.issueDate,
          maturityDate: holding.structuredNoteDetail.maturityDate,
          couponRate: toNumber(holding.structuredNoteDetail.couponRate),
          barrierLevel: toNumber(holding.structuredNoteDetail.barrierLevel),
          payoffNotes: holding.structuredNoteDetail.payoffNotes,
        }
      : null,
    crypto: holding.cryptoDetail
      ? {
          coinGeckoId: holding.cryptoDetail.coinGeckoId,
          custodian: holding.cryptoDetail.custodian,
        }
      : null,
    bond: holding.bondDetail
      ? {
          bondName: holding.bondDetail.bondName,
          faceValue: toNumber(holding.bondDetail.faceValue) ?? 0,
          pricePercent: toNumber(holding.bondDetail.pricePercent),
        }
      : null,
  };
}

function resolveHoldingsAssetMarket(
  market: PublicMarket | null | undefined,
  instrumentType: PublicInstrumentType | null | undefined,
): PublicMarket | null {
  if (instrumentType === "STRUCTURED_NOTE" || instrumentType === "CRYPTO" || instrumentType === "BOND") {
    return "OTHER";
  }
  return market ?? null;
}

export type PublicManagementFilter = "all" | "managed" | "reference";

export async function getPublicHoldings(
  ctx: UserContext,
  options: {
    entityId?: string;
    market?: PublicMarket | null;
    instrumentType?: PublicInstrumentType | null;
    managedPortfolioId?: string | null | "private";
    management?: PublicManagementFilter;
  } = {},
): Promise<PublicHoldingRow[]> {
  await ensurePublicMarketsDataLayerReady();
  const entityFilter = assetEntityFilter(ctx);
  const { entityId, market, instrumentType, managedPortfolioId, management = "all" } = options;
  const assetMarket = resolveHoldingsAssetMarket(market, instrumentType);

  const assets = await db.asset.findMany({
    where: {
      ...entityFilter,
      ...(entityId ? { entityId } : {}),
      category: "PUBLIC_EQUITY",
      name: assetMarket
        ? MARKET_CONFIG[assetMarket].assetName
        : { in: PUBLIC_MARKET_ORDER.map((m) => MARKET_CONFIG[m].assetName) },
    },
    select: { id: true },
  });

  if (assets.length === 0) return [];

  const portfolioFilter =
    managedPortfolioId === "private"
      ? { managedPortfolioId: null }
      : managedPortfolioId
        ? { managedPortfolioId }
        : {};

  const holdings = await db.publicEquityHolding.findMany({
    where: {
      assetId: { in: assets.map((asset) => asset.id) },
      ...portfolioFilter,
      ...(instrumentType === "STRUCTURED_NOTE" || instrumentType === "CRYPTO" || instrumentType === "BOND"
        ? {}
        : market
          ? { market }
          : {}),
      ...(instrumentType ? { instrumentType } : {}),
      ...(management === "managed" ? { isManaged: true } : {}),
      ...(management === "reference" ? { isManaged: false } : {}),
    },
    include: {
      brokerAccount: { select: { label: true, broker: true } },
      managedPortfolio: {
        select: { id: true, name: true, managerName: true },
      },
      optionDetail: true,
      structuredNoteDetail: true,
      cryptoDetail: true,
      bondDetail: true,
      asset: {
        select: {
          entityId: true,
          entity: { select: { name: true } },
        },
      },
    },
    orderBy: [
      { managedPortfolioId: "asc" },
      { market: "asc" },
      { broker: "asc" },
      { symbol: "asc" },
    ],
  });

  return Promise.all(holdings.map(mapHoldingRow));
}

export async function getPublicImportBatches(
  ctx: UserContext,
  options: {
    market?: PublicMarket | null;
    managedPortfolioId?: string | null;
    limit?: number;
  } = {},
): Promise<PublicImportBatchRow[]> {
  await ensurePublicMarketsDataLayerReady();
  const { market, managedPortfolioId, limit = 15 } = options;
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
      ...(managedPortfolioId ? { managedPortfolioId } : {}),
      holdings: {
        some: {
          assetId: { in: assets.map((asset) => asset.id) },
          ...(market ? { market } : {}),
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      managedPortfolio: {
        select: { managerName: true, name: true },
      },
    },
  });

  return batches.map((batch) => ({
    id: batch.id,
    fileName: batch.fileName,
    uploadedBy: batch.uploadedBy,
    rowCount: batch.rowCount,
    market: batch.market,
    marketLabel: batch.market ? MARKET_CONFIG[batch.market].shortLabel : null,
    managedPortfolioLabel: batch.managedPortfolio
      ? `${batch.managedPortfolio.managerName} — ${batch.managedPortfolio.name}`
      : null,
    broker: batch.broker,
    accountNumber: batch.accountNumber,
    isManaged: batch.isManaged,
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
  let equityCount = 0;
  let optionCount = 0;
  let structuredNoteCount = 0;
  let cryptoCount = 0;

  for (const holding of holdings) {
    if (holding.instrumentType === "EQUITY") equityCount += 1;
    if (holding.instrumentType === "OPTION") optionCount += 1;
    if (holding.instrumentType === "STRUCTURED_NOTE") structuredNoteCount += 1;
    if (holding.instrumentType === "CRYPTO") cryptoCount += 1;
    const normalized = normalizeHoldingValues({
      quantity: toNumber(holding.quantity) ?? 0,
      costBasis: toNumber(holding.costBasis),
      marketPrice: toNumber(holding.marketPrice),
      marketValue: toNumber(holding.marketValue),
      unrealisedPnl: toNumber(holding.unrealisedPnl),
    }, { costBasisIsTotal: true });
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
    equityCount,
    optionCount,
    structuredNoteCount,
    cryptoCount,
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
    equityCount: activeMarkets.reduce((sum, m) => sum + m.equityCount, 0),
    optionCount: activeMarkets.reduce((sum, m) => sum + m.optionCount, 0),
    structuredNoteCount: activeMarkets.reduce((sum, m) => sum + m.structuredNoteCount, 0),
    cryptoCount: activeMarkets.reduce((sum, m) => sum + m.cryptoCount, 0),
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
