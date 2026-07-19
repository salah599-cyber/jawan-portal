import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit/log";
import type { PublicMarket } from "@/lib/generated/prisma/client";
import {
  getBrokerAccountForImport,
} from "@/lib/public-markets/broker-accounts";
import { MARKET_CONFIG, PUBLIC_MARKETS_PATH } from "@/lib/public-markets/constants";
import { ensurePublicMarketsSchema } from "@/lib/db/ensure-public-markets-schema";
import { parseMarketReport } from "@/lib/public-markets/parsers/router";
import type { BrokerReportFile, ImportFileResult } from "@/lib/public-markets/types";
import type { UserContext } from "@/lib/permissions/types";
import { normalizeAndFormatHoldingValues } from "@/lib/public-markets/valuation";
import { recordAssetValuation } from "@/lib/portfolio/valuations";
import { refreshPublicMarketPrices } from "@/lib/public-markets/refresh-prices";
import { hasAutomaticPriceRefresh } from "@/lib/public-markets/prices/symbols";
import { buildImportHoldingReplaceScope, resolveImportManagementType } from "@/lib/public-markets/import-scope";

export type ImportBrokerReportsOptions = {
  brokerAccountId: string;
  isManaged?: boolean | null;
};

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
  userEmail: string,
  file: BrokerReportFile,
  options: ImportBrokerReportsOptions & {
    broker: string;
    accountNumber: string | null;
    isManaged: boolean;
    brokerAccountId: string;
  },
): Promise<ImportFileResult> {
  try {
    const parsed = await parseMarketReport(file, market);
    const broker = options.broker;
    const accountNumber = options.accountNumber;
    const isManaged = options.isManaged;

    if (parsed.holdings.length === 0) {
      return {
        fileName: file.fileName,
        broker,
        accountNumber: accountNumber ?? undefined,
        isManaged,
        brokerAccountId: options.brokerAccountId,
        asOfDate: parsed.asOfDate?.toISOString(),
        holdingsImported: 0,
        warnings: parsed.warnings,
        parserId: parsed.parserId,
        error: "No holdings found in this report.",
      };
    }

    const holdingsImported = await db.$transaction(async (tx) => {
      const batch = await tx.importBatch.create({
        data: {
          fileName: file.fileName,
          uploadedBy: userEmail,
          rowCount: parsed.holdings.length,
          market,
          broker,
          accountNumber,
          brokerAccountId: options.brokerAccountId,
          isManaged,
          asOfDate: parsed.asOfDate,
          parserId: parsed.parserId,
        },
      });

      const scope = buildImportHoldingReplaceScope({
        assetId,
        market,
        brokerAccountId: options.brokerAccountId,
        isManaged,
      });

      const existingHoldings = await tx.publicEquityHolding.findMany({ where: scope });
      const existingBySymbol = new Map(existingHoldings.map((holding) => [holding.symbol, holding]));
      const importedSymbols = parsed.holdings.map((holding) => holding.symbol);

      for (const holding of parsed.holdings) {
        const { decimals } = normalizeAndFormatHoldingValues({
          quantity: holding.quantity,
          costBasis: holding.costBasis,
          marketPrice: holding.marketPrice,
          marketValue: holding.marketValue,
          unrealisedPnl: holding.unrealisedPnl,
        });

        const data = {
          assetId,
          market,
          symbol: holding.symbol,
          name: holding.name,
          quantity: holding.quantity.toFixed(6),
          costBasis: decimals.costBasis,
          marketPrice: decimals.marketPrice,
          marketValue: decimals.marketValue,
          unrealisedPnl: decimals.unrealisedPnl,
          priceSource: "BROKER",
          broker,
          accountNumber,
          brokerAccountId: options.brokerAccountId,
          isManaged,
          exchange: holding.exchange,
          isin: holding.isin,
          cusip: holding.cusip,
          sedol: holding.sedol,
          country: holding.country ?? MARKET_CONFIG[market].country,
          source: "IMPORT" as const,
          currency: holding.currency ?? MARKET_CONFIG[market].currency,
          asOfDate: parsed.asOfDate,
          importBatchId: batch.id,
        };

        const existing = existingBySymbol.get(holding.symbol);
        if (existing) {
          await tx.publicEquityHolding.update({
            where: { id: existing.id },
            data,
          });
        } else {
          await tx.publicEquityHolding.create({ data });
        }
      }

      await tx.publicEquityHolding.deleteMany({
        where: {
          ...scope,
          symbol: { notIn: importedSymbols },
        },
      });

      return parsed.holdings.length;
    });

    return {
      fileName: file.fileName,
      broker,
      accountNumber: accountNumber ?? undefined,
      brokerAccountId: options.brokerAccountId,
      isManaged,
      asOfDate: parsed.asOfDate?.toISOString(),
      holdingsImported,
      warnings: parsed.warnings,
      parserId: parsed.parserId,
    };
  } catch (error) {
    return {
      fileName: file.fileName,
      broker: options.broker,
      accountNumber: options.accountNumber ?? undefined,
      brokerAccountId: options.brokerAccountId,
      isManaged: options.isManaged,
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
  importOptions: ImportBrokerReportsOptions,
): Promise<ImportFileResult[]> {
  await ensurePublicMarketsSchema();

  if (!importOptions.brokerAccountId?.trim()) {
    throw new Error("Select a broker account before importing.");
  }

  const brokerAccount = await getBrokerAccountForImport(
    ctx,
    entityId,
    importOptions.brokerAccountId.trim(),
  );
  const isManaged = resolveImportManagementType(brokerAccount, importOptions.isManaged);
  const asset = await ensurePortfolioAsset(entityId, market);

  const results: ImportFileResult[] = [];
  for (const file of files) {
    const result = await importSingleReport(asset.id, market, ctx.email, file, {
      brokerAccountId: brokerAccount.id,
      broker: brokerAccount.broker,
      accountNumber: brokerAccount.accountNumber,
      isManaged,
    });
    results.push(result);
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
        brokerAccountId: brokerAccount.id,
        isManaged,
        fileCount: files.length,
        holdingsImported: importedCount,
        results: results.map((result) => ({
          fileName: result.fileName,
          broker: result.broker,
          isManaged: result.isManaged,
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
