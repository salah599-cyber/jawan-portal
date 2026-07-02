import { formatDate, formatMoney } from "@/lib/format";
import type { AllMarketsSummary, PublicMarketSummary } from "@/lib/data/public-markets";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function SummaryMetric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">{value}</p>
        {detail ? <p className="mt-1 text-xs text-muted-foreground">{detail}</p> : null}
      </CardContent>
    </Card>
  );
}

export function PublicMarketSummaryCards({
  summary,
  showOmr = false,
}: {
  summary: PublicMarketSummary | null;
  showOmr?: boolean;
}) {
  if (!summary) {
    return (
      <p className="text-sm text-muted-foreground">
        Select an entity and upload brokerage reports or add holdings manually.
      </p>
    );
  }

  const currency = summary.currency;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <SummaryMetric
        label="Market Value"
        value={formatMoney(summary.totalMarketValue, currency)}
        detail={
          showOmr
            ? `≈ ${formatMoney(summary.totalMarketValueOmr, "OMR")} in OMR`
            : summary.lastUpdated
              ? `Updated ${formatDate(summary.lastUpdated)}`
              : undefined
        }
      />
      <SummaryMetric
        label="Cost Basis"
        value={formatMoney(summary.totalCostBasis, currency)}
        detail={`${summary.entityName} · ${summary.shortLabel}`}
      />
      <SummaryMetric
        label="Unrealised P&L"
        value={formatMoney(summary.totalUnrealisedPnl, currency)}
      />
      <SummaryMetric
        label="Holdings"
        value={summary.holdingCount.toString()}
        detail={`Across ${summary.brokerCount} broker${summary.brokerCount === 1 ? "" : "s"}`}
      />
    </div>
  );
}

export function AllMarketsSummaryCards({ summary }: { summary: AllMarketsSummary | null }) {
  if (!summary) {
    return (
      <p className="text-sm text-muted-foreground">
        Select an entity to view consolidated public markets exposure.
      </p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <SummaryMetric
        label="Total Market Value"
        value={formatMoney(summary.totalMarketValueOmr, "OMR")}
        detail={summary.lastUpdated ? `Updated ${formatDate(summary.lastUpdated)}` : undefined}
      />
      <SummaryMetric
        label="Cost Basis (OMR)"
        value={formatMoney(summary.totalCostBasisOmr, "OMR")}
        detail={`${summary.entityName} · All markets`}
      />
      <SummaryMetric
        label="Unrealised P&L (OMR)"
        value={formatMoney(summary.totalUnrealisedPnlOmr, "OMR")}
      />
      <SummaryMetric
        label="Holdings"
        value={summary.holdingCount.toString()}
        detail={`${summary.marketCount} market${summary.marketCount === 1 ? "" : "s"} · ${summary.brokerCount} brokers`}
      />
    </div>
  );
}

export function MarketBreakdownTable({ summary }: { summary: AllMarketsSummary | null }) {
  if (!summary || summary.byMarket.every((m) => m.holdingCount === 0)) {
    return null;
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50 text-left">
            <th className="px-3 py-2 font-medium">Market</th>
            <th className="px-3 py-2 text-right font-medium">Holdings</th>
            <th className="px-3 py-2 text-right font-medium">Market Value</th>
            <th className="px-3 py-2 text-right font-medium">In OMR</th>
          </tr>
        </thead>
        <tbody>
          {summary.byMarket
            .filter((market) => market.holdingCount > 0)
            .map((market) => (
              <tr key={market.market} className="border-b last:border-0">
                <td className="px-3 py-2">{market.shortLabel}</td>
                <td className="px-3 py-2 text-right">{market.holdingCount}</td>
                <td className="px-3 py-2 text-right">
                  {formatMoney(market.totalMarketValue, market.currency)}
                </td>
                <td className="px-3 py-2 text-right">
                  {formatMoney(market.totalMarketValueOmr, "OMR")}
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
