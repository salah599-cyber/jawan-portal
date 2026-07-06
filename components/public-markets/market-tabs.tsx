import Link from "next/link";
import type { PublicMarket } from "@/lib/generated/prisma/client";
import {
  MARKET_CONFIG,
  PUBLIC_MARKET_ORDER,
  PUBLIC_MARKETS_PATH,
  slugFromMarket,
  type PublicInstrumentSlug,
} from "@/lib/public-markets/constants";
import { Button } from "@/components/ui/button";

export function MarketTabs({
  activeMarket,
  entityId,
  showAll = true,
  instrumentSlug = "equity",
}: {
  activeMarket: PublicMarket | "ALL";
  entityId?: string;
  showAll?: boolean;
  instrumentSlug?: PublicInstrumentSlug;
}) {
  const baseParams = new URLSearchParams();
  if (entityId) baseParams.set("entity", entityId);
  baseParams.set("instrument", instrumentSlug);

  return (
    <div className="flex flex-wrap gap-2">
      {showAll ? (
        <Button variant={activeMarket === "ALL" ? "default" : "outline"} size="sm" asChild>
          <Link href={`${PUBLIC_MARKETS_PATH}?${baseParams.toString()}&market=ALL`}>
            All Markets
          </Link>
        </Button>
      ) : null}
      {PUBLIC_MARKET_ORDER.map((market) => {
        const slug = slugFromMarket(market);
        const isActive = activeMarket === market;
        const params = new URLSearchParams(baseParams);
        params.set("market", slug);
        return (
          <Button key={market} variant={isActive ? "default" : "outline"} size="sm" asChild>
            <Link href={`${PUBLIC_MARKETS_PATH}?${params.toString()}`}>
              {MARKET_CONFIG[market].shortLabel}
            </Link>
          </Button>
        );
      })}
    </div>
  );
}
