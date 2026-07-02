import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit/log";
import type { PublicMarket } from "@/lib/generated/prisma/client";
import { MARKET_CONFIG, PUBLIC_MARKETS_PATH } from "@/lib/public-markets/constants";
import { ensurePublicMarketsSchema } from "@/lib/db/ensure-public-markets-schema";
import { parseMarketReport } from "@/lib/public-markets/parsers/router";
import type { BrokerReportFile, ImportFileResult } from "@/lib/public-markets/types";
import type { UserContext } from "@/lib/permissions/types";

function toDecimalString(
  value: number | undefined,
  fractionDigits: number,
): string | undefined {
  if (value == null || Number.isNaN(value)) return undefined;
  return value.toFixed(fractionDigits);
}

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

  await db.asset.update({
    where: { id: assetId },
    data: {
      currentValue: total > 0 ? total.toString() : null,
      valueUpdatedAt: new Date(),
    },
  });
}

async function importSingleReport(
  assetId: string,
  market: PublicMarket,
  userEmail: string,
  file: BrokerReportFile,
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

    const batch = await db.importBatch.create({
      data: {
        fileName: file.fileName,
        uploadedBy: userEmail,
        rowCount: parsed.holdings.length,
        market,
        broker: parsed.broker,
        accountNumber: parsed.accountNumber,
        asOfDate: parsed.asOfDate,
        parserId: parsed.parserId,
      },
    });

    await db.publicEquityHolding.deleteMany({
      where: {
        assetId,
        market,
        broker: parsed.broker,
        source: "IMPORT",
        ...(parsed.accountNumber ? { accountNumber: parsed.accountNumber } : {}),
      },
    });

    await db.publicEquityHolding.createMany({
      data: parsed.holdings.map((holding) => ({
        assetId,
        market,
        symbol: holding.symbol,
        name: holding.name,
        quantity: toDecimalString(holding.quantity, 6) ?? "0",
        costBasis: toDecimalString(holding.costBasis, 2),
        marketPrice: toDecimalString(holding.marketPrice, 4),
        marketValue: toDecimalString(holding.marketValue, 2),
        unrealisedPnl: toDecimalString(holding.unrealisedPnl, 2),
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
      })),
    });

    return {
      fileName: file.fileName,
      broker: parsed.broker,
      accountNumber: parsed.accountNumber,
      asOfDate: parsed.asOfDate?.toISOString(),
      holdingsImported: parsed.holdings.length,
      warnings: parsed.warnings,
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
  files: BrokerReportFile[],
): Promise<ImportFileResult[]> {
  await ensurePublicMarketsSchema();
  const asset = await ensurePortfolioAsset(entityId, market);

  const results = await Promise.all(
    files.map((file) => importSingleReport(asset.id, market, ctx.email, file)),
  );

  await refreshAssetValue(asset.id);

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
        fileCount: files.length,
        holdingsImported: importedCount,
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
