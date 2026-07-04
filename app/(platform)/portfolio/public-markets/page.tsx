import Link from "next/link";
import { PlatformHeader } from "@/components/platform/platform-header";
import { AddManualHoldingForm } from "@/components/public-markets/add-manual-holding-form";
import { ExportHoldingsButton } from "@/components/public-markets/export-holdings-button";
import { RefreshPricesButton } from "@/components/public-markets/refresh-prices-button";
import { MarketTabs } from "@/components/public-markets/market-tabs";
import {
  AllMarketsSummaryCards,
  MarketBreakdownTable,
  PublicMarketSummaryCards,
} from "@/components/public-markets/public-market-summary";
import { PublicHoldingsTable } from "@/components/public-markets/public-holdings-table";
import { PublicImportHistoryTable } from "@/components/public-markets/public-import-history-table";
import { UploadPublicMarketReportsForm } from "@/components/public-markets/upload-reports-form";
import {
  getAllMarketsSummary,
  getPublicHoldings,
  getPublicImportBatches,
  getPublicMarketSummary,
  listPublicMarketsEntities,
  resolveMarketFromSearchParam,
} from "@/lib/data/public-markets";
import { MARKET_CONFIG, getMarketPricingNote } from "@/lib/public-markets/constants";
import { hasAutomaticPriceRefresh } from "@/lib/public-markets/prices/symbols";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

export default async function PublicMarketsPage({
  searchParams,
}: {
  searchParams: Promise<{ entity?: string; market?: string }>;
}) {
  const { entity: entityParam, market: marketParam } = await searchParams;
  const { mode, market } = resolveMarketFromSearchParam(marketParam);
  const ctx = await requireModuleAccess("ASSETS");
  const entities = await listPublicMarketsEntities(ctx);
  const entityId = entityParam && entities.some((entity) => entity.id === entityParam)
    ? entityParam
    : entities[0]?.id;

  const isAllMarkets = mode === "all";
  const activeMarket = isAllMarkets ? "ALL" : market;

  const [summary, allSummary, holdings, importBatches] = await Promise.all([
    isAllMarkets ? null : getPublicMarketSummary(ctx, entityId, market),
    isAllMarkets ? getAllMarketsSummary(ctx, entityId) : null,
    getPublicHoldings(ctx, {
      entityId,
      market: isAllMarkets ? null : market,
    }),
    getPublicImportBatches(ctx, {
      market: isAllMarkets ? null : market,
    }),
  ]);

  const canEdit = canWrite(ctx, "ASSETS");
  const marketConfig = isAllMarkets ? null : MARKET_CONFIG[market];

  return (
    <>
      <PlatformHeader title="Public Markets" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">
              {isAllMarkets ? "All Markets" : marketConfig?.label}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isAllMarkets
                ? "Consolidated view of public equity holdings across MSX, GCC, USA, Hong Kong, China, India, UK, and other markets."
                : marketConfig?.description}
            </p>
            {!isAllMarkets && getMarketPricingNote(market) ? (
              <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
                {getMarketPricingNote(market)}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ExportHoldingsButton entityId={entityId} market={activeMarket} />
            {canEdit ? (
              <RefreshPricesButton
                entityId={entityId}
                market={activeMarket}
                disabled={!isAllMarkets && !hasAutomaticPriceRefresh(market)}
              />
            ) : null}
            {marketConfig?.marketDataUrl ? (
              <Button variant="outline" size="sm" asChild>
                <Link href={marketConfig.marketDataUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Market Data
                </Link>
              </Button>
            ) : null}
          </div>
        </div>

        <MarketTabs activeMarket={activeMarket} entityId={entityId} />

        {entities.length > 1 ? (
          <div className="flex flex-wrap gap-2">
            {entities.map((entity) => (
              <Button
                key={entity.id}
                variant={entity.id === entityId ? "default" : "outline"}
                size="sm"
                asChild
              >
                <Link
                  href={`/portfolio/public-markets?entity=${entity.id}&market=${isAllMarkets ? "ALL" : marketConfig?.slug ?? "MSX"}`}
                >
                  {entity.name}
                </Link>
              </Button>
            ))}
          </div>
        ) : null}

        {isAllMarkets ? (
          <>
            <AllMarketsSummaryCards summary={allSummary} />
            <MarketBreakdownTable summary={allSummary} />
          </>
        ) : (
          <PublicMarketSummaryCards summary={summary} />
        )}

        {canEdit && !isAllMarkets ? (
          <>
            <UploadPublicMarketReportsForm
              entities={entities}
              defaultEntityId={entityId}
              market={market}
            />
            <AddManualHoldingForm entities={entities} defaultEntityId={entityId} market={market} />
          </>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Holdings</CardTitle>
            <CardDescription>
              {isAllMarkets
                ? "All positions across markets, with values converted to OMR where applicable."
                : "Consolidated positions across imported broker reports and manual entries. Re-importing a broker statement replaces that broker's holdings only."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PublicHoldingsTable
              holdings={holdings}
              canEdit={canEdit && !isAllMarkets}
              showMarket={isAllMarkets}
              showOmr={isAllMarkets}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Import History</CardTitle>
            <CardDescription>Recent brokerage report uploads and parsed row counts.</CardDescription>
          </CardHeader>
          <CardContent>
            <PublicImportHistoryTable batches={importBatches} showMarket={isAllMarkets} />
          </CardContent>
        </Card>
      </main>
    </>
  );
}
