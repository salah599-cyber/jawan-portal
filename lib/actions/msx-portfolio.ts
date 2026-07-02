"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit/log";
import { MSX_PORTFOLIO_ASSET_NAME } from "@/lib/msx/constants";
import { parseBrokerReport } from "@/lib/msx/parse-report";
import type { BrokerReportFile, ImportFileResult } from "@/lib/msx/types";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { MAX_UPLOAD_BYTES } from "@/lib/upload-limits";

const MSX_PATH = "/portfolio/msx";

function getFilesFromFormData(formData: FormData, field: string): File[] {
  const entries = formData.getAll(field);
  return entries.filter((entry): entry is File => entry instanceof File && entry.size > 0);
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
        asOfDate: parsed.asOfDate,
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
        quantity: holding.quantity.toString(),
        costBasis: holding.costBasis?.toString(),
        marketPrice: holding.marketPrice?.toString(),
        marketValue: holding.marketValue?.toString(),
        unrealisedPnl: holding.unrealisedPnl?.toString(),
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
      asOfDate: parsed.asOfDate,
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

export async function importBrokerReports(formData: FormData): Promise<ImportFileResult[]> {
  const ctx = await requireModuleAccess("ASSETS");
  if (!canWrite(ctx, "ASSETS")) {
    throw new Error("You do not have permission to import brokerage reports.");
  }

  const entityId = String(formData.get("entityId") ?? "").trim();
  if (!entityId) {
    throw new Error("Entity is required.");
  }

  if (ctx.entityIds.length > 0 && !ctx.entityIds.includes(entityId)) {
    throw new Error("You do not have access to this entity.");
  }

  const files = getFilesFromFormData(formData, "files");
  if (files.length === 0) {
    throw new Error("Select at least one brokerage report to upload.");
  }

  for (const file of files) {
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new Error(`${file.name} exceeds the maximum upload size.`);
    }
  }

  const asset = await ensureMsxPortfolioAsset(entityId);
  const reportFiles: BrokerReportFile[] = await Promise.all(
    files.map(async (file) => ({
      fileName: file.name,
      buffer: Buffer.from(await file.arrayBuffer()),
      mimeType: file.type || "application/octet-stream",
    })),
  );

  const results = await Promise.all(
    reportFiles.map((file) => importSingleReport(asset.id, ctx.email, file)),
  );

  await refreshAssetValue(asset.id);

  const importedCount = results.reduce((sum, result) => sum + result.holdingsImported, 0);
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

  revalidatePath(MSX_PATH);
  revalidatePath("/dashboard");
  revalidatePath("/assets");

  return results;
}

export async function deleteMsxHolding(holdingId: string) {
  const ctx = await requireModuleAccess("ASSETS");
  if (!canWrite(ctx, "ASSETS")) {
    throw new Error("You do not have permission to delete holdings.");
  }

  const holding = await db.publicEquityHolding.findUnique({
    where: { id: holdingId },
    include: { asset: true },
  });

  if (!holding) {
    throw new Error("Holding not found.");
  }

  if (ctx.entityIds.length > 0 && !ctx.entityIds.includes(holding.asset.entityId)) {
    throw new Error("You do not have access to this holding.");
  }

  await db.publicEquityHolding.delete({ where: { id: holdingId } });
  await refreshAssetValue(holding.assetId);

  await logAudit({
    userId: ctx.id,
    action: "DELETE",
    resource: "msx_holding",
    resourceId: holdingId,
    metadata: { symbol: holding.symbol, broker: holding.broker },
  });

  revalidatePath(MSX_PATH);
  revalidatePath("/dashboard");
}
