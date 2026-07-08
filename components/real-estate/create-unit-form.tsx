"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createUnit } from "@/lib/actions/real-estate";
import {
  RE_FURNISHING_STATUS_LABELS,
  RE_OCCUPANCY_STATUS_LABELS,
  RE_UNIT_TYPE_LABELS,
} from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export function CreateUnitForm({
  propertyId,
  onSuccess,
}: {
  propertyId: string;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [unitType, setUnitType] = useState("FLAT");
  const [occupancyStatus, setOccupancyStatus] = useState("VACANT");
  const [furnishingStatus, setFurnishingStatus] = useState("none");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("unitType", unitType);
    formData.set("occupancyStatus", occupancyStatus);
    formData.set("furnishingStatus", furnishingStatus === "none" ? "" : furnishingStatus);

    startTransition(async () => {
      try {
        await createUnit(propertyId, formData);
        onSuccess?.();
        router.refresh();
        (e.target as HTMLFormElement).reset();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to add unit.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="unitNumber">Unit Number</Label>
        <Input id="unitNumber" name="unitNumber" required placeholder="e.g. 101" />
      </div>
      <div className="space-y-2">
        <Label>Unit Type</Label>
        <Select value={unitType} onValueChange={setUnitType}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(RE_UNIT_TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="floorNumber">Floor</Label>
        <Input id="floorNumber" name="floorNumber" type="number" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="areaSqm">Area (m²)</Label>
        <Input id="areaSqm" name="areaSqm" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="numBedrooms">Bedrooms</Label>
        <Input id="numBedrooms" name="numBedrooms" type="number" min="0" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="numBathrooms">Bathrooms</Label>
        <Input id="numBathrooms" name="numBathrooms" type="number" min="0" />
      </div>
      <div className="space-y-2">
        <Label>Occupancy</Label>
        <Select value={occupancyStatus} onValueChange={setOccupancyStatus}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(RE_OCCUPANCY_STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Furnishing</Label>
        <Select value={furnishingStatus} onValueChange={setFurnishingStatus}>
          <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Not specified</SelectItem>
            {Object.entries(RE_FURNISHING_STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="marketRentOmr">Market Rent (OMR)</Label>
        <Input id="marketRentOmr" name="marketRentOmr" />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" rows={2} />
      </div>
      {error ? <p className="text-sm text-destructive md:col-span-2">{error}</p> : null}
      <div className="md:col-span-2">
        <Button type="submit" disabled={pending}>{pending ? "Adding..." : "Add Unit"}</Button>
      </div>
    </form>
  );
}
