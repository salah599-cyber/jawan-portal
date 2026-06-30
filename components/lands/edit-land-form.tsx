"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateLand } from "@/lib/actions/lands";
import { EDITABLE_ASSET_STATUS_ENTRIES, LAND_USE_LABELS } from "@/lib/labels";
import { formatDateInput, formatDecimalInput } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EntitySelect } from "@/components/platform/entity-select";
import { LandLocationFields, initialLandLocationValues } from "@/components/lands/land-location-fields";
import type { LandRegisteredHolderInput } from "@/lib/actions/lands";
import { LandRegisteredHoldersFields } from "@/components/lands/land-registered-holders-fields";

type LandRecord = {
  id: string;
  name: string;
  locationType: string;
  country: string;
  governorate: string | null;
  wilayat: string | null;
  region: string | null;
  city: string | null;
  village: string | null;
  plotNumber: string | null;
  krookiNumber: string | null;
  mulkiaNumber: string | null;
  landUse: string | null;
  areaSqm: { toString(): string } | null;
  coordinates: string | null;
  entityId: string;
  registeredHolder: string | null;
  registeredHolders: Array<{
    name: string;
    ownershipPct: { toString(): string } | null;
    email: string | null;
    phone: string | null;
    notes: string | null;
  }>;
  status: string;
  currency: string;
  ownershipPct: { toString(): string };
  acquisitionDate: Date | null;
  acquisitionCost: { toString(): string } | null;
  currentValue: { toString(): string } | null;
  notes: string | null;
};

export function EditLandForm({ land, entities }: { land: LandRecord; entities: { id: string; name: string }[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [locationValues, setLocationValues] = useState(initialLandLocationValues(land));
  const [status, setStatus] = useState(land.status);
  const [entityId, setEntityId] = useState(land.entityId);
  const [landUse, setLandUse] = useState(land.landUse ?? "RESIDENTIAL");
  const [currency, setCurrency] = useState(land.currency);

  const initialHolders: LandRegisteredHolderInput[] =
    land.registeredHolders.length > 0
      ? land.registeredHolders.map((holder) => ({
          name: holder.name,
          ownershipPct: holder.ownershipPct?.toString() ?? "",
          email: holder.email ?? "",
          phone: holder.phone ?? "",
          notes: holder.notes ?? "",
        }))
      : land.registeredHolder
        ? land.registeredHolder
            .split(/[,;]+/)
            .map((name) => name.trim())
            .filter(Boolean)
            .map((name) => ({ name, ownershipPct: "", email: "", phone: "", notes: "" }))
        : [];

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("status", status);
    formData.set("entityId", entityId);
    formData.set("landUse", landUse);
    formData.set("currency", currency);

    startTransition(async () => {
      try {
        await updateLand(land.id, formData);
        router.push("/lands/" + land.id);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update land.");
      }
    });
  }

  return (
    <Card>
      <CardHeader><CardTitle>Edit Land Parcel</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="name">Land Name</Label>
            <Input id="name" name="name" required defaultValue={land.name} />
          </div>

          <LandLocationFields
            values={locationValues}
            onChange={setLocationValues}
            villageDefaultValue={land.village ?? ""}
            referenceDefaults={{
              krooki: land.krookiNumber ?? "",
              mulkia: land.mulkiaNumber ?? "",
            }}
          />

          <div className="space-y-2"><Label htmlFor="plotNumber">Plot Number</Label><Input id="plotNumber" name="plotNumber" defaultValue={land.plotNumber ?? ""} /></div>
          <div className="space-y-2">
            <Label>Land Use</Label>
            <Select value={landUse} onValueChange={setLandUse}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(LAND_USE_LABELS).map(([value, label]) => (<SelectItem key={value} value={value}>{label}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label htmlFor="areaSqm">Area (m²)</Label><Input id="areaSqm" name="areaSqm" type="number" step="0.01" min="0" defaultValue={formatDecimalInput(land.areaSqm)} /></div>
          <div className="space-y-2"><Label htmlFor="coordinates">GPS Coordinates</Label><Input id="coordinates" name="coordinates" defaultValue={land.coordinates ?? ""} /></div>
          <div className="space-y-2">
            <Label>Entity</Label>
            <EntitySelect entities={entities} value={entityId} onValueChange={setEntityId} />
          </div>
          <LandRegisteredHoldersFields initialHolders={initialHolders} />
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {EDITABLE_ASSET_STATUS_ENTRIES.map(([value, label]) => (<SelectItem key={value} value={value}>{label}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["OMR", "USD", "EUR", "GBP", "AED"].map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label htmlFor="ownershipPct">Ownership %</Label><Input id="ownershipPct" name="ownershipPct" type="number" step="0.01" min="0" max="100" defaultValue={formatDecimalInput(land.ownershipPct)} /></div>
          <div className="space-y-2"><Label htmlFor="acquisitionDate">Acquisition Date</Label><Input id="acquisitionDate" name="acquisitionDate" type="date" defaultValue={formatDateInput(land.acquisitionDate)} /></div>
          <div className="space-y-2"><Label htmlFor="acquisitionCost">Acquisition Cost</Label><Input id="acquisitionCost" name="acquisitionCost" type="number" step="0.01" min="0" defaultValue={formatDecimalInput(land.acquisitionCost)} /></div>
          <div className="space-y-2"><Label htmlFor="currentValue">Current Value</Label><Input id="currentValue" name="currentValue" type="number" step="0.01" min="0" defaultValue={formatDecimalInput(land.currentValue)} /></div>
          <div className="space-y-2 md:col-span-2"><Label htmlFor="notes">Notes</Label><Textarea id="notes" name="notes" rows={3} defaultValue={land.notes ?? ""} /></div>
          {error ? <p className="text-sm text-destructive md:col-span-2">{error}</p> : null}
          <div className="flex gap-2 md:col-span-2">
            <Button type="submit" disabled={pending}>{pending ? "Saving..." : "Save Changes"}</Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
