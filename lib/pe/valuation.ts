export function getPeCarryingValue(
  totalInvested: number,
  latestFairValue: number | null | undefined,
): number {
  if (latestFairValue != null && latestFairValue > 0) return latestFairValue;
  return totalInvested > 0 ? totalInvested : 0;
}

export const ACTIVE_PE_COMPANY_STATUSES = ["ACTIVE", "FOLLOW_ON_PENDING", "WATCHLIST"] as const;
