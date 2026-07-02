"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit/log";
import { importBrokerReportsForEntity } from "@/lib/msx/import-reports";
import type { ImportFileResult } from "@/lib/msx/types";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { MAX_UPLOAD_BYTES } from "@/lib/upload-limits";

const MSX_PATH = "/portfolio/msx";

function getFilesFromFormData(formData: FormData, field: string): File[] {
  const entries = formData.getAll(field);
  return entries.filter((entry): entry is File => entry instanceof File && entry.size > 0);
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

  const reportFiles = await Promise.all(
    files.map(async (file) => ({
      fileName: file.name,
      buffer: Buffer.from(await file.arrayBuffer()),
      mimeType: file.type || "application/octet-stream",
    })),
  );

  return importBrokerReportsForEntity(ctx, entityId, reportFiles);
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
