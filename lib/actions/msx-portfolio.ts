"use server";

import { revalidatePath } from "next/cache";
import { importBrokerReportsForEntity } from "@/lib/public-markets/import-reports";
import { parseImportOptionsFromFormData } from "@/lib/public-markets/import-options";
import type { ImportFileResult } from "@/lib/msx/types";
import { deletePublicHolding } from "@/lib/actions/public-markets";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { MAX_UPLOAD_BYTES } from "@/lib/upload-limits";

const MSX_PATH = "/portfolio/msx";

function getFilesFromFormData(formData: FormData, field: string): File[] {
  const entries = formData.getAll(field);
  return entries.filter((entry): entry is File => entry instanceof File && entry.size > 0);
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

  return importBrokerReportsForEntity(ctx, entityId, "MSX", reportFiles, parseImportOptionsFromFormData(formData));
}

export async function deleteMsxHolding(holdingId: string) {
  await deletePublicHolding(holdingId);
  revalidatePath(MSX_PATH);
}
