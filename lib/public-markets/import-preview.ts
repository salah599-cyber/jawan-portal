import { db } from "@/lib/db";
import type { PublicMarket } from "@/lib/generated/prisma/client";
import { findPortfolioAsset } from "@/lib/data/public-markets";
import { ensurePublicMarketsSchema } from "@/lib/db/ensure-public-markets-schema";
import { parseMarketReport } from "@/lib/public-markets/parsers/router";
import type { BrokerReportFile } from "@/lib/public-markets/types";
import { normalizeBrokerName } from "@/lib/public-markets/broker-normalize";
import {
  buildManualOverlapDetails,
  groupManualEquityHoldings,
  type ManualEquitySnapshot,
  type ManualOverlapDetail,
} from "@/lib/public-markets/overlap-resolution";

export type ImportPreviewFileResult = {
  fileName: string;
  broker: string;
  accountNumber?: string;
  holdingsFound: number;
  symbols: string[];
  warnings: string[];
  error?: string;
};

export type ImportPreviewReplaceScope = {
  broker: string;
  accountNumber?: string;
  existingImportCount: number;
};

export type ImportPreviewResult = {
  files: ImportPreviewFileResult[];
  manualOverlaps: string[];
  manualOverlapDetails: ManualOverlapDetail[];
  replaceScopes: ImportPreviewReplaceScope[];
};

function toNumber(value: { toString(): string } | number | null | undefined): number | null {
  if (value == null) return null;
  const num = typeof value === "number" ? value : parseFloat(value.toString());
  return Number.isNaN(num) ? null : num;
}

export async function getManualEquityHoldings(
  entityId: string,
  market: PublicMarket,
  managedPortfolioId: string,
): Promise<ManualEquitySnapshot[]> {
  const asset = await findPortfolioAsset(entityId, market);
  if (!asset) return [];

  const holdings = await db.publicEquityHolding.findMany({
    where: {
      assetId: asset.id,
      market,
      managedPortfolioId,
      source: "MANUAL",
      instrumentType: "EQUITY",
    },
    select: {
      id: true,
      symbol: true,
      quantity: true,
      costBasis: true,
      marketPrice: true,
      marketValue: true,
      unrealisedPnl: true,
      name: true,
    },
  });

  return holdings.map((holding) => ({
    id: holding.id,
    symbol: holding.symbol.toUpperCase(),
    quantity: toNumber(holding.quantity) ?? 0,
    costBasis: toNumber(holding.costBasis),
    marketPrice: toNumber(holding.marketPrice),
    marketValue: toNumber(holding.marketValue),
    unrealisedPnl: toNumber(holding.unrealisedPnl),
    name: holding.name,
  }));
}

async function getExistingImportCounts(
  entityId: string,
  market: PublicMarket,
  managedPortfolioId: string,
  scopes: Array<{ broker: string; accountNumber?: string }>,
): Promise<ImportPreviewReplaceScope[]> {
  const asset = await findPortfolioAsset(entityId, market);
  if (!asset) {
    return scopes.map((scope) => ({
      broker: scope.broker,
      accountNumber: scope.accountNumber,
      existingImportCount: 0,
    }));
  }

  const results: ImportPreviewReplaceScope[] = [];

  for (const scope of scopes) {
    const count = await db.publicEquityHolding.count({
      where: {
        assetId: asset.id,
        market,
        managedPortfolioId,
        broker: scope.broker,
        source: "IMPORT",
        ...(scope.accountNumber ? { accountNumber: scope.accountNumber } : {}),
      },
    });

    results.push({
      broker: scope.broker,
      accountNumber: scope.accountNumber,
      existingImportCount: count,
    });
  }

  return results;
}

export async function previewImportForEntity(
  entityId: string,
  market: PublicMarket,
  managedPortfolioId: string,
  files: BrokerReportFile[],
): Promise<ImportPreviewResult> {
  await ensurePublicMarketsSchema();

  const portfolio = await db.managedPortfolio.findFirst({
    where: { id: managedPortfolioId, entityId, status: { in: ["ACTIVE", "MONITOR"] } },
  });

  if (!portfolio) {
    throw new Error("Managed portfolio not found for this entity.");
  }

  const manualHoldings = await getManualEquityHoldings(entityId, market, managedPortfolioId);
  const manualBySymbol = groupManualEquityHoldings(manualHoldings);
  const manualSymbols = new Set(manualBySymbol.keys());
  const fileResults: ImportPreviewFileResult[] = [];
  const uploadedSymbols = new Set<string>();
  const replaceScopeKeys = new Map<string, ImportPreviewReplaceScope>();
  const overlapDetailsBySymbol = new Map<string, ManualOverlapDetail>();

  for (const file of files) {
    try {
      const parsed = await parseMarketReport(file, market);
      const broker = normalizeBrokerName(parsed.broker);
      const normalizedParsed = { ...parsed, broker };
      const symbols = normalizedParsed.holdings.map((holding) => holding.symbol.toUpperCase());

      for (const holding of normalizedParsed.holdings) {
        const symbol = holding.symbol.toUpperCase();
        uploadedSymbols.add(symbol);

        if (manualSymbols.has(symbol)) {
          for (const detail of buildManualOverlapDetails([holding], manualBySymbol)) {
            overlapDetailsBySymbol.set(detail.symbol, detail);
          }
        }
      }

      const scopeKey = `${normalizedParsed.broker}::${normalizedParsed.accountNumber ?? ""}`;
      if (!replaceScopeKeys.has(scopeKey)) {
        replaceScopeKeys.set(scopeKey, {
          broker: normalizedParsed.broker,
          accountNumber: normalizedParsed.accountNumber,
          existingImportCount: 0,
        });
      }

      fileResults.push({
        fileName: file.fileName,
        broker: normalizedParsed.broker,
        accountNumber: normalizedParsed.accountNumber,
        holdingsFound: normalizedParsed.holdings.length,
        symbols,
        warnings: normalizedParsed.warnings,
        error:
          normalizedParsed.holdings.length === 0 ? "No holdings found in this report." : undefined,
      });
    } catch (error) {
      fileResults.push({
        fileName: file.fileName,
        broker: "Unknown",
        holdingsFound: 0,
        symbols: [],
        warnings: [],
        error: error instanceof Error ? error.message : "Failed to parse report.",
      });
    }
  }

  const manualOverlaps = [...uploadedSymbols]
    .filter((symbol) => manualSymbols.has(symbol))
    .sort();

  const replaceScopes = await getExistingImportCounts(
    entityId,
    market,
    managedPortfolioId,
    [...replaceScopeKeys.values()],
  );

  return {
    files: fileResults,
    manualOverlaps,
    manualOverlapDetails: [...overlapDetailsBySymbol.values()].sort((a, b) =>
      a.symbol.localeCompare(b.symbol),
    ),
    replaceScopes,
  };
}
