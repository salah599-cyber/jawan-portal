"use server";

import { revalidatePath } from "next/cache";
import * as XLSX from "xlsx";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit/log";
import type { PublicMarket } from "@/lib/generated/prisma/client";
import { getPublicHoldings } from "@/lib/data/public-markets";
import { importBrokerReportsForEntity } from "@/lib/public-markets/import-reports";
import { MARKET_CONFIG, PUBLIC_MARKETS_PATH } from "@/lib/public-markets/constants";
import type { ImportFileResult, ManualHoldingInput } from "@/lib/public-markets/types";
import { ensurePortfolioAsset, refreshAssetValue } from "@/lib/public-markets/import-reports";
import { ensurePublicMarketsSchema } from "@/lib/db/ensure-public-markets-schema";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { MAX_UPLOAD_BYTES } from "@/lib/upload-limits";

function getFilesFromFormData(formData: FormData, field: string): File[] {
  const entries = formData.getAll(field);
  return entries.filter((entry): entry is File => entry instanceof File && entry.size > 0);
}

function parseMarket(value: string): PublicMarket {
  const market = value.trim().toUpperCase() as PublicMarket;
  if (!(market in MARKET_CONFIG)) {
    throw new Error("Invalid market.");
  }
  return market;
}

function toDecimalString(value: number | undefined, fractionDigits: number): string | undefined {
  if (value == null || Number.isNaN(value)) return undefined;
  return value.toFixed(fractionDigits);
}

export async function importPublicMarketReports(formData: FormData): Promise<ImportFileResult[]> {
  const ctx = await requireModuleAccess("ASSETS");
  if (!canWrite(ctx, "ASSETS")) {
    throw new Error("You do not have permission to import brokerage reports.");
  }

  const entityId = String(formData.get("entityId") ?? "").trim();
  const market = parseMarket(String(formData.get("market") ?? "MSX"));

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

  return importBrokerReportsForEntity(ctx, entityId, market, reportFiles);
}

export async function deletePublicHolding(holdingId: string) {
  const ctx = await requireModuleAccess("ASSETS");
  if (!canWrite(ctx, "ASSETS")) {
    throw new Error("You do not have permission to delete holdings.");
  }

  await ensurePublicMarketsSchema();

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
    resource: "public_markets_holding",
    resourceId: holdingId,
    metadata: { symbol: holding.symbol, broker: holding.broker, market: holding.market },
  });

  revalidatePath(PUBLIC_MARKETS_PATH);
  revalidatePath("/portfolio/msx");
  revalidatePath("/dashboard");
}

export async function addManualHolding(formData: FormData) {
  const ctx = await requireModuleAccess("ASSETS");
  if (!canWrite(ctx, "ASSETS")) {
    throw new Error("You do not have permission to add holdings.");
  }

  const entityId = String(formData.get("entityId") ?? "").trim();
  const market = parseMarket(String(formData.get("market") ?? "MSX"));
  const input: ManualHoldingInput = {
    symbol: String(formData.get("symbol") ?? "").trim().toUpperCase(),
    name: String(formData.get("name") ?? "").trim() || undefined,
    quantity: parseFloat(String(formData.get("quantity") ?? "")),
    costBasis: parseOptionalNumber(formData.get("costBasis")),
    marketPrice: parseOptionalNumber(formData.get("marketPrice")),
    marketValue: parseOptionalNumber(formData.get("marketValue")),
    unrealisedPnl: parseOptionalNumber(formData.get("unrealisedPnl")),
    broker: String(formData.get("broker") ?? "").trim() || undefined,
    accountNumber: String(formData.get("accountNumber") ?? "").trim() || undefined,
    exchange: String(formData.get("exchange") ?? "").trim() || undefined,
    isin: String(formData.get("isin") ?? "").trim() || undefined,
    cusip: String(formData.get("cusip") ?? "").trim() || undefined,
    sedol: String(formData.get("sedol") ?? "").trim() || undefined,
    asOfDate: String(formData.get("asOfDate") ?? "").trim() || undefined,
  };

  if (!entityId) throw new Error("Entity is required.");
  if (!input.symbol) throw new Error("Symbol is required.");
  if (!input.quantity || Number.isNaN(input.quantity) || input.quantity <= 0) {
    throw new Error("Quantity must be a positive number.");
  }

  if (ctx.entityIds.length > 0 && !ctx.entityIds.includes(entityId)) {
    throw new Error("You do not have access to this entity.");
  }

  await ensurePublicMarketsSchema();
  const config = MARKET_CONFIG[market];
  const asset = await ensurePortfolioAsset(entityId, market);
  const marketValue =
    input.marketValue ??
    (input.marketPrice != null ? input.marketPrice * input.quantity : undefined);

  const holding = await db.publicEquityHolding.create({
    data: {
      assetId: asset.id,
      market,
      symbol: input.symbol,
      name: input.name,
      quantity: toDecimalString(input.quantity, 6) ?? "0",
      costBasis: toDecimalString(input.costBasis, 2),
      marketPrice: toDecimalString(input.marketPrice, 4),
      marketValue: toDecimalString(marketValue, 2),
      unrealisedPnl: toDecimalString(input.unrealisedPnl, 2),
      broker: input.broker ?? "Manual Entry",
      accountNumber: input.accountNumber,
      exchange: input.exchange ?? config.exchange,
      isin: input.isin,
      cusip: input.cusip,
      sedol: input.sedol,
      country: config.country,
      source: "MANUAL",
      currency: config.currency,
      asOfDate: input.asOfDate ? new Date(input.asOfDate) : new Date(),
    },
  });

  await refreshAssetValue(asset.id);

  await logAudit({
    userId: ctx.id,
    action: "CREATE",
    resource: "public_markets_holding",
    resourceId: holding.id,
    metadata: { symbol: input.symbol, market, source: "MANUAL" },
  });

  revalidatePath(PUBLIC_MARKETS_PATH);
  revalidatePath("/dashboard");
}

function parseOptionalNumber(value: FormDataEntryValue | null): number | undefined {
  if (value == null || value === "") return undefined;
  const num = parseFloat(String(value));
  return Number.isNaN(num) ? undefined : num;
}

export async function exportPublicHoldings(formData: FormData): Promise<{ fileName: string; base64: string }> {
  const ctx = await requireModuleAccess("ASSETS");
  await ensurePublicMarketsSchema();
  const entityId = String(formData.get("entityId") ?? "").trim() || undefined;
  const marketParam = String(formData.get("market") ?? "").trim();
  const market = marketParam && marketParam !== "ALL" ? parseMarket(marketParam) : null;

  const holdings = await getPublicHoldings(ctx, { entityId, market });

  const rows = holdings.map((holding) => ({
    Market: holding.marketLabel,
    Entity: holding.entityName,
    Symbol: holding.symbol,
    Name: holding.name ?? "",
    Quantity: holding.quantity,
    "Cost Basis": holding.costBasis ?? "",
    Price: holding.marketPrice ?? "",
    "Market Value": holding.marketValue ?? "",
    "Market Value (OMR)": holding.marketValueOmr ?? "",
    "Unrealised P&L": holding.unrealisedPnl ?? "",
    Currency: holding.currency,
    Broker: holding.broker ?? "",
    Account: holding.accountNumber ?? "",
    Exchange: holding.exchange ?? "",
    ISIN: holding.isin ?? "",
    CUSIP: holding.cusip ?? "",
    SEDOL: holding.sedol ?? "",
    Source: holding.source,
    "As Of": holding.asOfDate ? holding.asOfDate.toISOString().slice(0, 10) : "",
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Holdings");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;

  const suffix = market ? MARKET_CONFIG[market].slug : "ALL";
  return {
    fileName: `public-markets-${suffix}-${new Date().toISOString().slice(0, 10)}.xlsx`,
    base64: buffer.toString("base64"),
  };
}
