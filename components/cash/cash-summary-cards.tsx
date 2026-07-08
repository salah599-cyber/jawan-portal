import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatOmr, formatDate } from "@/lib/format";
import type { CashSummary } from "@/lib/data/cash-management";

export function CashSummaryCards({ summary }: { summary: CashSummary }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Cash (OMR)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold tracking-tight">{formatOmr(summary.totalOmr)}</p>
          <p className="mt-1 text-xs text-muted-foreground">Across {summary.accountCount} active accounts</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold tracking-tight">{summary.accountCount}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {summary.staleCount > 0
              ? `${summary.staleCount} need updating`
              : "All balances are current"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Last Updated</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold tracking-tight">
            {summary.lastUpdated ? formatDate(summary.lastUpdated) : "—"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Most recent balance entry</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Currencies</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold tracking-tight">{summary.byCurrency.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">Converted to OMR automatically</p>
        </CardContent>
      </Card>
    </div>
  );
}
