import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatOmr } from "@/lib/format";
import type { CashBreakdownRow } from "@/lib/data/cash-management";

function BreakdownList({
  title,
  rows,
  emptyLabel,
}: {
  title: string;
  rows: CashBreakdownRow[];
  emptyLabel: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyLabel}</p>
        ) : (
          <ul className="space-y-3">
            {rows.map((row) => (
              <li key={row.label} className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{row.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {row.accountCount} account{row.accountCount === 1 ? "" : "s"}
                  </p>
                </div>
                <p className="text-right font-medium tabular-nums">{formatOmr(row.totalOmr)}</p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function CashBreakdown({
  byBank,
  byEntity,
  byCurrency,
}: {
  byBank: CashBreakdownRow[];
  byEntity: CashBreakdownRow[];
  byCurrency: Array<CashBreakdownRow & { totalNative: number }>;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <BreakdownList title="By Bank" rows={byBank} emptyLabel="No accounts yet." />
      <BreakdownList title="By Entity" rows={byEntity} emptyLabel="No accounts yet." />
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">By Currency</CardTitle>
        </CardHeader>
        <CardContent>
          {byCurrency.length === 0 ? (
            <p className="text-sm text-muted-foreground">No accounts yet.</p>
          ) : (
            <ul className="space-y-3">
              {byCurrency.map((row) => (
                <li key={row.label} className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{row.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {row.totalNative.toLocaleString("en-OM", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      {row.label} native
                    </p>
                  </div>
                  <p className="text-right font-medium tabular-nums">{formatOmr(row.totalOmr)}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
