import Link from "next/link";
import type { PublicMarket } from "@/lib/generated/prisma/client";
import {
  MARKET_CONFIG,
  PUBLIC_MARKET_ORDER,
  PUBLIC_MARKETS_PATH,
  slugFromMarket,
} from "@/lib/public-markets/constants";
import { Button } from "@/components/ui/button";

export function MarketTabs({
  activeMarket,
  entityId,
  showAll = true,
}: {
  activeMarket: PublicMarket | "ALL";
  entityId?: string;
  showAll?: boolean;
}) {
  const baseParams = entityId ? `entity=${entityId}&` : "";

  return (
    <div className="flex flex-wrap gap-2">
      {showAll ? (
        <Button variant={activeMarket === "ALL" ? "default" : "outline"} size="sm" asChild>
          <Link href={`${PUBLIC_MARKETS_PATH}?${baseParams}market=ALL`}>All Markets</Link>
        </Button>
      ) : null}
      {PUBLIC_MARKET_ORDER.map((market) => {
        const slug = slugFromMarket(market);
        const isActive = activeMarket === market;
        return (
          <Button key={market} variant={isActive ? "default" : "outline"} size="sm" asChild>
            <Link href={`${PUBLIC_MARKETS_PATH}?${baseParams}market=${slug}`}>
              {MARKET_CONFIG[market].shortLabel}
            </Link>
          </Button>
        );
      })}
    </div>
  );
}
