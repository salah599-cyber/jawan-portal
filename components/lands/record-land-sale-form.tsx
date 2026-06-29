"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { recordLandSale } from "@/lib/actions/lands";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function FileSection({
  id,
  name,
  label,
  description,
}: {
  id: string;
  name: string;
  label: string;
  description: string;
}) {
  return (
    <div className="space-y-2 md:col-span-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={name} type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" />
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

export function RecordLandSaleForm({
  landParcelId,
  landName,
  currency: defaultCurrency,
}: {
  landParcelId: string;
  landName: string;
  currency: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [currency, setCurrency] = useState(defaultCurrency);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("landParcelId", landParcelId);
    formData.set("currency", currency);

    startTransition(async () => {
      try {
        await recordLandSale(formData);
        setExpanded(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to record sale.");
      }
    });
  }

  if (!expanded) {
    return (
      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Record Property Sale</CardTitle>
          <CardDescription>
            Mark {landName} as sold and attach Power of Attorney, SPA, buyer ID, and other sale documents.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" onClick={() => setExpanded(true)}>
            Record Sale
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Record Property Sale</CardTitle>
        <CardDescription>Enter sale details for {landName}. The land will be marked as Exited.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="saleDate">Sale Date</Label>
            <Input id="saleDate" name="saleDate" type="date" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="soldTo">Sold To</Label>
            <Input id="soldTo" name="soldTo" required placeholder="Buyer name or entity" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="saleAmount">Sale Amount</Label>
            <Input id="saleAmount" name="saleAmount" type="number" step="0.01" min="0" required />
          </div>
          <div className="space-y-2">
            <Label>Currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["OMR", "USD", "EUR", "GBP", "AED"].map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea id="notes" name="notes" rows={2} placeholder="Additional sale details" />
          </div>

          <div className="md:col-span-2">
            <p className="mb-3 text-sm font-medium">Sale Documents (optional)</p>
          </div>
          <FileSection
            id="poaFiles"
            name="poaFiles"
            label="Power of Attorney"
            description="Upload Power of Attorney documents."
          />
          <FileSection
            id="spaFiles"
            name="spaFiles"
            label="Sale & Purchase Agreement (SPA)"
            description="Upload signed SPA documents."
          />
          <FileSection
            id="buyerIdFiles"
            name="buyerIdFiles"
            label="Buyer ID"
            description="Upload buyer identification documents."
          />
          <FileSection
            id="otherSaleFiles"
            name="otherSaleFiles"
            label="Other Sale Documents"
            description="Any other supporting sale documents."
          />

          {error ? <p className="text-sm text-destructive md:col-span-2">{error}</p> : null}

          <div className="flex gap-2 md:col-span-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Recording..." : "Confirm Sale"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setExpanded(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
