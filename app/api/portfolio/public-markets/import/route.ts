import { NextResponse } from "next/server";
import { importBrokerReportsForEntity } from "@/lib/public-markets/import-reports";
import type { BrokerReportFile } from "@/lib/public-markets/types";
import type { PublicMarket } from "@/lib/generated/prisma/client";
import { MARKET_CONFIG } from "@/lib/public-markets/constants";
import { canWrite, getCurrentUserContext } from "@/lib/permissions/access";
import { MAX_UPLOAD_BYTES } from "@/lib/upload-limits";

export const maxDuration = 60;

function getFilesFromFormData(formData: FormData): File[] {
  return formData
    .getAll("files")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);
}

function parseMarket(value: string): PublicMarket {
  const market = value.trim().toUpperCase() as PublicMarket;
  if (!(market in MARKET_CONFIG)) {
    throw new Error("Invalid market.");
  }
  return market;
}

export async function POST(request: Request): Promise<NextResponse> {
  const ctx = await getCurrentUserContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canWrite(ctx, "ASSETS")) {
    return NextResponse.json(
      { error: "You do not have permission to import brokerage reports." },
      { status: 403 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload request." }, { status: 400 });
  }

  const entityId = String(formData.get("entityId") ?? "").trim();
  const market = parseMarket(String(formData.get("market") ?? "MSX"));

  if (!entityId) {
    return NextResponse.json({ error: "Entity is required." }, { status: 400 });
  }

  if (ctx.entityIds.length > 0 && !ctx.entityIds.includes(entityId)) {
    return NextResponse.json({ error: "You do not have access to this entity." }, { status: 403 });
  }

  const files = getFilesFromFormData(formData);
  if (files.length === 0) {
    return NextResponse.json(
      { error: "Select at least one brokerage report to upload." },
      { status: 400 },
    );
  }

  for (const file of files) {
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: `${file.name} exceeds the maximum upload size.` },
        { status: 413 },
      );
    }
  }

  try {
    const reportFiles: BrokerReportFile[] = await Promise.all(
      files.map(async (file) => ({
        fileName: file.name,
        buffer: Buffer.from(await file.arrayBuffer()),
        mimeType: file.type || "application/octet-stream",
      })),
    );

    const results = await importBrokerReportsForEntity(ctx, entityId, market, reportFiles);
    return NextResponse.json({ results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to import reports.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
