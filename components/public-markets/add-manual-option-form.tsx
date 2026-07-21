"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PublicMarket } from "@/lib/generated/prisma/client";
import { addManualOption } from "@/lib/actions/public-markets";
import { MARKET_CONFIG } from "@/lib/public-markets/constants";
import { normalizeOptionHoldingValues } from "@/lib/public-markets/valuation";
import { EntitySelect, type EntityOption } from "@/components/platform/entity-select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";

export function AddManualOptionForm({
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
  const [contracts, setContracts] = useState<number | null>(null);
  const [marketPrice, setMarketPrice] = useState<number | null>(null);
  const [premiumPaid, setPremiumPaid] = useState<number | null>(null);
  const [marketValue, setMarketValue] = useState<number | null>(null);
  const [unrealisedPnl, setUnrealisedPnl] = useState<number | null>(null);
  const config = MARKET_CONFIG[market];

  function recalc(
    qty: number | null,
    price: number | null,
    premium: number | null,
    multiplier: number,
  ) {
    if (qty == null || qty === 0) {
      setMarketValue(null);
      setUnrealisedPnl(null);
      return;
    }
    const normalized = normalizeOptionHoldingValues({
      contracts: qty,
      marketPrice: price,
      premiumPaid: premium,
      contractMultiplier: multiplier,
    });
    setMarketValue(normalized.marketValue);
    setUnrealisedPnl(normalized.unrealisedPnl);
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

    startTransition(async () => {
      try {
        await addManualOption(formData);
        setSuccess("Option position added.");
        form.reset();
        setContracts(null);
        setMarketPrice(null);
        setPremiumPaid(null);
        setMarketValue(null);
        setUnrealisedPnl(null);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to add option.");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Add Option Manually
        </CardTitle>
        <CardDescription>
          Record an options position for {config.label}. Use negative contracts for written/short
          positions. Enter mark-to-market value manually — live option pricing is not available in
          v1.
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
            <Label htmlFor="underlyingSymbol">Underlying symbol</Label>
            <Input id="underlyingSymbol" name="underlyingSymbol" required placeholder="e.g. AAPL" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="optionType">Option type</Label>
            <select
              id="optionType"
              name="optionType"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              defaultValue="CALL"
            >
              <option value="CALL">Call</option>
              <option value="PUT">Put</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="strikePrice">Strike price</Label>
            <Input
              id="strikePrice"
              name="strikePrice"
              type="number"
              step="any"
              min="0"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expiryDate">Expiry date</Label>
            <Input id="expiryDate" name="expiryDate" type="date" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contracts">Contracts</Label>
            <Input
              id="contracts"
              name="contracts"
              type="number"
              step="any"
              required
              onChange={(e) => {
                const qty = parseFloat(e.target.value);
                const nextQty = Number.isNaN(qty) ? null : qty;
                setContracts(nextQty);
                const multiplier = parseFloat(
                  (e.currentTarget.form?.elements.namedItem("contractMultiplier") as HTMLInputElement)
                    ?.value ?? "100",
                );
                recalc(nextQty, marketPrice, premiumPaid, multiplier);
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contractMultiplier">Contract multiplier</Label>
            <Input
              id="contractMultiplier"
              name="contractMultiplier"
              type="number"
              step="1"
              min="1"
              defaultValue="100"
              onChange={(e) => {
                const multiplier = parseFloat(e.target.value) || 100;
                recalc(contracts, marketPrice, premiumPaid, multiplier);
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="marketPrice">Market price per contract ({config.currency})</Label>
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
                const multiplier = parseFloat(
                  (e.currentTarget.form?.elements.namedItem("contractMultiplier") as HTMLInputElement)
                    ?.value ?? "100",
                );
                recalc(contracts, nextPrice, premiumPaid, multiplier);
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="premiumPaid">Premium paid ({config.currency})</Label>
            <Input
              id="premiumPaid"
              name="premiumPaid"
              type="number"
              step="any"
              min="0"
              onChange={(e) => {
                const premium = e.target.value === "" ? null : parseFloat(e.target.value);
                const nextPremium = premium != null && !Number.isNaN(premium) ? premium : null;
                setPremiumPaid(nextPremium);
                const multiplier = parseFloat(
                  (e.currentTarget.form?.elements.namedItem("contractMultiplier") as HTMLInputElement)
                    ?.value ?? "100",
                );
                recalc(contracts, marketPrice, nextPremium, multiplier);
              }}
            />
          </div>

          <div className="space-y-2">
            <Label>Market value ({config.currency})</Label>
            <Input value={marketValue ?? ""} readOnly className="bg-muted" />
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
            <Label htmlFor="asOfDate">As of date</Label>
            <Input id="asOfDate" name="asOfDate" type="date" />
          </div>

          {error ? <p className="text-sm text-destructive md:col-span-2">{error}</p> : null}
          {success ? <p className="text-sm text-green-700 md:col-span-2">{success}</p> : null}

          <div className="md:col-span-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : "Add Option"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
