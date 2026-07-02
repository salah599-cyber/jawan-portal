import { formatDate, formatMoney } from "@/lib/format";
import type { MsxHoldingRow } from "@/lib/data/msx-portfolio";
import { DeleteHoldingButton } from "@/components/msx/delete-holding-button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function formatQuantity(value: number): string {
  return new Intl.NumberFormat("en-OM", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(value);
}

export function MsxHoldingsTable({
  holdings,
  canEdit,
}: {
  holdings: MsxHoldingRow[];
  canEdit: boolean;
}) {
  if (holdings.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No MSX holdings yet. Upload brokerage reports to populate your portfolio automatically.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Symbol</TableHead>
          <TableHead>Security</TableHead>
          <TableHead>Broker</TableHead>
          <TableHead className="text-right">Quantity</TableHead>
          <TableHead className="text-right">Cost Basis</TableHead>
          <TableHead className="text-right">Price</TableHead>
          <TableHead className="text-right">Market Value</TableHead>
          <TableHead className="text-right">Unrealised P&L</TableHead>
          <TableHead>As Of</TableHead>
          {canEdit ? <TableHead className="w-[60px]" /> : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {holdings.map((holding) => (
          <TableRow key={holding.id}>
            <TableCell className="font-medium">
              <Badge variant="secondary">{holding.symbol}</Badge>
            </TableCell>
            <TableCell>{holding.name ?? "—"}</TableCell>
            <TableCell>
              <div className="space-y-0.5">
                <p>{holding.broker ?? "—"}</p>
                {holding.accountNumber ? (
                  <p className="text-xs text-muted-foreground">{holding.accountNumber}</p>
                ) : null}
              </div>
            </TableCell>
            <TableCell className="text-right">{formatQuantity(holding.quantity)}</TableCell>
            <TableCell className="text-right">
              {formatMoney(holding.costBasis, holding.currency)}
            </TableCell>
            <TableCell className="text-right">
              {formatMoney(holding.marketPrice, holding.currency)}
            </TableCell>
            <TableCell className="text-right">
              {formatMoney(holding.marketValue, holding.currency)}
            </TableCell>
            <TableCell className="text-right">
              <span
                className={
                  holding.unrealisedPnl != null && holding.unrealisedPnl < 0
                    ? "text-destructive"
                    : holding.unrealisedPnl != null && holding.unrealisedPnl > 0
                      ? "text-green-700"
                      : undefined
                }
              >
                {formatMoney(holding.unrealisedPnl, holding.currency)}
              </span>
            </TableCell>
            <TableCell>{formatDate(holding.asOfDate)}</TableCell>
            {canEdit ? (
              <TableCell>
                <DeleteHoldingButton holdingId={holding.id} symbol={holding.symbol} />
              </TableCell>
            ) : null}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
