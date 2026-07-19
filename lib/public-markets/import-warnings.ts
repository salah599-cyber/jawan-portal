import type { OverlapResolutionStrategy } from "@/lib/public-markets/overlap-resolution";

export function formatManualOverlapWarning(symbols: string[]): string {
  if (symbols.length === 0) return "";

  const listed =
    symbols.length <= 5
      ? symbols.join(", ")
      : `${symbols.slice(0, 5).join(", ")} and ${symbols.length - 5} more`;

  const noun = symbols.length === 1 ? "symbol already exists" : "symbols already exist";

  return `${symbols.length} ${noun} as manual entries (${listed}). Choose how to handle overlaps before importing.`;
}

export function formatOverlapResolutionSummary(
  strategy: OverlapResolutionStrategy,
  symbols: string[],
): string | null {
  if (symbols.length === 0) return null;

  const listed =
    symbols.length <= 5
      ? symbols.join(", ")
      : `${symbols.slice(0, 5).join(", ")} and ${symbols.length - 5} more`;

  switch (strategy) {
    case "keep_manual":
      return `Kept manual entries and skipped ${symbols.length} overlapping symbol${symbols.length === 1 ? "" : "s"} from the import (${listed}).`;
    case "replace_manual":
      return `Replaced ${symbols.length} manual entr${symbols.length === 1 ? "y" : "ies"} with managed import (${listed}).`;
    case "merge":
      return `Merged ${symbols.length} symbol${symbols.length === 1 ? "" : "s"} by combining manual and managed quantities (${listed}).`;
    default:
      return null;
  }
}
