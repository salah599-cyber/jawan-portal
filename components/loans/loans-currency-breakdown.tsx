import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney, formatOmr } from "@/lib/format";
import type { LoansCurrencyBreakdown as LoansCurrencyBreakdownRow } from "@/lib/data/loans-summary";

export function LoansCurrencyBreakdown({
  byCurrency,
}: {
  byCurrency: LoansCurrencyBreakdownRow[];
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">By Currency</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {byCurrency.map((row) => (
            <li key={row.currency} className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">{row.currency}</p>
                <p className="text-xs text-muted-foreground">
                  {row.loanCount} loan{row.loanCount === 1 ? "" : "s"}
                  {row.outstandingNative > 0
                    ? ` · ${formatMoney(row.outstandingNative, row.currency)} outstanding`
                    : ""}
                </p>
              </div>
              <div className="text-right">
                <p className="font-medium tabular-nums">{formatOmr(row.outstandingOmr)}</p>
                {row.periodInterestNative > 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {formatMoney(row.periodInterestNative, row.currency)} period interest
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
