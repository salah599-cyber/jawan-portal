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
import { ManageManagedPortfoliosCard } from "@/components/public-markets/manage-managed-portfolios-card";
import { ManagedPortfolioSummaryCards } from "@/components/public-markets/managed-portfolio-summary-cards";
import {
  getAllMarketsSummary,
  getPublicHoldings,
  getPublicImportBatches,
  getPublicMarketSummary,
  listPublicMarketsEntities,
  resolveMarketFromSearchParam,
} from "@/lib/data/public-markets";
import { UploadPublicMarketReportsForm } from "@/components/public-markets/upload-reports-form";
import { UploadConsolidatedPortfolioForm } from "@/components/public-markets/upload-consolidated-portfolio-form";
import {
  getManagedPortfolioSummaries,
  listManagedPortfolios,
} from "@/lib/data/managed-portfolios";
import {
  ALL_PORTFOLIOS_SLUG,
  MARKET_CONFIG,
  PRIVATE_PORTFOLIO_SLUG,
  getMarketPricingNote,
  resolveInstrumentFromSearchParam,
  resolveManagementFromSearchParam,
  resolvePortfolioFilter,
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
  searchParams: Promise<{
    entity?: string;
    market?: string;
    instrument?: string;
    portfolio?: string;
    management?: string;
  }>;
}) {
  const {
    entity: entityParam,
    market: marketParam,
    instrument: instrumentParam,
    portfolio: portfolioParam,
    management: managementParam,
  } = await searchParams;
  const { mode, market } = resolveMarketFromSearchParam(marketParam);
  const { slug: instrumentSlug, instrumentType } =
    resolveInstrumentFromSearchParam(instrumentParam);
  const portfolioFilter = resolvePortfolioFilter(portfolioParam);
  const management = resolveManagementFromSearchParam(managementParam);
  const activePortfolio =
    portfolioFilter.mode === "private"
      ? PRIVATE_PORTFOLIO_SLUG
      : portfolioFilter.mode === "managed" && portfolioFilter.managedPortfolioId
        ? portfolioFilter.managedPortfolioId
        : ALL_PORTFOLIOS_SLUG;
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
  const holdingsPortfolioFilter =
    portfolioFilter.mode === "private"
      ? "private"
      : portfolioFilter.mode === "managed"
        ? portfolioFilter.managedPortfolioId
        : undefined;

  const canEdit = canWrite(ctx, "ASSETS");

  const [summary, allSummary, holdings, importBatches, managedPortfolios, portfolioSummaries, brokerAccounts] =
    await Promise.all([
    isAllMarkets ? null : getPublicMarketSummary(ctx, entityId, market),
    isAllMarkets ? getAllMarketsSummary(ctx, entityId) : null,
    getPublicHoldings(ctx, {
      entityId,
      market: isAllMarkets ? null : market,
      instrumentType,
      managedPortfolioId: holdingsPortfolioFilter,
      management: isEquityTab ? management : "all",
    }),
    isEquityTab
      ? getPublicImportBatches(ctx, {
          market: isAllMarkets ? null : market,
          managedPortfolioId:
            portfolioFilter.mode === "managed" ? portfolioFilter.managedPortfolioId : undefined,
        })
      : Promise.resolve([]),
    entityId ? listManagedPortfolios(ctx, entityId) : Promise.resolve([]),
    entityId && isEquityTab && portfolioFilter.mode === "all"
      ? getManagedPortfolioSummaries(ctx, entityId, isAllMarkets ? null : market)
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
          : instrumentSlug === "bonds"
            ? "Fixed-income bond positions imported from consolidated portfolio or custodian statements."
            : isAllMarkets
          ? "All positions across markets and portfolios, with values converted to OMR where applicable."
          : "Positions for the selected portfolio. The same symbol can exist separately under different managers or in private holdings.";

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
            <ExportHoldingsButton
              entityId={entityId}
              market={activeMarket}
              portfolio={
                portfolioFilter.mode === "private"
                  ? "private"
                  : portfolioFilter.mode === "managed"
                    ? (portfolioFilter.managedPortfolioId ?? undefined)
                    : undefined
              }
            />
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
          activePortfolio={activePortfolio}
          activeManagement={management}
          showManagementFilter={isEquityTab}
          entityId={entityId}
          entities={entities}
          portfolios={managedPortfolios}
          currentParams={{
            entity: entityParam,
            market: isAllMarkets ? "ALL" : marketParam ?? slugFromMarket(market),
            instrument: instrumentSlug === "equity" ? undefined : instrumentSlug,
            portfolio:
              activePortfolio === ALL_PORTFOLIOS_SLUG ? undefined : activePortfolio,
            management: management === "all" ? undefined : management,
          }}
        />

        {isEquityTab && portfolioFilter.mode === "all" && portfolioSummaries.length > 0 ? (
          <ManagedPortfolioSummaryCards
            summaries={portfolioSummaries}
            entityId={entityId}
            marketSlug={marketSlug}
          />
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
            {isEquityTab ? (
              <>
                <BrokerAccountsCard
                  entities={entities}
                  defaultEntityId={entityId}
                  accounts={brokerAccounts}
                />
                <ManageManagedPortfoliosCard
                  entities={entities}
                  defaultEntityId={entityId}
                  portfolios={managedPortfolios}
                />
                <UploadPublicMarketReportsForm
                  entities={entities}
                  defaultEntityId={entityId}
                  market={market}
                  portfolios={managedPortfolios}
                  brokerAccounts={brokerAccounts}
                />
                <UploadConsolidatedPortfolioForm
                  entities={entities}
                  defaultEntityId={entityId}
                  portfolios={managedPortfolios}
                />
                <AddManualHoldingForm
                  entities={entities}
                  defaultEntityId={entityId}
                  market={market}
                  portfolios={managedPortfolios}
                  defaultPortfolioId={
                    portfolioFilter.mode === "managed"
                      ? portfolioFilter.managedPortfolioId ?? PRIVATE_PORTFOLIO_SLUG
                      : PRIVATE_PORTFOLIO_SLUG
                  }
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
              showPortfolio={portfolioFilter.mode === "all"}
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
              <PublicImportHistoryTable
                batches={importBatches}
                showMarket={isAllMarkets}
                showPortfolio={portfolioFilter.mode === "all"}
              />
            </CardContent>
          </Card>
        ) : null}
      </main>
    </>
  );
}
