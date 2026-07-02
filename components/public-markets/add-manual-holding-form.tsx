"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PublicMarket } from "@/lib/generated/prisma/client";
import { addManualHolding } from "@/lib/actions/public-markets";
import { MARKET_CONFIG } from "@/lib/public-markets/constants";
import { EntitySelect, type EntityOption } from "@/components/platform/entity-select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";

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
  const config = MARKET_CONFIG[market];

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set("entityId", entityId);
    formData.set("market", market);

    startTransition(async () => {
      try {
        await addManualHolding(formData);
        setSuccess("Holding added.");
        form.reset();
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
            <Input id="quantity" name="quantity" type="number" step="any" min="0" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="marketPrice">Market price ({config.currency})</Label>
            <Input id="marketPrice" name="marketPrice" type="number" step="any" min="0" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="marketValue">Market value ({config.currency})</Label>
            <Input id="marketValue" name="marketValue" type="number" step="any" min="0" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="costBasis">Cost basis ({config.currency})</Label>
            <Input id="costBasis" name="costBasis" type="number" step="any" min="0" />
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
