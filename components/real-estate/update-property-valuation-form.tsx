"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPropertyValuation } from "@/lib/actions/real-estate";
import { RE_VALUATION_METHOD_LABELS } from "@/lib/labels";
import { formatDateInput, formatOmr } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function UpdatePropertyValuationForm({
  propertyId,
  currentValuationOmr,
  lastValuationDate,
  valuationMethod,
}: {
  propertyId: string;
  currentValuationOmr: string | null;
  lastValuationDate: string | null;
  valuationMethod: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [method, setMethod] = useState(valuationMethod ?? "SELF_ASSESSED");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("method", method === "none" ? "" : method);

    startTransition(async () => {
      try {
        await createPropertyValuation(propertyId, formData);
        setExpanded(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update market value.");
      }
    });
  }

  const currentLabel = currentValuationOmr
    ? formatOmr(Number(currentValuationOmr))
    : "Not set";

  if (!expanded) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Market value</CardTitle>
          <CardDescription>
            Current value {currentLabel} is included in net worth. Update it after a new
            appraisal or when you reassess the property.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" variant="outline" onClick={() => setExpanded(true)}>
            Update market value
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Update market value</CardTitle>
        <CardDescription>
          This becomes the property value on the Assets page and in net worth.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="valuationOmr">Market value (OMR)</Label>
            <Input
              id="valuationOmr"
              name="valuationOmr"
              type="number"
              step="0.001"
              min="0"
              required
              defaultValue={currentValuationOmr ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="valuationDate">Valuation date</Label>
            <Input
              id="valuationDate"
              name="valuationDate"
              type="date"
              required
              defaultValue={formatDateInput(lastValuationDate) || formatDateInput(new Date())}
            />
          </div>
          <div className="space-y-2">
            <Label>Method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not specified</SelectItem>
                {Object.entries(RE_VALUATION_METHOD_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="appraiserName">Appraiser (optional)</Label>
            <Input id="appraiserName" name="appraiserName" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={2} />
          </div>
          {error ? <p className="text-sm text-destructive md:col-span-2">{error}</p> : null}
          <div className="flex gap-2 md:col-span-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : "Save market value"}
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
