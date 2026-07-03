"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PublicMarket } from "@/lib/generated/prisma/client";
import { addManualHolding } from "@/lib/actions/public-markets";
import { MARKET_CONFIG } from "@/lib/public-markets/constants";
import { normalizeHoldingValues } from "@/lib/public-markets/valuation";
import { EntitySelect, type EntityOption } from "@/components/platform/entity-select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";

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

export function AddManualHoldingForm({
  entities,
  defaultEntityId,
  market,
}: {
  entities: EntityOption[];
  defaultEntityId?: string;
  market: PublicMarket;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [entityId, setEntityId] = useState(defaultEntityId ?? entities[0]?.id ?? "");
  const [quantity, setQuantity] = useState<number | null>(null);
  const [marketPrice, setMarketPrice] = useState<number | null>(null);
  const [costBasis, setCostBasis] = useState<number | null>(null);
  const [marketValue, setMarketValue] = useState<number | null>(null);
  const [unrealisedPnl, setUnrealisedPnl] = useState<number | null>(null);
  const config = MARKET_CONFIG[market];

  function recalc(qty: number | null, price: number | null, cost: number | null) {
    if (qty == null || qty <= 0) {
      setMarketValue(null);
      setUnrealisedPnl(null);
      return;
    }
    const derived = calcDerivedValues(qty, price, cost);
    setMarketValue(derived.marketValue);
    setUnrealisedPnl(derived.unrealisedPnl);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set("entityId", entityId);
    formData.set("market", market);
    if (marketValue != null) formData.set("marketValue", String(marketValue));
    if (unrealisedPnl != null) formData.set("unrealisedPnl", String(unrealisedPnl));

    startTransition(async () => {
      try {
        await addManualHolding(formData);
        setSuccess("Holding added.");
        form.reset();
        setQuantity(null);
        setMarketPrice(null);
        setCostBasis(null);
        setMarketValue(null);
        setUnrealisedPnl(null);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to add holding.");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Add Holding Manually
        </CardTitle>
        <CardDescription>
          Enter a position for {config.label} when you do not have a broker statement to import.
          Market value and unrealised P&L are calculated from price, quantity, and cost basis.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label>Entity</Label>
            <EntitySelect
              entities={entities}
              value={entityId}
              onValueChange={setEntityId}
              allowAdd={false}
              placeholder="Select entity"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="symbol">Symbol</Label>
            <Input id="symbol" name="symbol" required placeholder="e.g. AAPL" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Security name</Label>
            <Input id="name" name="name" placeholder="Optional" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              name="quantity"
              type="number"
              step="any"
              min="0"
              required
              onChange={(e) => {
                const qty = parseFloat(e.target.value);
                const nextQty = Number.isNaN(qty) ? null : qty;
                setQuantity(nextQty);
                recalc(nextQty, marketPrice, costBasis);
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="marketPrice">Market price ({config.currency})</Label>
            <Input
              id="marketPrice"
              name="marketPrice"
              type="number"
              step="any"
              min="0"
              onChange={(e) => {
                const price = e.target.value === "" ? null : parseFloat(e.target.value);
                const nextPrice = price != null && !Number.isNaN(price) ? price : null;
                setMarketPrice(nextPrice);
                recalc(quantity, nextPrice, costBasis);
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="marketValue">Market value ({config.currency})</Label>
            <Input
              id="marketValue"
              name="marketValue"
              type="number"
              step="any"
              min="0"
              value={marketValue ?? ""}
              readOnly
              className="bg-muted"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="costBasis">Cost basis ({config.currency})</Label>
            <Input
              id="costBasis"
              name="costBasis"
              type="number"
              step="any"
              min="0"
              placeholder="Total invested or avg cost per share"
              onChange={(e) => {
                const cost = e.target.value === "" ? null : parseFloat(e.target.value);
                const nextCost = cost != null && !Number.isNaN(cost) ? cost : null;
                setCostBasis(nextCost);
                recalc(quantity, marketPrice, nextCost);
              }}
            />
          </div>

          <div className="space-y-2">
            <Label>Unrealised P&L ({config.currency})</Label>
            <Input value={unrealisedPnl ?? ""} readOnly className="bg-muted" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="broker">Broker</Label>
            <Input id="broker" name="broker" placeholder="Optional" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="accountNumber">Account number</Label>
            <Input id="accountNumber" name="accountNumber" placeholder="Optional" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="asOfDate">As of date</Label>
            <Input id="asOfDate" name="asOfDate" type="date" />
          </div>

          {error ? <p className="text-sm text-destructive md:col-span-2">{error}</p> : null}
          {success ? <p className="text-sm text-green-700 md:col-span-2">{success}</p> : null}

          <div className="md:col-span-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : "Add Holding"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
