/**
 * Shared profit/ROI formulas for exit recording across assets, private equity,
 * and real estate. Kept in one place so every exit path computes gain and ROI
 * the same way.
 */

function toNum(value: number | string | { toString(): string } | null | undefined): number | null {
  if (value == null || value === "") return null;
  const num = typeof value === "number" ? value : parseFloat(value.toString());
  return Number.isNaN(num) ? null : num;
}

/** realizedGain = proceeds − costBasis */
export function computeRealizedGain(
  proceeds: number | string | { toString(): string } | null | undefined,
  costBasis: number | string | { toString(): string } | null | undefined,
): number | null {
  const proceedsNum = toNum(proceeds);
  const costBasisNum = toNum(costBasis);
  if (proceedsNum == null || costBasisNum == null) return null;
  const gain = proceedsNum - costBasisNum;
  return Number.isNaN(gain) ? null : gain;
}

/** roiPct = (gain / costBasis) × 100, only when costBasis is a positive number. */
export function computeRoiPct(
  gain: number | string | { toString(): string } | null | undefined,
  costBasis: number | string | { toString(): string } | null | undefined,
): number | null {
  const gainNum = toNum(gain);
  const costBasisNum = toNum(costBasis);
  if (gainNum == null || costBasisNum == null || costBasisNum <= 0) return null;
  const roi = (gainNum / costBasisNum) * 100;
  return Number.isNaN(roi) ? null : roi;
}

export function formatRoiPct(value: number | string | { toString(): string } | null | undefined): string {
  const num = toNum(value);
  if (num == null) return "—";
  const sign = num > 0 ? "+" : "";
  return `${sign}${num.toFixed(1)}%`;
}

export function roiTone(value: number | string | { toString(): string } | null | undefined): string {
  const num = toNum(value);
  if (num == null || num === 0) return "text-foreground";
  return num > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400";
}
