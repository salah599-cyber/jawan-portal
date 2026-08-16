"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updatePropertyUnitValuations, createPropertyValuation } from "@/lib/actions/real-estate";
import { RE_VALUATION_METHOD_LABELS } from "@/lib/labels";
import { formatDateInput, formatOmr } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type UnitValuationRow = {
  id: string;
  unitNumber: string;
  currentValuationOmr: string | null;
};

export function UpdatePropertyValuationForm({
  propertyId,
  currentValuationOmr,
  lastValuationDate,
  valuationMethod,
  units = [],
}: {
  propertyId: string;
  currentValuationOmr: string | null;
  lastValuationDate: string | null;
  valuationMethod: string | null;
  units?: UnitValuationRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [method, setMethod] = useState(valuationMethod ?? "SELF_ASSESSED");
  const [unitValues, setUnitValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      units.map((unit) => [unit.id, unit.currentValuationOmr ?? ""]),
    ),
  );

  const hasUnits = units.length > 0;
  const liveTotal = hasUnits
    ? units.reduce((sum, unit) => {
        const raw = unitValues[unit.id] ?? "";
        const value = parseFloat(raw);
        return sum + (Number.isNaN(value) ? 0 : value);
      }, 0)
    : Number(currentValuationOmr ?? 0);

  const currentLabel = hasUnits
    ? formatOmr(liveTotal > 0 ? liveTotal : Number(currentValuationOmr ?? 0))
    : currentValuationOmr
      ? formatOmr(Number(currentValuationOmr))
      : "Not set";

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("method", method === "none" ? "" : method);

    if (hasUnits) {
      const payload = units.map((unit) => ({
        unitId: unit.id,
        valuationOmr: unitValues[unit.id] ?? "",
      }));
      formData.set("unitsJson", JSON.stringify(payload));
    }

    startTransition(async () => {
      try {
        if (hasUnits) {
          await updatePropertyUnitValuations(propertyId, formData);
        } else {
          await createPropertyValuation(propertyId, formData);
        }
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
            {hasUnits
              ? `Total ${currentLabel} across ${units.length} unit(s) is included in net worth.`
              : `Current value ${currentLabel} is included in net worth.`}
            Update after a new appraisal or when you reassess the property.
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
          {hasUnits
            ? "Set a market value for each unit. The total is used on the Assets page and in net worth."
            : "This becomes the property value on the Assets page and in net worth."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {hasUnits ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">Market value (OMR)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {units.map((unit) => (
                  <TableRow key={unit.id}>
                    <TableCell className="font-medium">Unit {unit.unitNumber}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.001"
                        min="0"
                        value={unitValues[unit.id] ?? ""}
                        onChange={(e) =>
                          setUnitValues((prev) => ({ ...prev, [unit.id]: e.target.value }))
                        }
                        placeholder="—"
                      />
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell className="font-semibold">Total</TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatOmr(liveTotal)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
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
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
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
            {!hasUnits ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="appraiserName">Appraiser (optional)</Label>
                  <Input id="appraiserName" name="appraiserName" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea id="notes" name="notes" rows={2} />
                </div>
              </>
            ) : null}
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="flex gap-2">
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
