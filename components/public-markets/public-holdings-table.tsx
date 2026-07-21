import { formatDate, formatMoney } from "@/lib/format";
import type { PublicHoldingRow } from "@/lib/data/public-markets";
import { PUBLIC_OPTION_TYPE_LABELS, PUBLIC_MANAGEMENT_TYPE_LABELS } from "@/lib/labels";
import { DeletePublicHoldingButton } from "@/components/public-markets/delete-holding-button";
import { EditHoldingDialog } from "@/components/public-markets/edit-holding-dialog";
import {
  DuplicateSymbolBadge,
  HoldingSourceBadge,
} from "@/components/public-markets/holding-source-badge";
import { findDuplicateSymbolKeys, isDuplicateHolding } from "@/lib/public-markets/holding-duplicates";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PublicInstrumentType } from "@/lib/generated/prisma/client";

function formatQuantity(value: number): string {
  return new Intl.NumberFormat("en-OM", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(value);
}

function emptyMessage(instrumentType?: PublicInstrumentType | null): string {
  if (instrumentType === "OPTION") {
    return "No options yet. Add positions manually.";
  }
  if (instrumentType === "STRUCTURED_NOTE") {
    return "No structured notes yet. Add positions manually.";
  }
  if (instrumentType === "CRYPTO") {
    return "No crypto holdings yet. Add positions manually.";
  }
  if (instrumentType === "BOND") {
    return "No bonds yet. Import via consolidated portfolio or add manually.";
  }
  return "No holdings yet. Upload brokerage reports or add positions manually.";
}

export function PublicHoldingsTable({
  holdings,
  canEdit,
  showMarket = false,
  showPortfolio = false,
  showOmr = false,
  instrumentType = "EQUITY",
}: {
  holdings: PublicHoldingRow[];
  canEdit: boolean;
  showMarket?: boolean;
  showPortfolio?: boolean;
  showOmr?: boolean;
  instrumentType?: PublicInstrumentType | null;
}) {
  const duplicateKeys = findDuplicateSymbolKeys(holdings);

  if (holdings.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage(instrumentType)}</p>;
  }

  if (instrumentType === "OPTION") {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            {showMarket ? <TableHead>Market</TableHead> : null}
            <TableHead>Underlying</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Strike</TableHead>
            <TableHead>Expiry</TableHead>
            <TableHead className="text-right">Contracts</TableHead>
            <TableHead className="text-right">Premium</TableHead>
            <TableHead className="text-right">Market Value</TableHead>
            {showOmr ? <TableHead className="text-right">Value (OMR)</TableHead> : null}
            <TableHead className="text-right">Unrealised P&L</TableHead>
            <TableHead>Broker</TableHead>
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
              <TableCell className="font-medium">{holding.option?.underlyingSymbol ?? "—"}</TableCell>
              <TableCell>
                {holding.option
                  ? PUBLIC_OPTION_TYPE_LABELS[holding.option.optionType]
                  : "—"}
              </TableCell>
              <TableCell className="text-right">
                {holding.option ? formatMoney(holding.option.strikePrice, holding.currency) : "—"}
              </TableCell>
              <TableCell>
                {holding.option ? formatDate(holding.option.expiryDate) : "—"}
              </TableCell>
              <TableCell className="text-right">{formatQuantity(holding.quantity)}</TableCell>
              <TableCell className="text-right">
                {formatMoney(holding.costBasis, holding.currency)}
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
                <PnlCell value={holding.unrealisedPnl} currency={holding.currency} />
              </TableCell>
              <TableCell>{holding.broker ?? "—"}</TableCell>
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

  if (instrumentType === "STRUCTURED_NOTE") {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Issuer</TableHead>
            <TableHead>Product</TableHead>
            <TableHead className="text-right">Notional</TableHead>
            <TableHead>Maturity</TableHead>
            <TableHead className="text-right">Coupon</TableHead>
            <TableHead className="text-right">MTM Value</TableHead>
            {showOmr ? <TableHead className="text-right">Value (OMR)</TableHead> : null}
            <TableHead className="text-right">Unrealised P&L</TableHead>
            <TableHead>Broker</TableHead>
            {canEdit ? <TableHead className="w-[90px]" /> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {holdings.map((holding) => (
            <TableRow key={holding.id}>
              <TableCell>{holding.structuredNote?.issuer ?? "—"}</TableCell>
              <TableCell className="font-medium">
                {holding.structuredNote?.productName ?? holding.name ?? "—"}
              </TableCell>
              <TableCell className="text-right">
                {formatMoney(holding.structuredNote?.notionalAmount ?? null, holding.currency)}
              </TableCell>
              <TableCell>
                {holding.structuredNote ? formatDate(holding.structuredNote.maturityDate) : "—"}
              </TableCell>
              <TableCell className="text-right">
                {holding.structuredNote?.couponRate != null
                  ? `${holding.structuredNote.couponRate}%`
                  : "—"}
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
                <PnlCell value={holding.unrealisedPnl} currency={holding.currency} />
              </TableCell>
              <TableCell>{holding.broker ?? "—"}</TableCell>
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

  if (instrumentType === "CRYPTO") {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Symbol</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>CoinGecko ID</TableHead>
            <TableHead className="text-right">Quantity</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead className="text-right">Market Value</TableHead>
            {showOmr ? <TableHead className="text-right">Value (OMR)</TableHead> : null}
            <TableHead className="text-right">Unrealised P&L</TableHead>
            <TableHead>Custodian</TableHead>
            <TableHead>Price</TableHead>
            {canEdit ? <TableHead className="w-[90px]" /> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {holdings.map((holding) => (
            <TableRow key={holding.id}>
              <TableCell className="font-medium">
                <Badge variant="secondary">{holding.symbol}</Badge>
              </TableCell>
              <TableCell>{holding.name ?? "—"}</TableCell>
              <TableCell>{holding.crypto?.coinGeckoId ?? "—"}</TableCell>
              <TableCell className="text-right">{formatQuantity(holding.quantity)}</TableCell>
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
                <PnlCell value={holding.unrealisedPnl} currency={holding.currency} />
              </TableCell>
              <TableCell>{holding.crypto?.custodian ?? holding.broker ?? "—"}</TableCell>
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

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {showMarket ? <TableHead>Market</TableHead> : null}
          {showPortfolio ? <TableHead>Portfolio</TableHead> : null}
          <TableHead>Symbol</TableHead>
          <TableHead>Security</TableHead>
          <TableHead>Source</TableHead>
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
            {showPortfolio ? (
              <TableCell className="max-w-[12rem] truncate" title={holding.managedPortfolioLabel}>
                {holding.managedPortfolioLabel}
              </TableCell>
            ) : null}
            <TableCell className="font-medium">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="secondary">{holding.symbol}</Badge>
                {isDuplicateHolding(holding, duplicateKeys) ? <DuplicateSymbolBadge /> : null}
              </div>
            </TableCell>
            <TableCell>{holding.name ?? "—"}</TableCell>
            <TableCell>
              <HoldingSourceBadge source={holding.source} />
            </TableCell>
            <TableCell>
              <div className="space-y-1">
                <div className="space-y-0.5">
                  <p>{holding.broker ?? "—"}</p>
                  {holding.accountNumber ? (
                    <p className="text-xs text-muted-foreground">{holding.accountNumber}</p>
                  ) : null}
                  {holding.brokerAccountLabel ? (
                    <p className="text-xs text-muted-foreground">{holding.brokerAccountLabel}</p>
                  ) : null}
                </div>
                {holding.source === "IMPORT" ? (
                  <Badge variant="outline">
                    {holding.isManaged
                      ? PUBLIC_MANAGEMENT_TYPE_LABELS.managed
                      : PUBLIC_MANAGEMENT_TYPE_LABELS.reference}
                  </Badge>
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
              <PnlCell value={holding.unrealisedPnl} currency={holding.currency} />
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

function PnlCell({ value, currency }: { value: number | null; currency: string }) {
  return (
    <span
      className={
        value != null && value < 0
          ? "text-destructive"
          : value != null && value > 0
            ? "text-green-700"
            : undefined
      }
    >
      {formatMoney(value, currency)}
    </span>
  );
}
