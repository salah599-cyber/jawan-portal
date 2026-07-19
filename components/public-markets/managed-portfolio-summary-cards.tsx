"use client";

import Link from "next/link";
import type { ManagedPortfolioSummary } from "@/lib/data/managed-portfolios";
import { formatMoney } from "@/lib/format";
import { PUBLIC_MARKETS_PATH } from "@/lib/public-markets/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function formatReturn(value: number | null): string {
  if (value == null) return "—";
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(1)}%`;
}

export function ManagedPortfolioSummaryCards({
  summaries,
  entityId,
  marketSlug,
}: {
  summaries: ManagedPortfolioSummary[];
  entityId?: string;
  marketSlug?: string;
}) {
  if (summaries.length === 0) return null;

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {summaries.map((summary) => {
        const params = new URLSearchParams();
        if (entityId) params.set("entity", entityId);
        if (marketSlug) params.set("market", marketSlug);
        params.set("portfolio", summary.portfolioSlug);
        const href = `${PUBLIC_MARKETS_PATH}?${params.toString()}`;

        return (
          <Card key={summary.id ?? "private"} className="transition-colors hover:border-primary/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                <Link href={href} className="hover:underline">
                  {summary.label}
                </Link>
              </CardTitle>
              {summary.managerName ? (
                <p className="text-sm text-muted-foreground">{summary.managerName}</p>
              ) : null}
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Market value</span>
                <span className="font-medium">
                  {formatMoney(summary.totalMarketValueOmr, "OMR")}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Unrealised return</span>
                <span>{formatReturn(summary.unrealisedReturnPct)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">1M change</span>
                <span>{formatReturn(summary.periodReturnPct)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Holdings</span>
                <span>{summary.holdingCount}</span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
