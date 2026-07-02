import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit/log";
import { MSX_PORTFOLIO_ASSET_NAME } from "@/lib/msx/constants";
import { parseBrokerReport } from "@/lib/msx/parse-report";
import type { BrokerReportFile, ImportFileResult } from "@/lib/msx/types";
import type { UserContext } from "@/lib/permissions/types";

const MSX_PATH = "/portfolio/msx";

function toDecimalString(
  value: number | undefined,
  fractionDigits: number,
): string | undefined {
  if (value == null || Number.isNaN(value)) return undefined;
  return value.toFixed(fractionDigits);
}

async function ensureMsxPortfolioAsset(entityId: string) {
  const existing = await db.asset.findFirst({
    where: {
      entityId,
      category: "PUBLIC_EQUITY",
      name: MSX_PORTFOLIO_ASSET_NAME,
      status: { in: ["ACTIVE", "MONITOR"] },
    },
  });

  if (existing) return existing;

  return db.asset.create({
    data: {
      name: MSX_PORTFOLIO_ASSET_NAME,
      category: "PUBLIC_EQUITY",
      entityId,
      status: "ACTIVE",
      currency: "OMR",
      custom: { create: {} },
    },
  });
}

async function refreshAssetValue(assetId: string) {
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
  userEmail: string,
  file: BrokerReportFile,
): Promise<ImportFileResult> {
  try {
    const parsed = await parseBrokerReport(file);

    if (parsed.holdings.length === 0) {
      return {
        fileName: file.fileName,
        broker: parsed.broker,
        accountNumber: parsed.accountNumber,
        asOfDate: parsed.asOfDate?.toISOString(),
        holdingsImported: 0,
        warnings: parsed.warnings,
        error: "No holdings found in this report.",
      };
    }

    const batch = await db.importBatch.create({
      data: {
        fileName: file.fileName,
        uploadedBy: userEmail,
        rowCount: parsed.holdings.length,
      },
    });

    await db.publicEquityHolding.deleteMany({
      where: {
        assetId,
        broker: parsed.broker,
        ...(parsed.accountNumber ? { accountNumber: parsed.accountNumber } : {}),
      },
    });

    await db.publicEquityHolding.createMany({
      data: parsed.holdings.map((holding) => ({
        assetId,
        symbol: holding.symbol,
        name: holding.name,
        quantity: toDecimalString(holding.quantity, 6) ?? "0",
        costBasis: toDecimalString(holding.costBasis, 2),
        marketPrice: toDecimalString(holding.marketPrice, 4),
        marketValue: toDecimalString(holding.marketValue, 2),
        unrealisedPnl: toDecimalString(holding.unrealisedPnl, 2),
        broker: parsed.broker,
        accountNumber: parsed.accountNumber,
        currency: holding.currency ?? "OMR",
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
  files: BrokerReportFile[],
): Promise<ImportFileResult[]> {
  const asset = await ensureMsxPortfolioAsset(entityId);

  const results = await Promise.all(
    files.map((file) => importSingleReport(asset.id, ctx.email, file)),
  );

  await refreshAssetValue(asset.id);

  const importedCount = results.reduce((sum, result) => sum + result.holdingsImported, 0);

  try {
    await logAudit({
      userId: ctx.id,
      action: "IMPORT",
      resource: "msx_portfolio",
      resourceId: asset.id,
      metadata: {
        entityId,
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

  revalidatePath(MSX_PATH);
  revalidatePath("/dashboard");
  revalidatePath("/assets");

  return results;
}
