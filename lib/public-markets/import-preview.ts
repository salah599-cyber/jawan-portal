import { db } from "@/lib/db";
import type { PublicMarket } from "@/lib/generated/prisma/client";
import { findPortfolioAsset } from "@/lib/data/public-markets";
import { ensurePublicMarketsSchema } from "@/lib/db/ensure-public-markets-schema";
import { parseMarketReport } from "@/lib/public-markets/parsers/router";
import type { BrokerReportFile } from "@/lib/public-markets/types";

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
  replaceScopes: ImportPreviewReplaceScope[];
};

async function getManualEquitySymbols(
  entityId: string,
  market: PublicMarket,
): Promise<Set<string>> {
  const asset = await findPortfolioAsset(entityId, market);
  if (!asset) return new Set();

  const holdings = await db.publicEquityHolding.findMany({
    where: {
      assetId: asset.id,
      market,
      source: "MANUAL",
      instrumentType: "EQUITY",
    },
    select: { symbol: true },
  });

  return new Set(holdings.map((holding) => holding.symbol.toUpperCase()));
}

async function getExistingImportCounts(
  entityId: string,
  market: PublicMarket,
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
  files: BrokerReportFile[],
): Promise<ImportPreviewResult> {
  await ensurePublicMarketsSchema();

  const manualSymbols = await getManualEquitySymbols(entityId, market);
  const fileResults: ImportPreviewFileResult[] = [];
  const uploadedSymbols = new Set<string>();
  const replaceScopeKeys = new Map<string, ImportPreviewReplaceScope>();

  for (const file of files) {
    try {
      const parsed = await parseMarketReport(file, market);
      const symbols = parsed.holdings.map((holding) => holding.symbol.toUpperCase());

      for (const symbol of symbols) {
        uploadedSymbols.add(symbol);
      }

      const scopeKey = `${parsed.broker}::${parsed.accountNumber ?? ""}`;
      if (!replaceScopeKeys.has(scopeKey)) {
        replaceScopeKeys.set(scopeKey, {
          broker: parsed.broker,
          accountNumber: parsed.accountNumber,
          existingImportCount: 0,
        });
      }

      fileResults.push({
        fileName: file.fileName,
        broker: parsed.broker,
        accountNumber: parsed.accountNumber,
        holdingsFound: parsed.holdings.length,
        symbols,
        warnings: parsed.warnings,
        error: parsed.holdings.length === 0 ? "No holdings found in this report." : undefined,
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
    [...replaceScopeKeys.values()],
  );

  return {
    files: fileResults,
    manualOverlaps,
    replaceScopes,
  };
}

import { formatManualOverlapWarning } from "@/lib/public-markets/import-warnings";