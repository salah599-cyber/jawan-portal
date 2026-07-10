"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { recordRePropertySale } from "@/lib/actions/real-estate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function RecordRePropertySaleForm({
  propertyId,
  propertyName,
  retroactive = false,
}: {
  propertyId: string;
  propertyName: string;
  retroactive?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(retroactive);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("propertyId", propertyId);

    startTransition(async () => {
      try {
        await recordRePropertySale(formData);
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
          <CardTitle className="text-base">Record Sale</CardTitle>
          <CardDescription>
            Mark {propertyName} as sold and calculate realized gain and ROI.
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
        <CardTitle>{retroactive ? "Complete Sale Details" : "Record Sale"}</CardTitle>
        <CardDescription>
          {retroactive
            ? `Add the missing sale price for ${propertyName} to calculate ROI.`
            : `Enter sale details for ${propertyName}. The property will be marked as Sold.`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="soldDate">Sale Date</Label>
            <Input id="soldDate" name="soldDate" type="date" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="soldPriceOmr">Sale Price (OMR)</Label>
            <Input id="soldPriceOmr" name="soldPriceOmr" type="number" step="0.001" min="0" required />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="soldTo">Sold To (optional)</Label>
            <Input id="soldTo" name="soldTo" placeholder="Buyer name or entity" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea id="notes" name="notes" rows={2} placeholder="Additional sale details" />
          </div>

          {error ? <p className="text-sm text-destructive md:col-span-2">{error}</p> : null}

          <div className="flex gap-2 md:col-span-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Recording..." : "Confirm Sale"}
            </Button>
            {!retroactive ? (
              <Button type="button" variant="outline" onClick={() => setExpanded(false)}>
                Cancel
              </Button>
            ) : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
