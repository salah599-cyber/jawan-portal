"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCar } from "@/lib/actions/cars";
import { OMAN_GOVERNORATES, getWilayatsForGovernorate } from "@/lib/data/oman-locations";
import {
  EDITABLE_ASSET_STATUS_ENTRIES,
  VEHICLE_BODY_TYPE_LABELS,
  VEHICLE_CLASS_LABELS,
  VEHICLE_FUEL_TYPE_LABELS,
} from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EntitySelect, type EntityOption } from "@/components/platform/entity-select";
import { ALLOWED_UPLOAD_ACCEPT } from "@/lib/upload-limits";

function FileSection({ id, name, label, description }: { id: string; name: string; label: string; description: string }) {
  return (
    <div className="space-y-2 md:col-span-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={name} type="file" multiple accept={ALLOWED_UPLOAD_ACCEPT} />
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

export function CreateCarForm({ entities }: { entities: EntityOption[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [governorate, setGovernorate] = useState<string>(OMAN_GOVERNORATES[0]);
  const [wilayat, setWilayat] = useState(getWilayatsForGovernorate(OMAN_GOVERNORATES[0])[0] ?? "");
  const [status, setStatus] = useState("ACTIVE");
  const [entityId, setEntityId] = useState(entities[0]?.id ?? "");
  const [vehicleClass, setVehicleClass] = useState("PRIVATE");
  const [bodyType, setBodyType] = useState("SUV");
  const [fuelType, setFuelType] = useState("PETROL");
  const [currency, setCurrency] = useState("OMR");

  const wilayats = useMemo(() => getWilayatsForGovernorate(governorate), [governorate]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("governorate", governorate);
    formData.set("wilayat", wilayat);
    formData.set("status", status);
    formData.set("entityId", entityId);
    formData.set("vehicleClass", vehicleClass);
    formData.set("bodyType", bodyType);
    formData.set("fuelType", fuelType);
    formData.set("currency", currency);

    startTransition(async () => {
      try {
        const car = await createCar(formData);
        router.push("/cars/" + car.id);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to register vehicle.");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Register Oman Vehicle</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <p className="text-sm font-medium text-muted-foreground">Motor Vehicle License details</p>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="name">Display Name</Label>
            <Input id="name" name="name" required placeholder="e.g. Family Land Cruiser" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="plateNumber">Plate Number</Label>
            <Input id="plateNumber" name="plateNumber" required placeholder="e.g. 12345" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="plateCode">Plate Code</Label>
            <Input id="plateCode" name="plateCode" placeholder="e.g. B, AA, M" />
          </div>

          <div className="space-y-2">
            <Label>Governorate</Label>
            <Select value={governorate} onValueChange={(v) => { setGovernorate(v); setWilayat(getWilayatsForGovernorate(v)[0] ?? ""); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {OMAN_GOVERNORATES.map((g) => (<SelectItem key={g} value={g}>{g}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Wilayat</Label>
            <Select value={wilayat} onValueChange={setWilayat}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {wilayats.map((w) => (<SelectItem key={w} value={w}>{w}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="make">Make</Label>
            <Input id="make" name="make" required placeholder="e.g. Toyota" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="model">Model</Label>
            <Input id="model" name="model" required placeholder="e.g. Land Cruiser" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="modelYear">Model Year</Label>
            <Input id="modelYear" name="modelYear" type="number" min="1980" max="2100" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="color">Color</Label>
            <Input id="color" name="color" />
          </div>

          <div className="space-y-2">
            <Label>Vehicle Class</Label>
            <Select value={vehicleClass} onValueChange={setVehicleClass}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(VEHICLE_CLASS_LABELS).map(([v, l]) => (<SelectItem key={v} value={v}>{l}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Body Type</Label>
            <Select value={bodyType} onValueChange={setBodyType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(VEHICLE_BODY_TYPE_LABELS).map(([v, l]) => (<SelectItem key={v} value={v}>{l}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Fuel Type</Label>
            <Select value={fuelType} onValueChange={setFuelType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(VEHICLE_FUEL_TYPE_LABELS).map(([v, l]) => (<SelectItem key={v} value={v}>{l}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="mulkiaNumber">Mulkia / License Number</Label>
            <Input id="mulkiaNumber" name="mulkiaNumber" />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="chassisNumber">Chassis Number (VIN)</Label>
            <Input id="chassisNumber" name="chassisNumber" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="engineNumber">Engine Number</Label>
            <Input id="engineNumber" name="engineNumber" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="registeredOwner">Registered Owner</Label>
            <Input id="registeredOwner" name="registeredOwner" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="registrationIssueDate">Registration Issue Date</Label>
            <Input id="registrationIssueDate" name="registrationIssueDate" type="date" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="registrationExpiryDate">Registration Expiry</Label>
            <Input id="registrationExpiryDate" name="registrationExpiryDate" type="date" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="insuranceCompany">Insurance Company</Label>
            <Input id="insuranceCompany" name="insuranceCompany" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="insurancePolicyNumber">Insurance Policy Number</Label>
            <Input id="insurancePolicyNumber" name="insurancePolicyNumber" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="insuranceExpiryDate">Insurance Expiry</Label>
            <Input id="insuranceExpiryDate" name="insuranceExpiryDate" type="date" />
          </div>

          <div className="space-y-2">
            <Label>Entity</Label>
            <EntitySelect entities={entities} value={entityId} onValueChange={setEntityId} />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {EDITABLE_ASSET_STATUS_ENTRIES.map(([v, l]) => (<SelectItem key={v} value={v}>{l}</SelectItem>))}
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
          <div className="space-y-2">
            <Label htmlFor="ownershipPct">Ownership %</Label>
            <Input id="ownershipPct" name="ownershipPct" type="number" step="0.01" min="0" max="100" defaultValue="100" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="acquisitionDate">Acquisition Date</Label>
            <Input id="acquisitionDate" name="acquisitionDate" type="date" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="acquisitionCost">Acquisition Cost</Label>
            <Input id="acquisitionCost" name="acquisitionCost" type="number" step="0.01" min="0" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="currentValue">Current Value</Label>
            <Input id="currentValue" name="currentValue" type="number" step="0.01" min="0" />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={3} />
          </div>

          <div className="md:col-span-2"><p className="mb-3 text-sm font-medium">Documents (optional)</p></div>
          <FileSection id="mulkiaFiles" name="mulkiaFiles" label="Motor Vehicle License (Mulkia)" description="Upload Mulkia scans. Multiple files allowed." />
          <FileSection id="insuranceFiles" name="insuranceFiles" label="Insurance Documents" description="Insurance certificate and policy documents." />
          <FileSection id="otherFiles" name="otherFiles" label="Other Documents" description="Supporting documents." />

          {error ? <p className="text-sm text-destructive md:col-span-2">{error}</p> : null}
          <div className="flex gap-2 md:col-span-2">
            <Button type="submit" disabled={pending}>{pending ? "Registering..." : "Register Vehicle"}</Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
