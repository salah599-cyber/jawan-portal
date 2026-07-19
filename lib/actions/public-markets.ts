"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit/log";
import type { PublicMarket } from "@/lib/generated/prisma/client";
import { getPublicHoldings } from "@/lib/data/public-markets";
import { importBrokerReportsForEntity } from "@/lib/public-markets/import-reports";
import { parseImportOptionsFromFormData } from "@/lib/public-markets/import-options";
import { MARKET_CONFIG, PUBLIC_MARKETS_PATH } from "@/lib/public-markets/constants";
import type { ImportFileResult, ManualCryptoInput, ManualHoldingInput, ManualOptionInput, ManualStructuredNoteInput } from "@/lib/public-markets/types";
import { ensurePortfolioAsset, refreshAssetValue } from "@/lib/public-markets/import-reports";
import { ensurePublicMarketsSchema } from "@/lib/db/ensure-public-markets-schema";
import { refreshPublicMarketPrices as runPriceRefresh, refreshCryptoPrices as runCryptoPriceRefresh } from "@/lib/public-markets/refresh-prices";
import {
  buildCryptoSymbol,
  buildOptionSymbol,
  buildStructuredNoteSymbol,
  normalizeAndFormatHoldingValues,
  normalizeOptionHoldingValues,
} from "@/lib/public-markets/valuation";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { encodeExcelDownload, recordsToExcelBuffer } from "@/lib/spreadsheet/excel-export";
import {
  buildPortfolioUploadTemplateBuffer,
  buildUploadTemplateBuffer,
  isUploadTemplateMarket,
} from "@/lib/public-markets/upload-template";
import {
  createPublicBrokerAccountRecord,
  deletePublicBrokerAccountRecord,
  listPublicBrokerAccountsForEntity,
  updatePublicBrokerAccountRecord,
} from "@/lib/public-markets/broker-accounts";
import { MAX_UPLOAD_BYTES } from "@/lib/upload-limits";
import { PUBLIC_MANAGEMENT_TYPE_LABELS } from "@/lib/labels";

const PUBLIC_HOLDINGS_EXPORT_HEADERS = [
  "Market",
  "Entity",
  "Instrument Type",
  "Symbol",
  "Name",
  "Underlying Symbol",
  "Option Type",
  "Strike Price",
  "Expiry Date",
  "Issuer",
  "Product Name",
  "Notional",
  "Maturity",
  "Coupon Rate",
  "CoinGecko ID",
  "Custodian",
  "Quantity",
  "Cost Basis",
  "Price",
  "Market Value",
  "Market Value (OMR)",
  "Unrealised P&L",
  "Currency",
  "Broker",
  "Account",
  "Broker Account",
  "Management Type",
  "Exchange",
  "ISIN",
  "CUSIP",
  "SEDOL",
  "Source",
  "Price Source",
  "Price Fetched",
  "As Of",
] as const;

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

export type UpdatePublicHoldingInput = {
  symbol?: string;
  name?: string;
  quantity?: number;
  costBasis?: number | null;
  marketPrice?: number | null;
  marketValue?: number | null;
  unrealisedPnl?: number | null;
  broker?: string;
  accountNumber?: string;
  exchange?: string;
  asOfDate?: string;
  underlyingSymbol?: string;
  optionType?: "CALL" | "PUT";
  strikePrice?: number;
  expiryDate?: string;
  contractMultiplier?: number;
  premiumPaid?: number | null;
  issuer?: string;
  productName?: string;
  notionalAmount?: number;
  issueDate?: string;
  maturityDate?: string;
  couponRate?: number | null;
  barrierLevel?: number | null;
  payoffNotes?: string;
  coinGeckoId?: string;
  custodian?: string;
};

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

  return importBrokerReportsForEntity(ctx, entityId, market, reportFiles, parseImportOptionsFromFormData(formData));
}

export async function listPublicBrokerAccounts(entityId: string) {
  const ctx = await requireModuleAccess("ASSETS");
  if (!entityId.trim()) return [];
  return listPublicBrokerAccountsForEntity(ctx, entityId.trim());
}

export async function createPublicBrokerAccount(formData: FormData) {
  const ctx = await requireModuleAccess("ASSETS");
  if (!canWrite(ctx, "ASSETS")) {
    throw new Error("You do not have permission to manage broker accounts.");
  }

  const entityId = String(formData.get("entityId") ?? "").trim();
  const broker = String(formData.get("broker") ?? "").trim();
  const accountNumber = String(formData.get("accountNumber") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim();
  const isManaged = String(formData.get("isManaged") ?? "true") !== "false";

  await createPublicBrokerAccountRecord(ctx, {
    entityId,
    broker,
    accountNumber: accountNumber || undefined,
    label: label || undefined,
    isManaged,
  });

  revalidatePath(PUBLIC_MARKETS_PATH);
}

export async function updatePublicBrokerAccount(formData: FormData) {
  const ctx = await requireModuleAccess("ASSETS");
  if (!canWrite(ctx, "ASSETS")) {
    throw new Error("You do not have permission to manage broker accounts.");
  }

  const accountId = String(formData.get("accountId") ?? "").trim();
  const broker = String(formData.get("broker") ?? "").trim();
  const accountNumber = String(formData.get("accountNumber") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim();
  const isManaged = String(formData.get("isManaged") ?? "true") !== "false";

  await updatePublicBrokerAccountRecord(ctx, accountId, {
    broker,
    accountNumber,
    label: label || undefined,
    isManaged,
  });

  revalidatePath(PUBLIC_MARKETS_PATH);
}

export async function deletePublicBrokerAccount(accountId: string) {
  const ctx = await requireModuleAccess("ASSETS");
  if (!canWrite(ctx, "ASSETS")) {
    throw new Error("You do not have permission to manage broker accounts.");
  }

  await deletePublicBrokerAccountRecord(ctx, accountId);
  revalidatePath(PUBLIC_MARKETS_PATH);
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
  const { decimals } = normalizeAndFormatHoldingValues(
    {
      quantity: input.quantity,
      costBasis: input.costBasis,
      marketPrice: input.marketPrice,
      marketValue: input.marketValue,
    },
    { costBasisIsTotal: true },
  );

  const holding = await db.publicEquityHolding.create({
    data: {
      assetId: asset.id,
      market,
      symbol: input.symbol,
      name: input.name,
      quantity: input.quantity.toFixed(6),
      costBasis: decimals.costBasis,
      marketPrice: decimals.marketPrice,
      marketValue: decimals.marketValue,
      unrealisedPnl: decimals.unrealisedPnl,
      priceSource: input.marketPrice != null ? "MANUAL" : undefined,
      broker: input.broker ?? "Manual Entry",
      accountNumber: input.accountNumber,
      exchange: input.exchange ?? config.exchange,
      isin: input.isin,
      cusip: input.cusip,
      sedol: input.sedol,
      country: config.country,
      source: "MANUAL",
      instrumentType: "EQUITY",
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

export async function addManualOption(formData: FormData) {
  const ctx = await requireModuleAccess("ASSETS");
  if (!canWrite(ctx, "ASSETS")) {
    throw new Error("You do not have permission to add holdings.");
  }

  const entityId = String(formData.get("entityId") ?? "").trim();
  const market = parseMarket(String(formData.get("market") ?? "MSX"));
  const input: ManualOptionInput = {
    underlyingSymbol: String(formData.get("underlyingSymbol") ?? "").trim().toUpperCase(),
    optionType: String(formData.get("optionType") ?? "CALL").toUpperCase() === "PUT" ? "PUT" : "CALL",
    strikePrice: parseFloat(String(formData.get("strikePrice") ?? "")),
    expiryDate: String(formData.get("expiryDate") ?? "").trim(),
    contracts: parseFloat(String(formData.get("contracts") ?? "")),
    contractMultiplier: parseOptionalNumber(formData.get("contractMultiplier")),
    premiumPaid: parseOptionalNumber(formData.get("premiumPaid")),
    marketPrice: parseOptionalNumber(formData.get("marketPrice")),
    marketValue: parseOptionalNumber(formData.get("marketValue")),
    broker: String(formData.get("broker") ?? "").trim() || undefined,
    accountNumber: String(formData.get("accountNumber") ?? "").trim() || undefined,
    asOfDate: String(formData.get("asOfDate") ?? "").trim() || undefined,
  };

  if (!entityId) throw new Error("Entity is required.");
  if (!input.underlyingSymbol) throw new Error("Underlying symbol is required.");
  if (!input.expiryDate) throw new Error("Expiry date is required.");
  if (!input.strikePrice || Number.isNaN(input.strikePrice) || input.strikePrice <= 0) {
    throw new Error("Strike price must be a positive number.");
  }
  if (!input.contracts || Number.isNaN(input.contracts) || input.contracts <= 0) {
    throw new Error("Contracts must be a positive number.");
  }

  if (ctx.entityIds.length > 0 && !ctx.entityIds.includes(entityId)) {
    throw new Error("You do not have access to this entity.");
  }

  await ensurePublicMarketsSchema();
  const config = MARKET_CONFIG[market];
  const asset = await ensurePortfolioAsset(entityId, market);
  const normalized = normalizeOptionHoldingValues({
    contracts: input.contracts,
    marketPrice: input.marketPrice,
    marketValue: input.marketValue,
    premiumPaid: input.premiumPaid,
    contractMultiplier: input.contractMultiplier,
  });

  const symbol = buildOptionSymbol(
    input.underlyingSymbol,
    input.optionType,
    input.strikePrice,
    input.expiryDate,
  );

  const holding = await db.publicEquityHolding.create({
    data: {
      assetId: asset.id,
      market,
      symbol,
      name: `${input.underlyingSymbol} ${input.optionType} ${input.strikePrice}`,
      quantity: input.contracts.toFixed(6),
      costBasis: normalized.costBasis?.toFixed(2),
      marketPrice: normalized.marketPrice?.toFixed(4),
      marketValue: normalized.marketValue?.toFixed(2),
      unrealisedPnl: normalized.unrealisedPnl?.toFixed(2),
      priceSource: input.marketPrice != null ? "MANUAL" : undefined,
      broker: input.broker ?? "Manual Entry",
      accountNumber: input.accountNumber,
      exchange: config.exchange,
      country: config.country,
      source: "MANUAL",
      instrumentType: "OPTION",
      currency: config.currency,
      asOfDate: input.asOfDate ? new Date(input.asOfDate) : new Date(),
      optionDetail: {
        create: {
          underlyingSymbol: input.underlyingSymbol,
          optionType: input.optionType,
          strikePrice: input.strikePrice.toFixed(4),
          expiryDate: new Date(input.expiryDate),
          contractMultiplier: normalized.contractMultiplier,
          premiumPaid: normalized.costBasis?.toFixed(2),
        },
      },
    },
  });

  await refreshAssetValue(asset.id);
  await logAudit({
    userId: ctx.id,
    action: "CREATE",
    resource: "public_markets_holding",
    resourceId: holding.id,
    metadata: { symbol, market, source: "MANUAL", instrumentType: "OPTION" },
  });

  revalidatePath(PUBLIC_MARKETS_PATH);
  revalidatePath("/dashboard");
}

export async function addManualStructuredNote(formData: FormData) {
  const ctx = await requireModuleAccess("ASSETS");
  if (!canWrite(ctx, "ASSETS")) {
    throw new Error("You do not have permission to add holdings.");
  }

  const entityId = String(formData.get("entityId") ?? "").trim();
  const market: PublicMarket = "OTHER";
  const input: ManualStructuredNoteInput = {
    issuer: String(formData.get("issuer") ?? "").trim(),
    productName: String(formData.get("productName") ?? "").trim(),
    notionalAmount: parseFloat(String(formData.get("notionalAmount") ?? "")),
    issueDate: String(formData.get("issueDate") ?? "").trim() || undefined,
    maturityDate: String(formData.get("maturityDate") ?? "").trim(),
    couponRate: parseOptionalNumber(formData.get("couponRate")),
    barrierLevel: parseOptionalNumber(formData.get("barrierLevel")),
    payoffNotes: String(formData.get("payoffNotes") ?? "").trim() || undefined,
    marketValue: parseOptionalNumber(formData.get("marketValue")),
    broker: String(formData.get("broker") ?? "").trim() || undefined,
    accountNumber: String(formData.get("accountNumber") ?? "").trim() || undefined,
    asOfDate: String(formData.get("asOfDate") ?? "").trim() || undefined,
  };

  if (!entityId) throw new Error("Entity is required.");
  if (!input.issuer) throw new Error("Issuer is required.");
  if (!input.productName) throw new Error("Product name is required.");
  if (!input.maturityDate) throw new Error("Maturity date is required.");
  if (!input.notionalAmount || Number.isNaN(input.notionalAmount) || input.notionalAmount <= 0) {
    throw new Error("Notional amount must be a positive number.");
  }

  if (ctx.entityIds.length > 0 && !ctx.entityIds.includes(entityId)) {
    throw new Error("You do not have access to this entity.");
  }

  await ensurePublicMarketsSchema();
  const config = MARKET_CONFIG[market];
  const asset = await ensurePortfolioAsset(entityId, market);
  const marketValue = input.marketValue ?? input.notionalAmount;
  const unrealisedPnl = marketValue - input.notionalAmount;
  const symbol = buildStructuredNoteSymbol(input.productName);

  const holding = await db.publicEquityHolding.create({
    data: {
      assetId: asset.id,
      market,
      symbol,
      name: input.productName,
      quantity: "1",
      costBasis: input.notionalAmount.toFixed(2),
      marketValue: marketValue.toFixed(2),
      unrealisedPnl: unrealisedPnl.toFixed(2),
      priceSource: "MANUAL",
      broker: input.broker ?? "Manual Entry",
      accountNumber: input.accountNumber,
      country: config.country,
      source: "MANUAL",
      instrumentType: "STRUCTURED_NOTE",
      currency: config.currency,
      asOfDate: input.asOfDate ? new Date(input.asOfDate) : new Date(),
      structuredNoteDetail: {
        create: {
          issuer: input.issuer,
          productName: input.productName,
          notionalAmount: input.notionalAmount.toFixed(2),
          issueDate: input.issueDate ? new Date(input.issueDate) : undefined,
          maturityDate: new Date(input.maturityDate),
          couponRate: input.couponRate?.toFixed(4),
          barrierLevel: input.barrierLevel?.toFixed(4),
          payoffNotes: input.payoffNotes,
        },
      },
    },
  });

  await refreshAssetValue(asset.id);
  await logAudit({
    userId: ctx.id,
    action: "CREATE",
    resource: "public_markets_holding",
    resourceId: holding.id,
    metadata: { symbol, market, source: "MANUAL", instrumentType: "STRUCTURED_NOTE" },
  });

  revalidatePath(PUBLIC_MARKETS_PATH);
  revalidatePath("/dashboard");
}

export async function addManualCrypto(formData: FormData) {
  const ctx = await requireModuleAccess("ASSETS");
  if (!canWrite(ctx, "ASSETS")) {
    throw new Error("You do not have permission to add holdings.");
  }

  const entityId = String(formData.get("entityId") ?? "").trim();
  const market: PublicMarket = "OTHER";
  const input: ManualCryptoInput = {
    symbol: String(formData.get("symbol") ?? "").trim(),
    name: String(formData.get("name") ?? "").trim() || undefined,
    coinGeckoId: String(formData.get("coinGeckoId") ?? "").trim().toLowerCase(),
    quantity: parseFloat(String(formData.get("quantity") ?? "")),
    costBasis: parseOptionalNumber(formData.get("costBasis")),
    marketPrice: parseOptionalNumber(formData.get("marketPrice")),
    marketValue: parseOptionalNumber(formData.get("marketValue")),
    custodian: String(formData.get("custodian") ?? "").trim() || undefined,
    asOfDate: String(formData.get("asOfDate") ?? "").trim() || undefined,
  };

  if (!entityId) throw new Error("Entity is required.");
  if (!input.symbol) throw new Error("Symbol is required.");
  if (!input.coinGeckoId) throw new Error("CoinGecko ID is required.");
  if (!input.quantity || Number.isNaN(input.quantity) || input.quantity <= 0) {
    throw new Error("Quantity must be a positive number.");
  }

  if (ctx.entityIds.length > 0 && !ctx.entityIds.includes(entityId)) {
    throw new Error("You do not have access to this entity.");
  }

  await ensurePublicMarketsSchema();
  const config = MARKET_CONFIG[market];
  const asset = await ensurePortfolioAsset(entityId, market);
  const symbol = buildCryptoSymbol(input.symbol);
  const { decimals } = normalizeAndFormatHoldingValues(
    {
      quantity: input.quantity,
      costBasis: input.costBasis,
      marketPrice: input.marketPrice,
      marketValue: input.marketValue,
    },
    { costBasisIsTotal: true },
  );

  const holding = await db.publicEquityHolding.create({
    data: {
      assetId: asset.id,
      market,
      symbol,
      name: input.name ?? symbol,
      quantity: input.quantity.toFixed(6),
      costBasis: decimals.costBasis,
      marketPrice: decimals.marketPrice,
      marketValue: decimals.marketValue,
      unrealisedPnl: decimals.unrealisedPnl,
      priceSource: input.marketPrice != null ? "MANUAL" : null,
      broker: input.custodian ?? "Manual Entry",
      country: config.country,
      source: "MANUAL",
      instrumentType: "CRYPTO",
      currency: "USD",
      asOfDate: input.asOfDate ? new Date(input.asOfDate) : new Date(),
      cryptoDetail: {
        create: {
          coinGeckoId: input.coinGeckoId,
          custodian: input.custodian,
        },
      },
    },
  });

  await refreshAssetValue(asset.id);
  await logAudit({
    userId: ctx.id,
    action: "CREATE",
    resource: "public_markets_holding",
    resourceId: holding.id,
    metadata: { symbol, market, source: "MANUAL", instrumentType: "CRYPTO" },
  });

  revalidatePath(PUBLIC_MARKETS_PATH);
  revalidatePath("/dashboard");
}

export async function updatePublicHolding(holdingId: string, input: UpdatePublicHoldingInput) {
  const ctx = await requireModuleAccess("ASSETS");
  if (!canWrite(ctx, "ASSETS")) {
    throw new Error("You do not have permission to edit holdings.");
  }

  await ensurePublicMarketsSchema();

  const existing = await db.publicEquityHolding.findUnique({
    where: { id: holdingId },
    include: { asset: true, optionDetail: true, structuredNoteDetail: true, cryptoDetail: true },
  });

  if (!existing) {
    throw new Error("Holding not found.");
  }

  if (ctx.entityIds.length > 0 && !ctx.entityIds.includes(existing.asset.entityId)) {
    throw new Error("You do not have access to this holding.");
  }

  const instrumentType = existing.instrumentType;
  const quantity =
    input.quantity != null && !Number.isNaN(input.quantity) && input.quantity > 0
      ? input.quantity
      : parseFloat(existing.quantity.toString());

  if (!quantity || Number.isNaN(quantity) || quantity <= 0) {
    throw new Error("Quantity must be a positive number.");
  }

  const costBasis =
    input.costBasis !== undefined
      ? input.costBasis
      : existing.costBasis
        ? parseFloat(existing.costBasis.toString())
        : null;
  const marketPrice =
    input.marketPrice !== undefined
      ? input.marketPrice
      : existing.marketPrice
        ? parseFloat(existing.marketPrice.toString())
        : null;
  let marketValue =
    input.marketValue !== undefined
      ? input.marketValue
      : existing.marketValue
        ? parseFloat(existing.marketValue.toString())
        : null;

  let symbol = existing.symbol;
  let name = input.name !== undefined ? input.name || null : existing.name;

  if (instrumentType === "EQUITY") {
    symbol = input.symbol?.trim().toUpperCase() || existing.symbol;
    if (!symbol) throw new Error("Symbol is required.");
    const { decimals } = normalizeAndFormatHoldingValues(
      { quantity, costBasis, marketPrice, marketValue },
      { costBasisIsTotal: true },
    );

    const priceSource = input.marketPrice != null ? "MANUAL" : existing.priceSource;

    await db.publicEquityHolding.update({
      where: { id: holdingId },
      data: {
        symbol,
        name,
        quantity: quantity.toFixed(6),
        costBasis: decimals.costBasis,
        marketPrice: decimals.marketPrice,
        marketValue: decimals.marketValue,
        unrealisedPnl: decimals.unrealisedPnl,
        broker: input.broker !== undefined ? input.broker || null : existing.broker,
        accountNumber:
          input.accountNumber !== undefined ? input.accountNumber || null : existing.accountNumber,
        exchange: input.exchange !== undefined ? input.exchange || null : existing.exchange,
        asOfDate: input.asOfDate ? new Date(input.asOfDate) : existing.asOfDate,
        priceSource,
        ...(input.marketPrice != null ? { priceFetchedAt: null } : {}),
      },
    });

    await refreshAssetValue(existing.assetId);
    await logAudit({
      userId: ctx.id,
      action: "UPDATE",
      resource: "public_markets_holding",
      resourceId: holdingId,
      metadata: { symbol, market: existing.market },
    });
    revalidatePath(PUBLIC_MARKETS_PATH);
    revalidatePath("/portfolio/msx");
    revalidatePath("/dashboard");
    return;
  }

  if (instrumentType === "OPTION") {
    const optionType = input.optionType ?? existing.optionDetail?.optionType;
    const strikePrice = input.strikePrice ?? (existing.optionDetail ? parseFloat(existing.optionDetail.strikePrice.toString()) : undefined);
    const expiryDate = input.expiryDate ?? existing.optionDetail?.expiryDate.toISOString().slice(0, 10);
    const underlyingSymbol =
      input.underlyingSymbol?.trim().toUpperCase() ?? existing.optionDetail?.underlyingSymbol;

    if (!optionType || strikePrice == null || !expiryDate || !underlyingSymbol) {
      throw new Error("Underlying symbol, option type, strike, and expiry are required.");
    }
    if (strikePrice <= 0) throw new Error("Strike price must be greater than zero.");

    symbol = buildOptionSymbol(underlyingSymbol, optionType, strikePrice, expiryDate);
    name = name ?? `${underlyingSymbol} ${optionType} ${strikePrice}`;

    const normalized = normalizeOptionHoldingValues({
      contracts: quantity,
      marketPrice,
      marketValue,
      premiumPaid: input.premiumPaid ?? costBasis,
      contractMultiplier:
        input.contractMultiplier ?? existing.optionDetail?.contractMultiplier,
    });

    const priceSource = input.marketPrice != null ? "MANUAL" : existing.priceSource;

    await db.publicEquityHolding.update({
      where: { id: holdingId },
      data: {
        symbol,
        name,
        quantity: quantity.toFixed(6),
        costBasis: normalized.costBasis?.toFixed(2),
        marketPrice: normalized.marketPrice?.toFixed(4),
        marketValue: normalized.marketValue?.toFixed(2),
        unrealisedPnl: normalized.unrealisedPnl?.toFixed(2),
        broker: input.broker !== undefined ? input.broker || null : existing.broker,
        accountNumber:
          input.accountNumber !== undefined ? input.accountNumber || null : existing.accountNumber,
        asOfDate: input.asOfDate ? new Date(input.asOfDate) : existing.asOfDate,
        priceSource,
        ...(input.marketPrice != null ? { priceFetchedAt: null } : {}),
        optionDetail: {
          update: {
            underlyingSymbol,
            optionType,
            strikePrice: strikePrice.toFixed(4),
            expiryDate: new Date(expiryDate),
            contractMultiplier: normalized.contractMultiplier,
            premiumPaid: normalized.costBasis?.toFixed(2),
          },
        },
      },
    });

    await refreshAssetValue(existing.assetId);
    await logAudit({
      userId: ctx.id,
      action: "UPDATE",
      resource: "public_markets_holding",
      resourceId: holdingId,
      metadata: { symbol, market: existing.market, instrumentType: "OPTION" },
    });
    revalidatePath(PUBLIC_MARKETS_PATH);
    revalidatePath("/portfolio/msx");
    revalidatePath("/dashboard");
    return;
  }

  if (instrumentType === "STRUCTURED_NOTE") {
    const issuer = input.issuer?.trim() || existing.structuredNoteDetail?.issuer;
    const productName = input.productName?.trim() || existing.structuredNoteDetail?.productName;
    const notionalAmount =
      input.notionalAmount ??
      (existing.structuredNoteDetail
        ? parseFloat(existing.structuredNoteDetail.notionalAmount.toString())
        : undefined);
    const maturityDate =
      input.maturityDate ?? existing.structuredNoteDetail?.maturityDate.toISOString().slice(0, 10);

    if (!issuer || !productName || notionalAmount == null || !maturityDate) {
      throw new Error("Issuer, product name, notional, and maturity are required.");
    }
    if (notionalAmount <= 0) throw new Error("Notional amount must be greater than zero.");

    symbol = buildStructuredNoteSymbol(productName);
    name = productName;
    marketValue = marketValue ?? notionalAmount;
    const unrealisedPnl = marketValue - notionalAmount;

    await db.publicEquityHolding.update({
      where: { id: holdingId },
      data: {
        symbol,
        name,
        quantity: "1",
        costBasis: notionalAmount.toFixed(2),
        marketValue: marketValue.toFixed(2),
        unrealisedPnl: unrealisedPnl.toFixed(2),
        priceSource: "MANUAL",
        broker: input.broker !== undefined ? input.broker || null : existing.broker,
        accountNumber:
          input.accountNumber !== undefined ? input.accountNumber || null : existing.accountNumber,
        asOfDate: input.asOfDate ? new Date(input.asOfDate) : existing.asOfDate,
        structuredNoteDetail: {
          update: {
            issuer,
            productName,
            notionalAmount: notionalAmount.toFixed(2),
            issueDate: input.issueDate
              ? new Date(input.issueDate)
              : existing.structuredNoteDetail?.issueDate,
            maturityDate: new Date(maturityDate),
            couponRate:
              input.couponRate != null
                ? input.couponRate.toFixed(4)
                : existing.structuredNoteDetail?.couponRate?.toString(),
            barrierLevel:
              input.barrierLevel != null
                ? input.barrierLevel.toFixed(4)
                : existing.structuredNoteDetail?.barrierLevel?.toString(),
            payoffNotes:
              input.payoffNotes !== undefined
                ? input.payoffNotes || null
                : existing.structuredNoteDetail?.payoffNotes,
          },
        },
      },
    });

    await refreshAssetValue(existing.assetId);
    await logAudit({
      userId: ctx.id,
      action: "UPDATE",
      resource: "public_markets_holding",
      resourceId: holdingId,
      metadata: { symbol, market: existing.market, instrumentType: "STRUCTURED_NOTE" },
    });
    revalidatePath(PUBLIC_MARKETS_PATH);
    revalidatePath("/portfolio/msx");
    revalidatePath("/dashboard");
    return;
  }

  if (instrumentType === "CRYPTO") {
    const coinGeckoId =
      input.coinGeckoId?.trim().toLowerCase() || existing.cryptoDetail?.coinGeckoId;
    const custodian =
      input.custodian !== undefined ? input.custodian || null : existing.cryptoDetail?.custodian;

    if (!coinGeckoId) {
      throw new Error("CoinGecko ID is required.");
    }

    symbol = input.symbol?.trim().toUpperCase() || existing.symbol;
    if (!symbol) throw new Error("Symbol is required.");

    const { decimals } = normalizeAndFormatHoldingValues(
      { quantity, costBasis, marketPrice, marketValue },
      { costBasisIsTotal: true },
    );

    const priceSource = input.marketPrice != null ? "MANUAL" : existing.priceSource;

    await db.publicEquityHolding.update({
      where: { id: holdingId },
      data: {
        symbol,
        name,
        quantity: quantity.toFixed(6),
        costBasis: decimals.costBasis,
        marketPrice: decimals.marketPrice,
        marketValue: decimals.marketValue,
        unrealisedPnl: decimals.unrealisedPnl,
        broker: input.custodian !== undefined ? input.custodian || null : existing.broker,
        asOfDate: input.asOfDate ? new Date(input.asOfDate) : existing.asOfDate,
        priceSource,
        ...(input.marketPrice != null ? { priceFetchedAt: null } : {}),
        cryptoDetail: {
          update: {
            coinGeckoId,
            custodian,
          },
        },
      },
    });

    await refreshAssetValue(existing.assetId);
    await logAudit({
      userId: ctx.id,
      action: "UPDATE",
      resource: "public_markets_holding",
      resourceId: holdingId,
      metadata: { symbol, market: existing.market, instrumentType: "CRYPTO" },
    });
    revalidatePath(PUBLIC_MARKETS_PATH);
    revalidatePath("/portfolio/msx");
    revalidatePath("/dashboard");
    return;
  }

  throw new Error("Unsupported instrument type.");
}

export async function refreshPublicMarketPricesAction(formData: FormData) {
  const ctx = await requireModuleAccess("ASSETS");
  if (!canWrite(ctx, "ASSETS")) {
    throw new Error("You do not have permission to refresh prices.");
  }

  const entityId = String(formData.get("entityId") ?? "").trim() || undefined;
  const marketParam = String(formData.get("market") ?? "").trim();
  const market = marketParam && marketParam !== "ALL" ? parseMarket(marketParam) : undefined;

  if (entityId && ctx.entityIds.length > 0 && !ctx.entityIds.includes(entityId)) {
    throw new Error("You do not have access to this entity.");
  }

  const result = await runPriceRefresh({ entityId, market });

  try {
    await logAudit({
      userId: ctx.id,
      action: "REFRESH",
      resource: "public_markets_prices",
      metadata: { entityId, market, ...result },
    });
  } catch {
    // Audit logging should not block a successful price refresh.
  }

  revalidatePath(PUBLIC_MARKETS_PATH);
  revalidatePath("/portfolio/msx");
  revalidatePath("/dashboard");
  revalidatePath("/assets");

  return result;
}

export async function refreshCryptoPricesAction(formData: FormData) {
  const ctx = await requireModuleAccess("ASSETS");
  if (!canWrite(ctx, "ASSETS")) {
    throw new Error("You do not have permission to refresh prices.");
  }

  const entityId = String(formData.get("entityId") ?? "").trim() || undefined;

  if (entityId && ctx.entityIds.length > 0 && !ctx.entityIds.includes(entityId)) {
    throw new Error("You do not have access to this entity.");
  }

  const result = await runCryptoPriceRefresh({ entityId });

  try {
    await logAudit({
      userId: ctx.id,
      action: "REFRESH",
      resource: "public_markets_crypto_prices",
      metadata: { entityId, ...result },
    });
  } catch {
    // Audit logging should not block a successful price refresh.
  }

  revalidatePath(PUBLIC_MARKETS_PATH);
  revalidatePath("/dashboard");
  revalidatePath("/assets");

  return result;
}

function parseOptionalNumber(value: FormDataEntryValue | null): number | undefined {
  if (value == null || value === "") return undefined;
  const num = parseFloat(String(value));
  return Number.isNaN(num) ? undefined : num;
}

export async function downloadPublicMarketUploadTemplate(
  market: string,
): Promise<{ fileName: string; base64: string; mimeType: string }> {
  await requireModuleAccess("ASSETS");

  const normalizedMarket = market.toUpperCase();
  if (!isUploadTemplateMarket(normalizedMarket)) {
    throw new Error("Unsupported market template.");
  }

  const { buffer, fileName } = await buildUploadTemplateBuffer(normalizedMarket);
  return encodeExcelDownload(buffer, fileName);
}

export async function downloadPortfolioUploadTemplate(): Promise<{
  fileName: string;
  base64: string;
  mimeType: string;
}> {
  await requireModuleAccess("ASSETS");
  const { buffer, fileName } = await buildPortfolioUploadTemplateBuffer();
  return encodeExcelDownload(buffer, fileName);
}

export async function exportPublicHoldings(
  formData: FormData,
): Promise<{ fileName: string; base64: string; mimeType: string }> {
  const ctx = await requireModuleAccess("ASSETS");
  await ensurePublicMarketsSchema();
  const entityId = String(formData.get("entityId") ?? "").trim() || undefined;
  const marketParam = String(formData.get("market") ?? "").trim();
  const market = marketParam && marketParam !== "ALL" ? parseMarket(marketParam) : null;

  const holdings = await getPublicHoldings(ctx, { entityId, market });

  const rows = holdings.map((holding) => ({
    Market: holding.marketLabel,
    Entity: holding.entityName,
    "Instrument Type": holding.instrumentType,
    Symbol: holding.symbol,
    Name: holding.name ?? "",
    "Underlying Symbol": holding.option?.underlyingSymbol ?? "",
    "Option Type": holding.option?.optionType ?? "",
    "Strike Price": holding.option?.strikePrice ?? "",
    "Expiry Date": holding.option?.expiryDate
      ? holding.option.expiryDate.toISOString().slice(0, 10)
      : "",
    Issuer: holding.structuredNote?.issuer ?? "",
    "Product Name": holding.structuredNote?.productName ?? "",
    Notional: holding.structuredNote?.notionalAmount ?? "",
    Maturity: holding.structuredNote?.maturityDate
      ? holding.structuredNote.maturityDate.toISOString().slice(0, 10)
      : "",
    "Coupon Rate": holding.structuredNote?.couponRate ?? "",
    "CoinGecko ID": holding.crypto?.coinGeckoId ?? "",
    Custodian: holding.crypto?.custodian ?? holding.broker ?? "",
    Quantity: holding.quantity,
    "Cost Basis": holding.costBasis ?? "",
    Price: holding.marketPrice ?? "",
    "Market Value": holding.marketValue ?? "",
    "Market Value (OMR)": holding.marketValueOmr ?? "",
    "Unrealised P&L": holding.unrealisedPnl ?? "",
    Currency: holding.currency,
    Broker: holding.broker ?? "",
    Account: holding.accountNumber ?? "",
    "Broker Account": holding.brokerAccountLabel ?? "",
    "Management Type": holding.isManaged
      ? PUBLIC_MANAGEMENT_TYPE_LABELS.managed
      : PUBLIC_MANAGEMENT_TYPE_LABELS.reference,
    Exchange: holding.exchange ?? "",
    ISIN: holding.isin ?? "",
    CUSIP: holding.cusip ?? "",
    SEDOL: holding.sedol ?? "",
    Source: holding.source,
    "Price Source": holding.priceSource ?? "",
    "Price Fetched": holding.priceFetchedAt
      ? holding.priceFetchedAt.toISOString().slice(0, 10)
      : "",
    "As Of": holding.asOfDate ? holding.asOfDate.toISOString().slice(0, 10) : "",
  }));

  const buffer = await recordsToExcelBuffer("Holdings", rows, [...PUBLIC_HOLDINGS_EXPORT_HEADERS]);
  const suffix = market ? MARKET_CONFIG[market].slug : "ALL";

  return encodeExcelDownload(
    buffer,
    `public-markets-${suffix}-${new Date().toISOString().slice(0, 10)}.xlsx`,
  );
}
