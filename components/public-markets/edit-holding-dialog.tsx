"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PublicHoldingRow } from "@/lib/data/public-markets";
import { updatePublicHolding } from "@/lib/actions/public-markets";
import { normalizeHoldingValues } from "@/lib/public-markets/valuation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil } from "lucide-react";

function formatDateInput(value: Date | null): string {
  if (!value) return "";
  return value.toISOString().slice(0, 10);
}

function calcDerivedValues(quantity: number, marketPrice: number | null, costBasis: number | null) {
  const normalized = normalizeHoldingValues({
    quantity,
    marketPrice,
    costBasis,
  });
  return {
    marketValue: normalized.marketValue,
    unrealisedPnl: normalized.unrealisedPnl,
  };
}

export function EditHoldingDialog({ holding }: { holding: PublicHoldingRow }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [quantity, setQuantity] = useState(holding.quantity);
  const [marketPrice, setMarketPrice] = useState<number | null>(holding.marketPrice);
  const [costBasis, setCostBasis] = useState<number | null>(holding.costBasis);
  const [marketValue, setMarketValue] = useState<number | null>(holding.marketValue);
  const [unrealisedPnl, setUnrealisedPnl] = useState<number | null>(holding.unrealisedPnl);

  useEffect(() => {
    if (!open) return;
    setQuantity(holding.quantity);
    setMarketPrice(holding.marketPrice);
    setCostBasis(holding.costBasis);
    setMarketValue(holding.marketValue);
    setUnrealisedPnl(holding.unrealisedPnl);
    setError(null);
  }, [open, holding]);

  function recalc(price: number | null, qty: number, cost: number | null) {
    const derived = calcDerivedValues(qty, price, cost);
    setMarketValue(derived.marketValue);
    setUnrealisedPnl(derived.unrealisedPnl);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        await updatePublicHolding(holding.id, {
          symbol: String(form.get("symbol") ?? ""),
          name: String(form.get("name") ?? ""),
          quantity,
          costBasis,
          marketPrice,
          marketValue,
          unrealisedPnl,
          broker: String(form.get("broker") ?? ""),
          accountNumber: String(form.get("accountNumber") ?? ""),
          asOfDate: String(form.get("asOfDate") ?? "") || undefined,
        });
        setOpen(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update holding.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="icon" aria-label={`Edit ${holding.symbol}`}>
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit {holding.symbol}</DialogTitle>
          <DialogDescription>
            Update quantity, cost basis, or prices. Market value and unrealised P&L are calculated
            automatically when price and cost basis are available.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`symbol-${holding.id}`}>Symbol</Label>
              <Input
                id={`symbol-${holding.id}`}
                name="symbol"
                required
                defaultValue={holding.symbol}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`name-${holding.id}`}>Security name</Label>
              <Input id={`name-${holding.id}`} name="name" defaultValue={holding.name ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`quantity-${holding.id}`}>Quantity</Label>
              <Input
                id={`quantity-${holding.id}`}
                type="number"
                step="any"
                min="0"
                required
                value={quantity}
                onChange={(e) => {
                  const qty = parseFloat(e.target.value);
                  const nextQty = Number.isNaN(qty) ? 0 : qty;
                  setQuantity(nextQty);
                  recalc(marketPrice, nextQty, costBasis);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`marketPrice-${holding.id}`}>Market price ({holding.currency})</Label>
              <Input
                id={`marketPrice-${holding.id}`}
                type="number"
                step="any"
                min="0"
                value={marketPrice ?? ""}
                onChange={(e) => {
                  const price = e.target.value === "" ? null : parseFloat(e.target.value);
                  const nextPrice = price != null && !Number.isNaN(price) ? price : null;
                  setMarketPrice(nextPrice);
                  recalc(nextPrice, quantity, costBasis);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`costBasis-${holding.id}`}>Cost basis ({holding.currency})</Label>
              <Input
                id={`costBasis-${holding.id}`}
                type="number"
                step="any"
                min="0"
                placeholder="Total invested or avg cost per share"
                value={costBasis ?? ""}
                onChange={(e) => {
                  const cost = e.target.value === "" ? null : parseFloat(e.target.value);
                  const nextCost = cost != null && !Number.isNaN(cost) ? cost : null;
                  setCostBasis(nextCost);
                  recalc(marketPrice, quantity, nextCost);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Market value ({holding.currency})</Label>
              <Input value={marketValue ?? ""} readOnly className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label>Unrealised P&L ({holding.currency})</Label>
              <Input value={unrealisedPnl ?? ""} readOnly className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`broker-${holding.id}`}>Broker</Label>
              <Input
                id={`broker-${holding.id}`}
                name="broker"
                defaultValue={holding.broker ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`accountNumber-${holding.id}`}>Account number</Label>
              <Input
                id={`accountNumber-${holding.id}`}
                name="accountNumber"
                defaultValue={holding.accountNumber ?? ""}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor={`asOfDate-${holding.id}`}>As of date</Label>
              <Input
                id={`asOfDate-${holding.id}`}
                name="asOfDate"
                type="date"
                defaultValue={formatDateInput(holding.asOfDate)}
              />
            </div>
          </div>

          {holding.priceSource ? (
            <p className="text-xs text-muted-foreground">
              Price source: {holding.priceSource}
              {holding.priceFetchedAt
                ? ` · last fetched ${holding.priceFetchedAt.toLocaleString()}`
                : ""}
            </p>
          ) : null}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
