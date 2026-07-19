"use client";

import type { ManagedPortfolioSummary } from "@/lib/data/managed-portfolios";
import { formatMoney } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ManagedPortfolioSummaryCards({
  summaries,
}: {
  summaries: ManagedPortfolioSummary[];
}) {
  if (summaries.length === 0) return null;

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {summaries.map((summary) => (
        <Card key={summary.id ?? "private"}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{summary.label}</CardTitle>
            {summary.managerName ? (
              <p className="text-sm text-muted-foreground">{summary.managerName}</p>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Market value</span>
              <span className="font-medium">{formatMoney(summary.totalMarketValueOmr, "OMR")}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Cost basis</span>
              <span>{formatMoney(summary.totalCostBasisOmr, "OMR")}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Unrealised P&L</span>
              <span>{formatMoney(summary.totalUnrealisedPnlOmr, "OMR")}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Holdings</span>
              <span>{summary.holdingCount}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
