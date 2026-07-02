"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createUtilityReading } from "@/lib/actions/real-estate";
import { formatDate, formatOmr } from "@/lib/format";
import type { SerializedReProperty } from "@/lib/real-estate/serialize";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const UTILITY_TYPE_LABELS: Record<string, string> = {
  ELECTRICITY: "Electricity",
  WATER: "Water",
};

const UTILITY_PAYMENT_LABELS: Record<string, string> = {
  PAID: "Paid",
  UNPAID: "Unpaid",
  TENANT_RESPONSIBLE: "Tenant Responsible",
};

type UtilityRow = SerializedReProperty["units"][number]["utilityReadings"][number] & {
  unitId: string;
  unitNumber: string;
};

function UtilityReadingForm({
  property,
  onDone,
}: {
  property: SerializedReProperty;
  onDone: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [unitId, setUnitId] = useState(property.units[0]?.id ?? "");
  const [utilityType, setUtilityType] = useState("ELECTRICITY");
  const [paymentStatus, setPaymentStatus] = useState("UNPAID");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!unitId) {
      setError("Select a unit.");
      return;
    }
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("utilityType", utilityType);
    formData.set("paymentStatus", paymentStatus);

    startTransition(async () => {
      try {
        await createUtilityReading(unitId, formData);
        onDone();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to add reading.");
      }
    });
  }

  if (property.units.length === 0) {
    return <p className="text-sm text-muted-foreground">Add units before recording utility readings.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <Label>Unit</Label>
        <Select value={unitId} onValueChange={setUnitId}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {property.units.map((unit) => (
              <SelectItem key={unit.id} value={unit.id}>Unit {unit.unitNumber}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Utility Type</Label>
        <Select value={utilityType} onValueChange={setUtilityType}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(UTILITY_TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="readingDate">Reading Date</Label>
        <Input id="readingDate" name="readingDate" type="date" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="meterReading">Meter Reading</Label>
        <Input id="meterReading" name="meterReading" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="amountOmr">Bill Amount (OMR)</Label>
        <Input id="amountOmr" name="amountOmr" />
      </div>
      <div className="space-y-2">
        <Label>Payment Status</Label>
        <Select value={paymentStatus} onValueChange={setPaymentStatus}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(UTILITY_PAYMENT_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="billReference">Bill Reference</Label>
        <Input id="billReference" name="billReference" />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" rows={2} />
      </div>
      {error ? <p className="text-sm text-destructive md:col-span-2">{error}</p> : null}
      <div className="flex gap-2 md:col-span-2">
        <Button type="submit" disabled={pending}>{pending ? "Saving..." : "Add Reading"}</Button>
        <Button type="button" variant="outline" onClick={onDone}>Cancel</Button>
      </div>
    </form>
  );
}

export function ReUtilitiesTab({
  property,
  canEdit,
}: {
  property: SerializedReProperty;
  canEdit: boolean;
}) {
  const [showForm, setShowForm] = useState(false);

  const readings = useMemo<UtilityRow[]>(() => {
    return property.units.flatMap((unit) =>
      unit.utilityReadings.map((reading) => ({
        ...reading,
        unitId: unit.id,
        unitNumber: unit.unitNumber,
      })),
    );
  }, [property.units]);

  const sorted = [...readings].sort((a, b) => {
    const dateA = a.readingDate ? new Date(a.readingDate).getTime() : 0;
    const dateB = b.readingDate ? new Date(b.readingDate).getTime() : 0;
    return dateB - dateA;
  });

  return (
    <div className="space-y-4">
      {canEdit && !showForm ? (
        <Button onClick={() => setShowForm(true)}>Add Utility Reading</Button>
      ) : null}

      {canEdit && showForm ? (
        <Card>
          <CardHeader>
            <CardTitle>Add Utility Reading</CardTitle>
          </CardHeader>
          <CardContent>
            <UtilityReadingForm property={property} onDone={() => setShowForm(false)} />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Utility Readings</CardTitle>
          <CardDescription>Per-unit electricity and water readings</CardDescription>
        </CardHeader>
        <CardContent>
          {sorted.length === 0 ? (
            <p className="text-sm text-muted-foreground">No utility readings recorded.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Unit</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Reading</TableHead>
                  <TableHead className="text-right">Consumed</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((reading) => (
                  <TableRow key={reading.id}>
                    <TableCell>{reading.unitNumber}</TableCell>
                    <TableCell>
                      {UTILITY_TYPE_LABELS[reading.utilityType] ?? reading.utilityType}
                    </TableCell>
                    <TableCell>{formatDate(reading.readingDate)}</TableCell>
                    <TableCell className="text-right">{reading.meterReading ?? "—"}</TableCell>
                    <TableCell className="text-right">{reading.unitsConsumed ?? "—"}</TableCell>
                    <TableCell className="text-right">{formatOmr(reading.amountOmr)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {UTILITY_PAYMENT_LABELS[reading.paymentStatus] ?? reading.paymentStatus}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
