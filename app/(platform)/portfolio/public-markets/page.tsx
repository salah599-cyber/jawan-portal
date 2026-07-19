import Link from "next/link";
import { PlatformHeader } from "@/components/platform/platform-header";
import { AddManualHoldingForm } from "@/components/public-markets/add-manual-holding-form";
import { AddManualCryptoForm } from "@/components/public-markets/add-manual-crypto-form";
import { AddManualOptionForm } from "@/components/public-markets/add-manual-option-form";
import { AddManualStructuredNoteForm } from "@/components/public-markets/add-manual-structured-note-form";
import { ExportHoldingsButton } from "@/components/public-markets/export-holdings-button";
import { DownloadPortfolioTemplateButton } from "@/components/public-markets/download-portfolio-template-button";
import { PublicMarketsFilters } from "@/components/public-markets/public-markets-filters";
import { RefreshPricesButton } from "@/components/public-markets/refresh-prices-button";
import { RefreshCryptoPricesButton } from "@/components/public-markets/refresh-crypto-prices-button";
import {
  AllMarketsSummaryCards,
  MarketBreakdownTable,
  PublicMarketSummaryCards,
} from "@/components/public-markets/public-market-summary";
import { PublicHoldingsTable } from "@/components/public-markets/public-holdings-table";
import { PublicImportHistoryTable } from "@/components/public-markets/public-import-history-table";
import { BrokerAccountsCard } from "@/components/public-markets/broker-accounts-card";
import { UploadPublicMarketReportsForm } from "@/components/public-markets/upload-reports-form";
import {
  getAllMarketsSummary,
  getPublicHoldings,
  getPublicImportBatches,
  getPublicMarketSummary,
  listPublicMarketsEntities,
  resolveMarketFromSearchParam,
} from "@/lib/data/public-markets";
import {
  MARKET_CONFIG,
  getMarketPricingNote,
  resolveInstrumentFromSearchParam,
  resolveManagementFromSearchParam,
  slugFromMarket,
} from "@/lib/public-markets/constants";
import { listPublicBrokerAccountsForEntity } from "@/lib/public-markets/broker-accounts";
import { hasAutomaticPriceRefresh } from "@/lib/public-markets/prices/symbols";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

export default async function PublicMarketsPage({
  searchParams,
}: {
  searchParams: Promise<{ entity?: string; market?: string; instrument?: string; management?: string }>;
}) {
  const {
    entity: entityParam,
    market: marketParam,
    instrument: instrumentParam,
    management: managementParam,
  } = await searchParams;
  const { mode, market } = resolveMarketFromSearchParam(marketParam);
  const { slug: instrumentSlug, instrumentType } =
    resolveInstrumentFromSearchParam(instrumentParam);
  const management = resolveManagementFromSearchParam(managementParam);
  const ctx = await requireModuleAccess("ASSETS");
  const entities = await listPublicMarketsEntities(ctx);
  const entityId = entityParam && entities.some((entity) => entity.id === entityParam)
    ? entityParam
    : entities[0]?.id;

  const isAllMarkets = mode === "all";
  const activeMarket = isAllMarkets ? "ALL" : market;
  const marketSlug = isAllMarkets ? "ALL" : slugFromMarket(market);
  const isEquityTab = instrumentSlug === "equity";
  const isCryptoTab = instrumentSlug === "crypto";
  const canEdit = canWrite(ctx, "ASSETS");

  const [summary, allSummary, holdings, importBatches, brokerAccounts] = await Promise.all([
    isAllMarkets ? null : getPublicMarketSummary(ctx, entityId, market),
    isAllMarkets ? getAllMarketsSummary(ctx, entityId) : null,
    getPublicHoldings(ctx, {
      entityId,
      market: isAllMarkets ? null : market,
      instrumentType,
      management: isEquityTab ? management : "all",
    }),
    isEquityTab
      ? getPublicImportBatches(ctx, {
          market: isAllMarkets ? null : market,
        })
      : Promise.resolve([]),
    canEdit && isEquityTab && entityId
      ? listPublicBrokerAccountsForEntity(ctx, entityId)
      : Promise.resolve([]),
  ]);

  const marketConfig = isAllMarkets ? null : MARKET_CONFIG[market];
  const holdingsDescription =
    instrumentSlug === "options"
      ? "Options positions with manual mark-to-market values. Live option pricing is not available."
      : instrumentSlug === "structured-notes"
        ? "Structured notes with issuer, notional, maturity, and manual MTM values."
        : instrumentSlug === "crypto"
          ? "Cryptocurrency positions priced via CoinGecko in USD, with optional manual overrides."
          : isAllMarkets
          ? "All positions across markets, with values converted to OMR where applicable."
          : "Consolidated positions across imported broker reports and manual entries. Re-importing replaces holdings for the selected broker account and portfolio type only.";

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
            {!isAllMarkets && isEquityTab && getMarketPricingNote(market) ? (
              <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
                {getMarketPricingNote(market)}
              </p>
            ) : null}
            {!isEquityTab ? (
              <p className="mt-1 text-sm text-muted-foreground">
                Options, structured notes, and crypto roll into your public equity portfolio total via
                market value.
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <DownloadPortfolioTemplateButton />
            <ExportHoldingsButton entityId={entityId} market={activeMarket} />
            {canEdit && isEquityTab ? (
              <RefreshPricesButton
                entityId={entityId}
                market={activeMarket}
                disabled={!isAllMarkets && !hasAutomaticPriceRefresh(market)}
              />
            ) : null}
            {canEdit && isCryptoTab ? (
              <RefreshCryptoPricesButton entityId={entityId} />
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

        <PublicMarketsFilters
          activeMarket={activeMarket}
          activeInstrument={instrumentSlug}
          activeManagement={management}
          showManagementFilter={isEquityTab}
          entityId={entityId}
          entities={entities}
          currentParams={{
            entity: entityParam,
            market: isAllMarkets ? "ALL" : marketParam ?? slugFromMarket(market),
            instrument: instrumentSlug === "equity" ? undefined : instrumentSlug,
            management: management === "all" ? undefined : management,
          }}
        />

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
            {isEquityTab ? (
              <>
                <BrokerAccountsCard
                  entities={entities}
                  defaultEntityId={entityId}
                  accounts={brokerAccounts}
                />
                <UploadPublicMarketReportsForm
                  entities={entities}
                  defaultEntityId={entityId}
                  market={market}
                />
                <AddManualHoldingForm
                  entities={entities}
                  defaultEntityId={entityId}
                  market={market}
                />
              </>
            ) : null}
            {instrumentSlug === "options" ? (
              <AddManualOptionForm
                entities={entities}
                defaultEntityId={entityId}
                market={market}
              />
            ) : null}
            {instrumentSlug === "structured-notes" ? (
              <AddManualStructuredNoteForm
                entities={entities}
                defaultEntityId={entityId}
              />
            ) : null}
            {instrumentSlug === "crypto" ? (
              <AddManualCryptoForm entities={entities} defaultEntityId={entityId} />
            ) : null}
          </>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Holdings</CardTitle>
            <CardDescription>{holdingsDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <PublicHoldingsTable
              holdings={holdings}
              canEdit={canEdit && !isAllMarkets}
              showMarket={isAllMarkets}
              showOmr={isAllMarkets}
              instrumentType={instrumentType}
            />
          </CardContent>
        </Card>

        {isEquityTab ? (
          <Card>
            <CardHeader>
              <CardTitle>Import History</CardTitle>
              <CardDescription>
                Recent brokerage report uploads and parsed row counts.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PublicImportHistoryTable batches={importBatches} showMarket={isAllMarkets} />
            </CardContent>
          </Card>
        ) : null}
      </main>
    </>
  );
}
