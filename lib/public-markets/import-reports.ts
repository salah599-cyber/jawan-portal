import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit/log";
import type { PublicMarket } from "@/lib/generated/prisma/client";
import { MARKET_CONFIG, PUBLIC_MARKETS_PATH } from "@/lib/public-markets/constants";
import { ensurePublicMarketsSchema } from "@/lib/db/ensure-public-markets-schema";
import { parseMarketReport } from "@/lib/public-markets/parsers/router";
import type { BrokerReportFile, ImportFileResult } from "@/lib/public-markets/types";
import type { UserContext } from "@/lib/permissions/types";
import { normalizeAndFormatHoldingValues } from "@/lib/public-markets/valuation";
import { recordAssetValuation } from "@/lib/portfolio/valuations";
import { refreshPublicMarketPrices } from "@/lib/public-markets/refresh-prices";
import { hasAutomaticPriceRefresh } from "@/lib/public-markets/prices/symbols";
import { formatOverlapResolutionSummary } from "@/lib/public-markets/import-warnings";
import { getManualEquityHoldings } from "@/lib/public-markets/import-preview";
import {
  groupManualEquityHoldings,
  parseOverlapResolution,
  resolveImportHoldings,
  type ManualEquitySnapshot,
  type OverlapResolutionStrategy,
} from "@/lib/public-markets/overlap-resolution";

export async function ensurePortfolioAsset(entityId: string, market: PublicMarket) {
  const config = MARKET_CONFIG[market];

  const existing = await db.asset.findFirst({
    where: {
      entityId,
      category: "PUBLIC_EQUITY",
      name: config.assetName,
      status: { in: ["ACTIVE", "MONITOR"] },
    },
  });

  if (existing) return existing;

  return db.asset.create({
    data: {
      name: config.assetName,
      category: "PUBLIC_EQUITY",
      entityId,
      status: "ACTIVE",
      currency: config.currency,
      custom: { create: {} },
    },
  });
}

export async function refreshAssetValue(assetId: string) {
  const holdings = await db.publicEquityHolding.findMany({ where: { assetId } });
  const total = holdings.reduce((sum, holding) => {
    const value = holding.marketValue ? parseFloat(holding.marketValue.toString()) : 0;
    return sum + (Number.isNaN(value) ? 0 : value);
  }, 0);

  const asset = await db.asset.findUnique({
    where: { id: assetId },
    select: { currency: true },
  });
  if (!asset) return;

  await db.asset.update({
    where: { id: assetId },
    data: {
      currentValue: total > 0 ? total.toString() : null,
      valueUpdatedAt: new Date(),
    },
  });

  if (total > 0) {
    await recordAssetValuation({
      assetId,
      value: total,
      currency: asset.currency,
    });
  }
}

async function importSingleReport(
  assetId: string,
  market: PublicMarket,
  managedPortfolioId: string,
  userEmail: string,
  file: BrokerReportFile,
  manualBySymbol: Map<string, ManualEquitySnapshot[]>,
  overlapResolution: OverlapResolutionStrategy,
): Promise<ImportFileResult> {
  try {
    const parsed = await parseMarketReport(file, market);

    if (parsed.holdings.length === 0) {
      return {
        fileName: file.fileName,
        broker: parsed.broker,
        accountNumber: parsed.accountNumber,
        asOfDate: parsed.asOfDate?.toISOString(),
        holdingsImported: 0,
        warnings: parsed.warnings,
        parserId: parsed.parserId,
        error: "No holdings found in this report.",
      };
    }

    const resolution = resolveImportHoldings(
      parsed.holdings,
      manualBySymbol,
      overlapResolution,
    );

    if (resolution.manualIdsToDelete.length > 0) {
      await db.publicEquityHolding.deleteMany({
        where: {
          assetId,
          managedPortfolioId,
          id: { in: resolution.manualIdsToDelete },
        },
      });
    }

    const batch = await db.importBatch.create({
      data: {
        fileName: file.fileName,
        uploadedBy: userEmail,
        rowCount: resolution.holdings.length,
        market,
        broker: parsed.broker,
        accountNumber: parsed.accountNumber,
        asOfDate: parsed.asOfDate,
        parserId: parsed.parserId,
        managedPortfolioId,
      },
    });

    await db.publicEquityHolding.deleteMany({
      where: {
        assetId,
        market,
        managedPortfolioId,
        broker: parsed.broker,
        source: "IMPORT",
        ...(parsed.accountNumber ? { accountNumber: parsed.accountNumber } : {}),
      },
    });

    if (resolution.holdings.length > 0) {
      await db.publicEquityHolding.createMany({
        data: resolution.holdings.map((holding) => {
          const { decimals } = normalizeAndFormatHoldingValues({
            quantity: holding.quantity,
            costBasis: holding.costBasis,
            marketPrice: holding.marketPrice,
            marketValue: holding.marketValue,
            unrealisedPnl: holding.unrealisedPnl,
          });

          return {
            assetId,
            managedPortfolioId,
            market,
            symbol: holding.symbol,
            name: holding.name,
            quantity: holding.quantity.toFixed(6),
            costBasis: decimals.costBasis,
            marketPrice: decimals.marketPrice,
            marketValue: decimals.marketValue,
            unrealisedPnl: decimals.unrealisedPnl,
            priceSource: "BROKER",
            broker: parsed.broker,
            accountNumber: parsed.accountNumber,
            exchange: holding.exchange,
            isin: holding.isin,
            cusip: holding.cusip,
            sedol: holding.sedol,
            country: holding.country ?? MARKET_CONFIG[market].country,
            source: "IMPORT",
            currency: holding.currency ?? MARKET_CONFIG[market].currency,
            asOfDate: parsed.asOfDate,
            importBatchId: batch.id,
          };
        }),
      });
    }

    const resolutionWarnings = [
      formatOverlapResolutionSummary(overlapResolution, resolution.skippedSymbols),
      formatOverlapResolutionSummary("replace_manual", resolution.replacedSymbols),
      formatOverlapResolutionSummary("merge", resolution.mergedSymbols),
    ].filter((warning): warning is string => Boolean(warning));

    return {
      fileName: file.fileName,
      broker: parsed.broker,
      accountNumber: parsed.accountNumber,
      asOfDate: parsed.asOfDate?.toISOString(),
      holdingsImported: resolution.holdings.length,
      warnings: [...parsed.warnings, ...resolutionWarnings],
      parserId: parsed.parserId,
    };
  } catch (error) {
    return {
      fileName: file.fileName,
      broker: "Unknown",
      holdingsImported: 0,
      warnings: [],
      error: error instanceof Error ? error.message : "Failed to parse report.",
    };
  }
}

export async function importBrokerReportsForEntity(
  ctx: UserContext,
  entityId: string,
  market: PublicMarket,
  managedPortfolioId: string,
  files: BrokerReportFile[],
  overlapResolutionInput?: string | null,
): Promise<ImportFileResult[]> {
  await ensurePublicMarketsSchema();

  const portfolio = await db.managedPortfolio.findFirst({
    where: { id: managedPortfolioId, entityId, status: { in: ["ACTIVE", "MONITOR"] } },
  });

  if (!portfolio) {
    throw new Error("Managed portfolio not found for this entity.");
  }

  const asset = await ensurePortfolioAsset(entityId, market);
  const overlapResolution = parseOverlapResolution(overlapResolutionInput);
  const manualHoldings = await getManualEquityHoldings(entityId, market, managedPortfolioId);
  const manualBySymbol = groupManualEquityHoldings(manualHoldings);

  const results: ImportFileResult[] = [];
  for (const file of files) {
    results.push(
      await importSingleReport(
        asset.id,
        market,
        managedPortfolioId,
        ctx.email,
        file,
        manualBySymbol,
        overlapResolution,
      ),
    );
  }

  await refreshAssetValue(asset.id);

  if (hasAutomaticPriceRefresh(market)) {
    try {
      await refreshPublicMarketPrices({ entityId, market });
    } catch {
      // Automatic price refresh should not block a successful import.
    }
  }

  const importedCount = results.reduce((sum, result) => sum + result.holdingsImported, 0);

  try {
    await logAudit({
      userId: ctx.id,
      action: "IMPORT",
      resource: "public_markets",
      resourceId: asset.id,
      metadata: {
        entityId,
        market,
        managedPortfolioId,
        fileCount: files.length,
        holdingsImported: importedCount,
        overlapResolution,
        results: results.map((result) => ({
          fileName: result.fileName,
          broker: result.broker,
          holdingsImported: result.holdingsImported,
          error: result.error,
        })),
      },
    });
  } catch {
    // Audit logging should not block a successful import.
  }

  revalidatePath(PUBLIC_MARKETS_PATH);
  revalidatePath("/portfolio/msx");
  revalidatePath("/dashboard");
  revalidatePath("/assets");

  return results;
}
