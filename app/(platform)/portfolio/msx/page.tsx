import Link from "next/link";
import { PlatformHeader } from "@/components/platform/platform-header";
import { MsxHoldingsTable } from "@/components/msx/msx-holdings-table";
import { MsxImportHistoryTable } from "@/components/msx/msx-import-history-table";
import { MsxPortfolioSummaryCards } from "@/components/msx/msx-portfolio-summary";
import { UploadBrokerReportsForm } from "@/components/msx/upload-broker-reports-form";
import {
  getMsxHoldings,
  getMsxImportBatches,
  getMsxPortfolioSummary,
  listMsxPortfolioEntities,
} from "@/lib/data/msx-portfolio";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

export default async function MsxPortfolioPage({
  searchParams,
}: {
  searchParams: Promise<{ entity?: string }>;
}) {
  const { entity: entityParam } = await searchParams;
  const ctx = await requireModuleAccess("ASSETS");
  const entities = await listMsxPortfolioEntities(ctx);
  const entityId = entityParam && entities.some((entity) => entity.id === entityParam)
    ? entityParam
    : entities[0]?.id;

  const [summary, holdings, importBatches] = await Promise.all([
    getMsxPortfolioSummary(ctx, entityId),
    getMsxHoldings(ctx, entityId),
    getMsxImportBatches(ctx),
  ]);

  const canEdit = canWrite(ctx, "ASSETS");

  return (
    <>
      <PlatformHeader title="MSX Portfolio" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Muscat Stock Exchange</h2>
            <p className="text-sm text-muted-foreground">
              Track Oman listed equities by importing brokerage statements from multiple brokers.
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="https://www.msx.om" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              MSX Market Data
            </Link>
          </Button>
        </div>

        {entities.length > 1 ? (
          <div className="flex flex-wrap gap-2">
            {entities.map((entity) => (
              <Button
                key={entity.id}
                variant={entity.id === entityId ? "default" : "outline"}
                size="sm"
                asChild
              >
                <Link href={`/portfolio/msx?entity=${entity.id}`}>{entity.name}</Link>
              </Button>
            ))}
          </div>
        ) : null}

        <MsxPortfolioSummaryCards summary={summary} />

        {canEdit ? (
          <UploadBrokerReportsForm entities={entities} defaultEntityId={entityId} />
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Holdings</CardTitle>
            <CardDescription>
              Consolidated positions across all imported broker reports. Re-importing a broker
              statement replaces that broker&apos;s holdings only.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MsxHoldingsTable holdings={holdings} canEdit={canEdit} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Import History</CardTitle>
            <CardDescription>Recent brokerage report uploads and parsed row counts.</CardDescription>
          </CardHeader>
          <CardContent>
            <MsxImportHistoryTable batches={importBatches} />
          </CardContent>
        </Card>
      </main>
    </>
  );
}
