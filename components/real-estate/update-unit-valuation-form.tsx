"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateUnitValuation } from "@/lib/actions/real-estate";
import { formatDateInput, formatOmr } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function UpdateUnitValuationForm({
  unitId,
  unitNumber,
  currentValuationOmr,
  lastValuationDate,
}: {
  unitId: string;
  unitNumber: string;
  currentValuationOmr: string | null;
  lastValuationDate: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        await updateUnitValuation(unitId, formData);
        setExpanded(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update market value.");
      }
    });
  }

  if (!expanded) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Market value</CardTitle>
          <CardDescription>
            Unit {unitNumber}:{" "}
            {currentValuationOmr ? formatOmr(Number(currentValuationOmr)) : "Not set"}
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
          This updates Unit {unitNumber} and rolls the total into the building net-worth value.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="currentValuationOmr">Market value (OMR)</Label>
            <Input
              id="currentValuationOmr"
              name="currentValuationOmr"
              type="number"
              step="0.001"
              min="0"
              defaultValue={currentValuationOmr ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastValuationDate">Valuation date</Label>
            <Input
              id="lastValuationDate"
              name="lastValuationDate"
              type="date"
              defaultValue={formatDateInput(lastValuationDate) || formatDateInput(new Date())}
            />
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
