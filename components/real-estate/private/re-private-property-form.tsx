"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createPrivateProperty, updatePrivateProperty } from "@/lib/actions/private-real-estate";
import {
  RE_FINISHING_QUALITY_LABELS,
  RE_FURNISHING_STATUS_LABELS,
  RE_OWNERSHIP_STATUS_LABELS,
  RE_PROPERTY_CONDITION_LABELS,
  RE_PROPERTY_STATUS_LABELS,
  RE_VALUATION_METHOD_LABELS,
} from "@/lib/labels";
import { OMAN_GOVERNORATES } from "@/lib/real-estate/constants";
import type { SerializedPrivateProperty } from "@/lib/real-estate/serialize-private";

export function RePrivatePropertyForm({
  entities,
  property,
}: {
  entities: { id: string; name: string }[];
  property?: SerializedPrivateProperty;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const detail = property?.detail;

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        if (property) {
          await updatePrivateProperty(property.id, formData);
          router.push(`/real-estate/private/${property.id}`);
        } else {
          const id = await createPrivateProperty(formData);
          router.push(`/real-estate/private/${id}`);
        }
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save villa.");
      }
    });
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>Identity & Location</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field label="Villa name / label" name="name" defaultValue={property?.name} required />
          <EntitySelect entities={entities} defaultValue={property?.entityId} />
          <Field label="Plot number" name="plotNumber" defaultValue={property?.plotNumber ?? ""} />
          <Field label="Parcel number" name="parcelNumber" defaultValue={property?.parcelNumber ?? ""} />
          <SelectField label="Governorate" name="governorate" options={OMAN_GOVERNORATES} defaultValue={property?.governorate ?? ""} />
          <Field label="Wilayat" name="wilayat" defaultValue={property?.wilayat ?? ""} />
          <Field label="Area" name="area" defaultValue={property?.area ?? ""} />
          <Field label="Street address" name="streetAddress" defaultValue={property?.streetAddress ?? ""} className="md:col-span-2" />
          <Field label="Title deed number" name="titleDeedNumber" defaultValue={detail?.titleDeedNumber ?? ""} />
          <Field label="Registered owner" name="registeredOwner" defaultValue={detail?.registeredOwner ?? ""} />
          <Field label="Beneficial owner" name="beneficialOwner" defaultValue={detail?.beneficialOwner ?? ""} />
          <SelectField label="Status" name="status" options={RE_PROPERTY_STATUS_LABELS} defaultValue={property?.status ?? "ACTIVE"} />
          <SelectField label="Ownership" name="ownershipStatus" options={RE_OWNERSHIP_STATUS_LABELS} defaultValue={property?.ownershipStatus ?? "OWNED"} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Physical Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field label="Land area (sqm)" name="landAreaSqm" type="number" defaultValue={property?.landAreaSqm ?? ""} />
          <Field label="Built-up area (sqm)" name="builtUpAreaSqm" type="number" defaultValue={property?.builtUpAreaSqm ?? ""} />
          <Field label="Floors" name="numFloors" type="number" defaultValue={property?.numFloors?.toString() ?? ""} />
          <Field label="Bedrooms" name="numBedrooms" type="number" defaultValue={detail?.numBedrooms?.toString() ?? ""} />
          <Field label="Bathrooms" name="numBathrooms" type="number" defaultValue={detail?.numBathrooms?.toString() ?? ""} />
          <Field label="Parking spaces" name="numParkingSpaces" type="number" defaultValue={detail?.numParkingSpaces?.toString() ?? ""} />
          <Field label="Year built" name="yearBuilt" type="number" defaultValue={property?.yearBuilt?.toString() ?? ""} />
          <Field label="Construction type" name="constructionType" defaultValue={detail?.constructionType ?? ""} />
          <SelectField label="Finishing quality" name="finishingQuality" options={RE_FINISHING_QUALITY_LABELS} defaultValue={detail?.finishingQuality ?? ""} />
          <SelectField label="Furnishing" name="furnishingStatus" options={RE_FURNISHING_STATUS_LABELS} defaultValue={detail?.furnishingStatus ?? ""} />
          <SelectField label="Condition" name="condition" options={RE_PROPERTY_CONDITION_LABELS} defaultValue={detail?.condition ?? ""} />
          <CheckboxField label="Pool" name="hasPool" defaultChecked={detail?.hasPool ?? false} />
          <CheckboxField label="Garden / landscaping" name="hasGardenLandscaping" defaultChecked={detail?.hasGardenLandscaping ?? false} />
          <CheckboxField label="Smart home systems" name="hasSmartHome" defaultChecked={detail?.hasSmartHome ?? false} />
          <Field label="Last renovation date" name="lastRenovationDate" type="date" defaultValue={toDateInput(detail?.lastRenovationDate)} />
          <Field label="Last renovation cost (OMR)" name="lastRenovationCostOmr" type="number" defaultValue={detail?.lastRenovationCostOmr ?? ""} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Valuation & Acquisition</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field label="Purchase price (OMR)" name="purchasePriceOmr" type="number" defaultValue={property?.purchasePriceOmr ?? ""} />
          <Field label="Acquisition date" name="purchaseDate" type="date" defaultValue={toDateInput(property?.purchaseDate)} />
          <Field label="Current valuation (OMR)" name="currentValuationOmr" type="number" defaultValue={property?.currentValuationOmr ?? ""} />
          <Field label="Last valuation date" name="lastValuationDate" type="date" defaultValue={toDateInput(property?.lastValuationDate)} />
          <SelectField label="Valuation method" name="valuationMethod" options={RE_VALUATION_METHOD_LABELS} defaultValue={property?.valuationMethod ?? ""} />
          <Field label="GPS latitude" name="gpsLat" type="number" defaultValue={property?.gpsLat ?? ""} />
          <Field label="GPS longitude" name="gpsLng" type="number" defaultValue={property?.gpsLng ?? ""} />
          <Field label="Google Maps link" name="googleMapsUrl" defaultValue={property?.googleMapsUrl ?? ""} className="md:col-span-2" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Succession Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Label htmlFor="wasiyyaConditions">Wasiyya / inheritance conditions</Label>
          <Textarea
            id="wasiyyaConditions"
            name="wasiyyaConditions"
            defaultValue={detail?.wasiyyaConditions ?? ""}
            rows={3}
          />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : property ? "Save changes" : "Create villa"}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  required,
  className,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  type?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} defaultValue={defaultValue} required={required} />
    </div>
  );
}

function EntitySelect({
  entities,
  defaultValue,
}: {
  entities: { id: string; name: string }[];
  defaultValue?: string;
}) {
  return (
    <div>
      <Label htmlFor="entityId">Entity</Label>
      <select
        id="entityId"
        name="entityId"
        required
        defaultValue={defaultValue ?? entities[0]?.id}
        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
      >
        {entities.map((entity) => (
          <option key={entity.id} value={entity.id}>
            {entity.name}
          </option>
        ))}
      </select>
    </div>
  );
}

function SelectField({
  label,
  name,
  options,
  defaultValue,
}: {
  label: string;
  name: string;
  options: Record<string, string> | readonly string[];
  defaultValue?: string;
}) {
  const entries = Array.isArray(options)
    ? options.map((value) => [value, value] as const)
    : Object.entries(options);

  return (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <select
        id={name}
        name={name}
        defaultValue={defaultValue ?? ""}
        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
      >
        <option value="">—</option>
        {entries.map(([value, text]) => (
          <option key={value} value={value}>
            {text}
          </option>
        ))}
      </select>
    </div>
  );
}

function CheckboxField({
  label,
  name,
  defaultChecked,
}: {
  label: string;
  name: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} />
      {label}
    </label>
  );
}

function toDateInput(value?: string | null) {
  if (!value) return "";
  return value.slice(0, 10);
}
