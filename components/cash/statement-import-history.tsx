import type { StatementImportRow } from "@/lib/cash/statements/types";
import { formatDate, formatMoney } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function statusVariant(status: string): "default" | "secondary" | "destructive" {
  switch (status) {
    case "APPLIED":
      return "default";
    case "PARSED":
      return "secondary";
    default:
      return "destructive";
  }
}

function statusLabel(status: string) {
  switch (status) {
    case "APPLIED":
      return "Applied";
    case "PARSED":
      return "Parsed";
    case "FAILED":
      return "Failed";
    default:
      return status;
  }
}

export function StatementImportHistory({ imports }: { imports: StatementImportRow[] }) {
  if (imports.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Statement Import History</CardTitle>
        <CardDescription>Recent PDF statement uploads and their outcomes.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 pr-4 font-medium">File</th>
                <th className="pb-2 pr-4 font-medium">Account</th>
                <th className="pb-2 pr-4 font-medium">Balance</th>
                <th className="pb-2 pr-4 font-medium">Date</th>
                <th className="pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {imports.map((row) => (
                <tr key={row.id} className="border-b last:border-0">
                  <td className="py-3 pr-4">
                    <p className="font-medium">{row.fileName}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(row.createdAt)}</p>
                  </td>
                  <td className="py-3 pr-4">{row.bankAccountLabel ?? "—"}</td>
                  <td className="py-3 pr-4">
                    {row.balance != null && row.currency
                      ? formatMoney(row.balance, row.currency)
                      : "—"}
                  </td>
                  <td className="py-3 pr-4">{formatDate(row.balanceDate)}</td>
                  <td className="py-3">
                    <Badge variant={statusVariant(row.status)}>{statusLabel(row.status)}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
