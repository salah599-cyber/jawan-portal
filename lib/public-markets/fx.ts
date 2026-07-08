import type { PublicMarket } from "@/lib/generated/prisma/client";
import { convertToOmr, getRateToOmr } from "@/lib/fx";
import { MARKET_CONFIG } from "@/lib/public-markets/constants";

export { convertToOmr, getRateToOmr };

export function getMarketCurrency(market: PublicMarket): string {
  return MARKET_CONFIG[market].currency;
}

export async function convertMarketValueToOmr(
  marketValue: number | null | undefined,
  currency: string,
): Promise<number> {
  if (marketValue == null || Number.isNaN(marketValue)) return 0;
  return convertToOmr(marketValue, currency);
}
