import type { PublicMarket } from "@/lib/generated/prisma/client";

export type ImportHoldingReplaceScope = {
  assetId: string;
  market: PublicMarket;
  brokerAccountId: string;
  source: "IMPORT";
  isManaged: boolean;
};

export function buildImportHoldingReplaceScope(input: {
  assetId: string;
  market: PublicMarket;
  brokerAccountId: string;
  isManaged: boolean;
}): ImportHoldingReplaceScope {
  return {
    assetId: input.assetId,
    market: input.market,
    brokerAccountId: input.brokerAccountId,
    source: "IMPORT",
    isManaged: input.isManaged,
  };
}

export function planImportSymbolSync(existingSymbols: string[], importedSymbols: string[]) {
  const existingSet = new Set(existingSymbols);
  const importedSet = new Set(importedSymbols);

  return {
    toUpdate: importedSymbols.filter((symbol) => existingSet.has(symbol)),
    toCreate: importedSymbols.filter((symbol) => !existingSet.has(symbol)),
    toDelete: existingSymbols.filter((symbol) => !importedSet.has(symbol)),
  };
}

export function resolveImportManagementType(
  brokerAccount: { isManaged: boolean },
  override?: boolean | null,
) {
  return override ?? brokerAccount.isManaged;
}

export function scopesAreIsolated(
  managedScope: ImportHoldingReplaceScope,
  referenceScope: ImportHoldingReplaceScope,
) {
  return managedScope.isManaged !== referenceScope.isManaged;
}
