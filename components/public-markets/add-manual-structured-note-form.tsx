"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addManualStructuredNote } from "@/lib/actions/public-markets";
import { EntitySelect, type EntityOption } from "@/components/platform/entity-select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";

export function AddManualStructuredNoteForm({
  entities,
  defaultEntityId,
}: {
  entities: EntityOption[];
  defaultEntityId?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [entityId, setEntityId] = useState(defaultEntityId ?? entities[0]?.id ?? "");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set("entityId", entityId);

    startTransition(async () => {
      try {
        await addManualStructuredNote(formData);
        setSuccess("Structured note added.");
        form.reset();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to add structured note.");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Add Structured Note Manually
        </CardTitle>
        <CardDescription>
          Record a structured note with issuer, notional, maturity, and mark-to-market value. Notes
          are stored under Other Markets and roll into your public equity portfolio total.
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
            <Label htmlFor="issuer">Issuer</Label>
            <Input id="issuer" name="issuer" required placeholder="e.g. Goldman Sachs" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="productName">Product name</Label>
            <Input id="productName" name="productName" required placeholder="e.g. Autocall 2027" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notionalAmount">Notional (USD)</Label>
            <Input
              id="notionalAmount"
              name="notionalAmount"
              type="number"
              step="any"
              min="0"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="marketValue">Mark-to-market value (USD)</Label>
            <Input
              id="marketValue"
              name="marketValue"
              type="number"
              step="any"
              min="0"
              placeholder="Defaults to notional if blank"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="maturityDate">Maturity date</Label>
            <Input id="maturityDate" name="maturityDate" type="date" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="issueDate">Issue date</Label>
            <Input id="issueDate" name="issueDate" type="date" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="couponRate">Coupon rate (%)</Label>
            <Input id="couponRate" name="couponRate" type="number" step="any" min="0" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="barrierLevel">Barrier level</Label>
            <Input id="barrierLevel" name="barrierLevel" type="number" step="any" min="0" />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="payoffNotes">Payoff notes</Label>
            <Input id="payoffNotes" name="payoffNotes" placeholder="Optional structure description" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="broker">Broker / custodian</Label>
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
              {pending ? "Saving..." : "Add Structured Note"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
