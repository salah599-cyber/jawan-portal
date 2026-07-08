import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrencyTotals } from "@/lib/data/dashboard";
import { EXPENSE_STATUS_LABELS } from "@/lib/labels";
import type { ReportsSummary } from "@/lib/data/reports";

export function ReportsContent({ summary }: { summary: ReportsSummary }) {
  const { canViewFinancials, entityBreakdown, categoryBreakdown, expenseByStatus, totalAssetTotals, totalLiabilityTotals, totalNetTotals } =
    summary;

  return (
    <div className="flex flex-col gap-4">
      {canViewFinancials ? (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Asset Value</CardDescription>
                <CardTitle className="text-xl">{formatCurrencyTotals(totalAssetTotals)}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Liabilities</CardDescription>
                <CardTitle className="text-xl">{formatCurrencyTotals(totalLiabilityTotals)}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Net Worth</CardDescription>
                <CardTitle className="text-xl">{formatCurrencyTotals(totalNetTotals)}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Net Worth by Entity</CardTitle>
              <CardDescription>Weighted asset value, outstanding liabilities, and net position per legal entity.</CardDescription>
            </CardHeader>
            <CardContent>
              {entityBreakdown.length === 0 ? (
                <p className="text-sm text-muted-foreground">No entity data available.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Entity</TableHead>
                      <TableHead className="text-right">Assets</TableHead>
                      <TableHead className="text-right">Liabilities</TableHead>
                      <TableHead className="text-right">Net</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entityBreakdown.map((row) => (
                      <TableRow key={row.entityId}>
                        <TableCell className="font-medium">{row.entityName}</TableCell>
                        <TableCell className="text-right">{formatCurrencyTotals(row.assetTotals)}</TableCell>
                        <TableCell className="text-right">{formatCurrencyTotals(row.liabilityTotals)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrencyTotals(row.netTotals)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Assets by Category</CardTitle>
              <CardDescription>Portfolio composition across asset categories.</CardDescription>
            </CardHeader>
            <CardContent>
              {categoryBreakdown.length === 0 ? (
                <p className="text-sm text-muted-foreground">No asset data available.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Count</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categoryBreakdown.map((row) => (
                      <TableRow key={row.category}>
                        <TableCell>
                          <Badge variant="secondary">{row.label}</Badge>
                        </TableCell>
                        <TableCell className="text-right">{row.count}</TableCell>
                        <TableCell className="text-right">{formatCurrencyTotals(row.totals)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}

      {expenseByStatus.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Expenses by Status</CardTitle>
            <CardDescription>Payment status across all recorded expenses.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenseByStatus.map((row) => (
                  <TableRow key={row.status}>
                    <TableCell>
                      <Badge variant="secondary">{EXPENSE_STATUS_LABELS[row.status] ?? row.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{row.count}</TableCell>
                    <TableCell className="text-right">{formatCurrencyTotals(row.totals)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}

      {!canViewFinancials && expenseByStatus.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              You don&apos;t have access to any modules with reportable data.
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
