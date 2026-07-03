import { formatDate, formatMoney } from "@/lib/format";
import type { PublicHoldingRow } from "@/lib/data/public-markets";
import { DeletePublicHoldingButton } from "@/components/public-markets/delete-holding-button";
import { EditHoldingDialog } from "@/components/public-markets/edit-holding-dialog";
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

export function PublicHoldingsTable({
  holdings,
  canEdit,
  showMarket = false,
  showOmr = false,
}: {
  holdings: PublicHoldingRow[];
  canEdit: boolean;
  showMarket?: boolean;
  showOmr?: boolean;
}) {
  if (holdings.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No holdings yet. Upload brokerage reports or add positions manually.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {showMarket ? <TableHead>Market</TableHead> : null}
          <TableHead>Symbol</TableHead>
          <TableHead>Security</TableHead>
          <TableHead>Broker</TableHead>
          <TableHead className="text-right">Quantity</TableHead>
          <TableHead className="text-right">Cost Basis</TableHead>
          <TableHead className="text-right">Price</TableHead>
          <TableHead className="text-right">Market Value</TableHead>
          {showOmr ? <TableHead className="text-right">Value (OMR)</TableHead> : null}
          <TableHead className="text-right">Unrealised P&L</TableHead>
          <TableHead>As Of</TableHead>
          <TableHead>Price</TableHead>
          {canEdit ? <TableHead className="w-[90px]" /> : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {holdings.map((holding) => (
          <TableRow key={holding.id}>
            {showMarket ? (
              <TableCell>
                <Badge variant="outline">{holding.marketLabel}</Badge>
              </TableCell>
            ) : null}
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
            {showOmr ? (
              <TableCell className="text-right">
                {formatMoney(holding.marketValueOmr, "OMR")}
              </TableCell>
            ) : null}
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
            <TableCell>
              <div className="space-y-0.5 text-xs">
                {holding.priceSource ? (
                  <Badge variant="outline">{holding.priceSource}</Badge>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
                {holding.priceFetchedAt ? (
                  <p className="text-muted-foreground">{formatDate(holding.priceFetchedAt)}</p>
                ) : null}
              </div>
            </TableCell>
            {canEdit ? (
              <TableCell>
                <div className="flex items-center justify-end gap-1">
                  <EditHoldingDialog holding={holding} />
                  <DeletePublicHoldingButton holdingId={holding.id} symbol={holding.symbol} />
                </div>
              </TableCell>
            ) : null}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
