import { formatDate, formatMoney } from "@/lib/format";
import type { CashBalanceHistoryEntry } from "@/lib/data/cash-management";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function BalanceHistory({
  entries,
  currency,
}: {
  entries: CashBalanceHistoryEntry[];
  currency: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Balance History</CardTitle>
        <CardDescription>Manual balance updates, newest first.</CardDescription>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No balance updates recorded yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Recorded By</TableHead>
                <TableHead>Logged</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{formatDate(entry.balanceDate)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMoney(entry.balance, currency)}
                  </TableCell>
                  <TableCell className="max-w-[240px] truncate">{entry.notes ?? "—"}</TableCell>
                  <TableCell>{entry.recordedByName ?? "—"}</TableCell>
                  <TableCell>{formatDate(entry.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
