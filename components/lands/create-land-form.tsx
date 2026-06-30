"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createLand } from "@/lib/actions/lands";
import { ASSET_STATUS_LABELS, LAND_USE_LABELS } from "@/lib/labels";
import { getLandDocumentTypeLabels } from "@/lib/lands/location";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EntitySelect } from "@/components/platform/entity-select";
import { LandLocationFields, initialLandLocationValues } from "@/components/lands/land-location-fields";

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

export function CreateLandForm({ entities }: { entities: { id: string; name: string }[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [locationValues, setLocationValues] = useState(initialLandLocationValues());
  const [status, setStatus] = useState("ACTIVE");
  const [entityId, setEntityId] = useState(entities[0]?.id ?? "");
  const [landUse, setLandUse] = useState("RESIDENTIAL");
  const [currency, setCurrency] = useState("OMR");

  const isInternational = locationValues.locationType === "INTERNATIONAL";
  const docLabels = getLandDocumentTypeLabels(isInternational);

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
        const land = await createLand(formData);
        router.push("/lands/" + land.id);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to register land.");
      }
    });
  }

  return (
    <Card>
      <CardHeader><CardTitle>Register Land</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="name">Land Name</Label>
            <Input id="name" name="name" required placeholder="e.g. Seeb Plot 1234 or Dubai Marina Plot" />
          </div>

          <LandLocationFields values={locationValues} onChange={setLocationValues} />

          <div className="space-y-2"><Label htmlFor="plotNumber">Plot Number</Label><Input id="plotNumber" name="plotNumber" /></div>
          <div className="space-y-2">
            <Label>Land Use</Label>
            <Select value={landUse} onValueChange={setLandUse}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(LAND_USE_LABELS).map(([value, label]) => (<SelectItem key={value} value={value}>{label}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label htmlFor="areaSqm">Area (m²)</Label><Input id="areaSqm" name="areaSqm" type="number" step="0.01" min="0" /></div>
          <div className="space-y-2"><Label htmlFor="coordinates">GPS Coordinates</Label><Input id="coordinates" name="coordinates" /></div>
          <div className="space-y-2">
            <Label>Entity</Label>
            <EntitySelect entities={entities} value={entityId} onValueChange={setEntityId} />
          </div>
          <div className="space-y-2"><Label htmlFor="registeredHolder">Registered Holder</Label><Input id="registeredHolder" name="registeredHolder" /></div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(ASSET_STATUS_LABELS).map(([value, label]) => (<SelectItem key={value} value={value}>{label}</SelectItem>))}
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
          <div className="space-y-2"><Label htmlFor="ownershipPct">Ownership %</Label><Input id="ownershipPct" name="ownershipPct" type="number" step="0.01" min="0" max="100" defaultValue="100" /></div>
          <div className="space-y-2"><Label htmlFor="acquisitionDate">Acquisition Date</Label><Input id="acquisitionDate" name="acquisitionDate" type="date" /></div>
          <div className="space-y-2"><Label htmlFor="acquisitionCost">Acquisition Cost</Label><Input id="acquisitionCost" name="acquisitionCost" type="number" step="0.01" min="0" /></div>
          <div className="space-y-2"><Label htmlFor="currentValue">Current Value</Label><Input id="currentValue" name="currentValue" type="number" step="0.01" min="0" /></div>
          <div className="space-y-2 md:col-span-2"><Label htmlFor="notes">Notes</Label><Textarea id="notes" name="notes" rows={3} /></div>
          <div className="md:col-span-2"><p className="mb-3 text-sm font-medium">Documents (optional — upload now or later)</p></div>
          <FileSection id="krookiFiles" name="krookiFiles" label={docLabels.KROOKI} description={isInternational ? "Survey maps and plot plans." : "Survey maps and Krooki certificates."} />
          <FileSection id="mulkiaFiles" name="mulkiaFiles" label={docLabels.MULKIA} description={isInternational ? "Title deed or registration documents." : "Title deed (Mulkia)."} />
          <FileSection id="otherFiles" name="otherFiles" label={docLabels.OTHER} description="Supporting documents. Multiple files allowed." />
          {error ? <p className="text-sm text-destructive md:col-span-2">{error}</p> : null}
          <div className="flex gap-2 md:col-span-2">
            <Button type="submit" disabled={pending}>{pending ? "Registering..." : "Register Land"}</Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
