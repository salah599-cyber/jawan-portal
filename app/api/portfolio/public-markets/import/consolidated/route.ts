import { NextResponse } from "next/server";
import type { ConsolidatedBrokerAccountMap } from "@/lib/public-markets/consolidated-import";
import {
  importConsolidatedPortfolioForEntity,
  isConsolidatedPortfolioFile,
} from "@/lib/public-markets/consolidated-import";
import type { BrokerReportFile } from "@/lib/public-markets/types";
import { canWrite, getCurrentUserContext } from "@/lib/permissions/access";
import { MAX_UPLOAD_BYTES } from "@/lib/upload-limits";

export const maxDuration = 120;

function parseBrokerAccountMap(formData: FormData): ConsolidatedBrokerAccountMap {
  return {
    safra: String(formData.get("brokerAccountSafra") ?? "").trim() || undefined,
    "kristal-k18518750":
      String(formData.get("brokerAccountKristalK18518750") ?? "").trim() || undefined,
    "kristal-k15875750":
      String(formData.get("brokerAccountKristalK15875750") ?? "").trim() || undefined,
  };
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
  const managedPortfolioId = String(formData.get("managedPortfolioId") ?? "").trim();
  const importCash = String(formData.get("importCash") ?? "true").toLowerCase() !== "false";

  if (!entityId || !managedPortfolioId) {
    return NextResponse.json(
      { error: "Entity and managed portfolio are required." },
      { status: 400 },
    );
  }

  if (ctx.entityIds.length > 0 && !ctx.entityIds.includes(entityId)) {
    return NextResponse.json({ error: "You do not have access to this entity." }, { status: 403 });
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Select a consolidated portfolio file." }, { status: 400 });
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: `${file.name} exceeds the maximum upload size.` },
      { status: 413 },
    );
  }

  const reportFile: BrokerReportFile = {
    fileName: file.name,
    buffer: Buffer.from(await file.arrayBuffer()),
    mimeType: file.type || "application/octet-stream",
  };

  if (!isConsolidatedPortfolioFile(reportFile)) {
    return NextResponse.json(
      { error: "File is not a consolidated portfolio workbook (missing US Stocks sheet)." },
      { status: 400 },
    );
  }

  const brokerAccountMap = parseBrokerAccountMap(formData);
  if (!brokerAccountMap.safra) {
    return NextResponse.json(
      { error: "Map the Safra Sarasin broker account before importing." },
      { status: 400 },
    );
  }

  try {
    const result = await importConsolidatedPortfolioForEntity(
      ctx,
      entityId,
      managedPortfolioId,
      reportFile,
      brokerAccountMap,
      importCash,
    );

    if (result.error) {
      return NextResponse.json({ error: result.error, result }, { status: 400 });
    }

    return NextResponse.json({ result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to import consolidated portfolio.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
