import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit/log";
import type { PublicMarket } from "@/lib/generated/prisma/client";
import { getBrokerAccountForImport } from "@/lib/public-markets/broker-accounts";
import {
  CONSOLIDATED_BROKER_CONFIG,
  type ConsolidatedBrokerKey,
} from "@/lib/public-markets/consolidated-portfolio/constants";
import {
  parseConsolidatedPortfolioSheets,
  type ParsedConsolidatedPortfolio,
} from "@/lib/public-markets/consolidated-portfolio/parse-sheet";
import { MARKET_CONFIG, PUBLIC_MARKETS_PATH } from "@/lib/public-markets/constants";
import { ensurePublicMarketsSchema } from "@/lib/db/ensure-public-markets-schema";
import { ensurePortfolioAsset, refreshAssetValue } from "@/lib/public-markets/import-reports";
import { snapshotManagedPortfolioValuation } from "@/lib/portfolio/managed-portfolio-valuations";
import type { BrokerReportFile } from "@/lib/public-markets/types";
import type { UserContext } from "@/lib/permissions/types";
import {
  buildOptionSymbol,
  buildStructuredNoteSymbol,
  normalizeAndFormatHoldingValues,
  normalizeOptionHoldingValues,
} from "@/lib/public-markets/valuation";
import * as XLSX from "xlsx";
import { importConsolidatedCashBalances } from "@/lib/cash/consolidated-balances-import";

export type ConsolidatedBrokerAccountMap = Partial<Record<ConsolidatedBrokerKey, string>>;

export type ConsolidatedImportResult = {
  fileName: string;
  usEquitiesImported: number;
  optionsImported: number;
  structuredNotesImported: number;
  bondsImported: number;
  intlEquitiesImported: number;
  fundsImported: number;
  cashBalancesImported: number;
  warnings: string[];
  error?: string;
};

function readSheetsByName(buffer: Buffer): Record<string, unknown[][]> {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true, raw: false });
  const sheetsByName: Record<string, unknown[][]> = {};

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: "",
      blankrows: false,
    });
    sheetsByName[sheetName] = rows
      .map((row) => (Array.isArray(row) ? row : [row]))
      .filter((row) => row.some((cell) => String(cell ?? "").trim() !== ""));
  }

  return sheetsByName;
}

function resolveIntlMarket(market: PublicMarket, symbol: string): PublicMarket {
  if (market === "HONG_KONG" && !/^\d{4,5}$/.test(symbol)) {
    return "OTHER";
  }
  return market;
}

async function upsertEquityHoldings(
  assetId: string,
  market: PublicMarket,
  managedPortfolioId: string,
  brokerAccountId: string,
  broker: string,
  accountNumber: string | null,
  isManaged: boolean,
  holdings: Array<{
    symbol: string;
    name?: string;
    quantity: number;
    costBasis?: number;
    marketPrice?: number;
    marketValue?: number;
    unrealisedPnl?: number;
    isin?: string;
    cusip?: string;
    sedol?: string;
    exchange?: string;
    currency?: string;
    asOfDate?: Date;
  }>,
  importBatchId: string,
) {
  let imported = 0;

  for (const holding of holdings) {
    const { decimals } = normalizeAndFormatHoldingValues({
      quantity: holding.quantity,
      costBasis: holding.costBasis,
      marketPrice: holding.marketPrice,
      marketValue: holding.marketValue,
      unrealisedPnl: holding.unrealisedPnl,
    });

    const data = {
      assetId,
      managedPortfolioId,
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
      brokerAccountId,
      isManaged,
      exchange: holding.exchange,
      isin: holding.isin,
      cusip: holding.cusip,
      sedol: holding.sedol,
      country: MARKET_CONFIG[market].country,
      source: "IMPORT" as const,
      instrumentType: "EQUITY" as const,
      currency: holding.currency ?? MARKET_CONFIG[market].currency,
      asOfDate: holding.asOfDate,
      importBatchId,
    };

    const existing = await db.publicEquityHolding.findFirst({
      where: {
        assetId,
        market,
        brokerAccountId,
        managedPortfolioId,
        isManaged,
        source: "IMPORT",
        symbol: holding.symbol,
        instrumentType: "EQUITY",
      },
    });

    if (existing) {
      await db.publicEquityHolding.update({ where: { id: existing.id }, data });
    } else {
      await db.publicEquityHolding.create({ data });
    }
    imported += 1;
  }

  return imported;
}

async function importParsedConsolidatedPortfolio(
  ctx: UserContext,
  entityId: string,
  managedPortfolioId: string,
  fileName: string,
  parsed: ParsedConsolidatedPortfolio,
  brokerAccountMap: ConsolidatedBrokerAccountMap,
  importCash: boolean,
): Promise<ConsolidatedImportResult> {
  const warnings = [...parsed.warnings];
  let usEquitiesImported = 0;
  let optionsImported = 0;
  let structuredNotesImported = 0;
  let bondsImported = 0;
  let intlEquitiesImported = 0;
  let fundsImported = 0;
  let cashBalancesImported = 0;

  const batch = await db.importBatch.create({
    data: {
      fileName,
      uploadedBy: ctx.email,
      rowCount: 0,
      market: "USA",
      broker: "Consolidated Portfolio",
      managedPortfolioId,
      parserId: "consolidated-portfolio",
    },
  });

  for (const brokerKey of Object.keys(parsed.usEquitiesByBroker) as ConsolidatedBrokerKey[]) {
    const holdings = parsed.usEquitiesByBroker[brokerKey];
    if (holdings.length === 0) continue;

    const brokerAccountId = brokerAccountMap[brokerKey];
    if (!brokerAccountId) {
      warnings.push(
        `Skipped ${holdings.length} US equity row(s) for ${CONSOLIDATED_BROKER_CONFIG[brokerKey].label}: no broker account mapped.`,
      );
      continue;
    }

    const brokerAccount = await getBrokerAccountForImport(ctx, entityId, brokerAccountId);
    const config = CONSOLIDATED_BROKER_CONFIG[brokerKey];
    const asset = await ensurePortfolioAsset(entityId, "USA");
    const asOfDate = new Date(config.asOfDate);

    usEquitiesImported += await upsertEquityHoldings(
      asset.id,
      "USA",
      managedPortfolioId,
      brokerAccount.id,
      brokerAccount.broker,
      brokerAccount.accountNumber,
      brokerAccount.isManaged,
      holdings.map((holding) => ({ ...holding, asOfDate })),
      batch.id,
    );
    await refreshAssetValue(asset.id);
  }

  const safraAccountId = brokerAccountMap.safra;
  if (safraAccountId && parsed.options.length > 0) {
    const brokerAccount = await getBrokerAccountForImport(ctx, entityId, safraAccountId);
    const asset = await ensurePortfolioAsset(entityId, "USA");

    for (const option of parsed.options) {
      const normalized = normalizeOptionHoldingValues({
        contracts: option.contracts,
        marketPrice: option.marketPrice,
        marketValue: option.marketValue,
        premiumPaid: option.premiumPaid,
        contractMultiplier: option.contractMultiplier,
      });

      const symbol = buildOptionSymbol(
        option.underlyingSymbol,
        option.optionType,
        option.strikePrice,
        option.expiryDate.toISOString().slice(0, 10),
      );

      const data = {
        assetId: asset.id,
        managedPortfolioId,
        market: "USA" as const,
        symbol,
        name: `${option.underlyingSymbol} ${option.optionType} ${option.strikePrice}`,
        quantity: option.contracts.toFixed(6),
        costBasis: normalized.costBasis?.toFixed(2),
        marketPrice: normalized.marketPrice?.toFixed(4),
        marketValue: normalized.marketValue?.toFixed(2),
        unrealisedPnl: normalized.unrealisedPnl?.toFixed(2),
        priceSource: "BROKER",
        broker: option.broker ?? brokerAccount.broker,
        accountNumber: option.accountNumber ?? brokerAccount.accountNumber,
        brokerAccountId: brokerAccount.id,
        isManaged: brokerAccount.isManaged,
        exchange: MARKET_CONFIG.USA.exchange,
        country: MARKET_CONFIG.USA.country,
        source: "IMPORT" as const,
        instrumentType: "OPTION" as const,
        currency: "USD",
        asOfDate: option.asOfDate ?? new Date(CONSOLIDATED_BROKER_CONFIG.safra.asOfDate),
        importBatchId: batch.id,
        optionDetail: {
          create: {
            underlyingSymbol: option.underlyingSymbol,
            optionType: option.optionType,
            strikePrice: option.strikePrice.toFixed(4),
            expiryDate: option.expiryDate,
            contractMultiplier: normalized.contractMultiplier,
            premiumPaid: normalized.costBasis?.toFixed(2),
          },
        },
      };

      const existing = await db.publicEquityHolding.findFirst({
        where: {
          assetId: asset.id,
          market: "USA",
          brokerAccountId: brokerAccount.id,
          managedPortfolioId,
          symbol,
          instrumentType: "OPTION",
        },
      });

      if (existing) {
        await db.publicEquityHolding.update({
          where: { id: existing.id },
          data: {
            ...data,
            optionDetail: {
              upsert: {
                create: data.optionDetail.create,
                update: data.optionDetail.create,
              },
            },
          },
        });
      } else {
        await db.publicEquityHolding.create({ data });
      }
      optionsImported += 1;
    }
    await refreshAssetValue(asset.id);
  } else if (parsed.options.length > 0) {
    warnings.push(`Skipped ${parsed.options.length} option row(s): Safra broker account not mapped.`);
  }

  if (parsed.structuredNotes.length > 0) {
    const asset = await ensurePortfolioAsset(entityId, "OTHER");

    for (const note of parsed.structuredNotes) {
      const symbol = buildStructuredNoteSymbol(note.productName);
      const maturityDate = note.maturityDate ?? new Date("2099-12-31");
      const marketValue = note.marketValue;
      const notionalAmount = note.notionalAmount;

      const data = {
        assetId: asset.id,
        managedPortfolioId,
        market: "OTHER" as const,
        symbol,
        name: note.productName,
        quantity: "1",
        costBasis: notionalAmount.toFixed(2),
        marketValue: marketValue.toFixed(2),
        unrealisedPnl:
          note.unrealisedPnl != null
            ? note.unrealisedPnl.toFixed(2)
            : (marketValue - notionalAmount).toFixed(2),
        priceSource: "BROKER",
        broker: note.source ?? "Consolidated Import",
        isManaged: true,
        isin: note.isin,
        country: MARKET_CONFIG.OTHER.country,
        source: "IMPORT" as const,
        instrumentType: "STRUCTURED_NOTE" as const,
        currency: note.currency,
        asOfDate: new Date(CONSOLIDATED_BROKER_CONFIG.safra.asOfDate),
        importBatchId: batch.id,
        structuredNoteDetail: {
          create: {
            issuer: note.issuer,
            productName: note.productName,
            notionalAmount: notionalAmount.toFixed(2),
            maturityDate,
            couponRate: note.couponRate?.toFixed(4),
            payoffNotes: note.payoffNotes,
          },
        },
      };

      const existing = await db.publicEquityHolding.findFirst({
        where: {
          assetId: asset.id,
          market: "OTHER",
          managedPortfolioId,
          symbol,
          instrumentType: "STRUCTURED_NOTE",
        },
      });

      if (existing) {
        await db.publicEquityHolding.update({
          where: { id: existing.id },
          data: {
            ...data,
            structuredNoteDetail: {
              upsert: {
                create: data.structuredNoteDetail.create,
                update: data.structuredNoteDetail.create,
              },
            },
          },
        });
      } else {
        await db.publicEquityHolding.create({ data });
      }
      structuredNotesImported += 1;
    }
    await refreshAssetValue(asset.id);
  }

  if (parsed.bonds.length > 0) {
    const asset = await ensurePortfolioAsset(entityId, "OTHER");

    for (const bond of parsed.bonds) {
      const symbol = bond.isin ?? `BOND-${bond.cusip ?? bond.bondName.slice(0, 12)}`;

      const data = {
        assetId: asset.id,
        managedPortfolioId,
        market: "OTHER" as const,
        symbol,
        name: bond.bondName,
        quantity: "1",
        costBasis: bond.costBasis?.toFixed(2),
        marketValue: bond.marketValue.toFixed(2),
        unrealisedPnl: bond.unrealisedPnl?.toFixed(2),
        priceSource: "BROKER",
        broker: bond.source ?? "Consolidated Import",
        isManaged: true,
        isin: bond.isin,
        cusip: bond.cusip,
        country: MARKET_CONFIG.OTHER.country,
        source: "IMPORT" as const,
        instrumentType: "BOND" as const,
        currency: bond.currency,
        asOfDate: new Date(CONSOLIDATED_BROKER_CONFIG["kristal-k15875750"].asOfDate),
        importBatchId: batch.id,
        bondDetail: {
          create: {
            bondName: bond.bondName,
            faceValue: bond.faceValue.toFixed(2),
            pricePercent: bond.pricePercent?.toFixed(4),
          },
        },
      };

      const existing = await db.publicEquityHolding.findFirst({
        where: {
          assetId: asset.id,
          market: "OTHER",
          managedPortfolioId,
          symbol,
          instrumentType: "BOND",
        },
      });

      if (existing) {
        await db.publicEquityHolding.update({
          where: { id: existing.id },
          data: {
            ...data,
            bondDetail: {
              upsert: {
                create: data.bondDetail.create,
                update: data.bondDetail.create,
              },
            },
          },
        });
      } else {
        await db.publicEquityHolding.create({ data });
      }
      bondsImported += 1;
    }
    await refreshAssetValue(asset.id);
  }

  for (const equity of parsed.intlEquities) {
    const market = resolveIntlMarket(equity.market, equity.symbol);
    const asset = await ensurePortfolioAsset(entityId, market);
    const brokerAccountId = safraAccountId;

    if (!brokerAccountId) {
      warnings.push(`Skipped intl equity ${equity.name}: Safra broker account not mapped.`);
      continue;
    }

    const brokerAccount = await getBrokerAccountForImport(ctx, entityId, brokerAccountId);

    await upsertEquityHoldings(
      asset.id,
      market,
      managedPortfolioId,
      brokerAccount.id,
      brokerAccount.broker,
      brokerAccount.accountNumber,
      brokerAccount.isManaged,
      [
        {
          symbol: equity.symbol,
          name: equity.name,
          quantity: equity.quantity,
          marketPrice: equity.localMarketPrice,
          marketValue: equity.marketValue,
          unrealisedPnl: equity.unrealisedPnl,
          isin: equity.isin,
          exchange: equity.exchange,
          currency: equity.localCurrency ?? MARKET_CONFIG[market].currency,
          asOfDate: new Date(CONSOLIDATED_BROKER_CONFIG.safra.asOfDate),
        },
      ],
      batch.id,
    );
    await refreshAssetValue(asset.id);
    intlEquitiesImported += 1;
  }

  if (safraAccountId && parsed.funds.length > 0) {
    const brokerAccount = await getBrokerAccountForImport(ctx, entityId, safraAccountId);
    const asset = await ensurePortfolioAsset(entityId, "USA");

    fundsImported = await upsertEquityHoldings(
      asset.id,
      "USA",
      managedPortfolioId,
      brokerAccount.id,
      brokerAccount.broker,
      brokerAccount.accountNumber,
      brokerAccount.isManaged,
      parsed.funds.map((fund) => ({
        ...fund,
        asOfDate: new Date(CONSOLIDATED_BROKER_CONFIG.safra.asOfDate),
      })),
      batch.id,
    );
    await refreshAssetValue(asset.id);
  }

  if (importCash && parsed.cashBalances.length > 0) {
    cashBalancesImported = await importConsolidatedCashBalances(ctx, entityId, parsed.cashBalances);
  } else if (parsed.cashBalances.length > 0) {
    warnings.push(
      `${parsed.cashBalances.length} cash balance row(s) were parsed but not imported. Enable cash import or use Cash Management.`,
    );
  }

  await db.importBatch.update({
    where: { id: batch.id },
    data: {
      rowCount:
        usEquitiesImported +
        optionsImported +
        structuredNotesImported +
        bondsImported +
        intlEquitiesImported +
        fundsImported,
    },
  });

  await snapshotManagedPortfolioValuation(entityId, managedPortfolioId, "import");
  await snapshotManagedPortfolioValuation(entityId, null, "import");

  await logAudit({
    userId: ctx.id,
    action: "IMPORT",
    resource: "public_markets_consolidated",
    resourceId: batch.id,
    metadata: {
      entityId,
      managedPortfolioId,
      usEquitiesImported,
      optionsImported,
      structuredNotesImported,
      bondsImported,
      intlEquitiesImported,
      fundsImported,
      cashBalancesImported,
    },
  });

  revalidatePath(PUBLIC_MARKETS_PATH);
  revalidatePath("/cash");
  revalidatePath("/dashboard");

  return {
    fileName,
    usEquitiesImported,
    optionsImported,
    structuredNotesImported,
    bondsImported,
    intlEquitiesImported,
    fundsImported,
    cashBalancesImported,
    warnings,
  };
}

export async function importConsolidatedPortfolioForEntity(
  ctx: UserContext,
  entityId: string,
  managedPortfolioId: string,
  file: BrokerReportFile,
  brokerAccountMap: ConsolidatedBrokerAccountMap,
  importCash = true,
): Promise<ConsolidatedImportResult> {
  await ensurePublicMarketsSchema();

  const portfolio = await db.managedPortfolio.findFirst({
    where: { id: managedPortfolioId, entityId, status: { in: ["ACTIVE", "MONITOR"] } },
  });

  if (!portfolio) {
    throw new Error("Managed portfolio not found for this entity.");
  }

  try {
    const sheetsByName = readSheetsByName(file.buffer);
    const parsed = parseConsolidatedPortfolioSheets(sheetsByName);

    return await importParsedConsolidatedPortfolio(
      ctx,
      entityId,
      managedPortfolioId,
      file.fileName,
      parsed,
      brokerAccountMap,
      importCash,
    );
  } catch (error) {
    return {
      fileName: file.fileName,
      usEquitiesImported: 0,
      optionsImported: 0,
      structuredNotesImported: 0,
      bondsImported: 0,
      intlEquitiesImported: 0,
      fundsImported: 0,
      cashBalancesImported: 0,
      warnings: [],
      error: error instanceof Error ? error.message : "Failed to import consolidated portfolio.",
    };
  }
}

export function parseConsolidatedPortfolioFile(file: BrokerReportFile): ParsedConsolidatedPortfolio {
  const sheetsByName = readSheetsByName(file.buffer);
  return parseConsolidatedPortfolioSheets(sheetsByName);
}

export function isConsolidatedPortfolioFile(file: BrokerReportFile): boolean {
  const workbook = XLSX.read(file.buffer, { type: "buffer", bookSheets: true });
  return workbook.SheetNames.includes("US Stocks");
}
