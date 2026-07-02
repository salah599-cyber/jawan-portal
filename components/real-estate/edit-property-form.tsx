"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateProperty } from "@/lib/actions/real-estate";
import {
  RE_OWNERSHIP_STATUS_LABELS,
  RE_PROPERTY_STATUS_LABELS,
  RE_PROPERTY_TYPE_LABELS,
  RE_VALUATION_METHOD_LABELS,
} from "@/lib/labels";
import { formatDateInput, formatDecimalInput } from "@/lib/format";
import type { SerializedReProperty } from "@/lib/real-estate/serialize";
import { EntitySelect, type EntityOption } from "@/components/platform/entity-select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export function EditPropertyForm({
  property,
  entities,
}: {
  property: SerializedReProperty;
  entities: EntityOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [entityId, setEntityId] = useState(property.entityId);
  const [propertyType, setPropertyType] = useState<string>(property.propertyType);
  const [ownershipStatus, setOwnershipStatus] = useState<string>(property.ownershipStatus);
  const [status, setStatus] = useState<string>(property.status);
  const [valuationMethod, setValuationMethod] = useState(property.valuationMethod ?? "none");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("entityId", entityId);
    formData.set("propertyType", propertyType);
    formData.set("ownershipStatus", ownershipStatus);
    formData.set("status", status);
    formData.set("valuationMethod", valuationMethod === "none" ? "" : valuationMethod);

    startTransition(async () => {
      try {
        await updateProperty(property.id, formData);
        router.push(`/real-estate/${property.id}`);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update property.");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Property</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="name">Property Name</Label>
            <Input id="name" name="name" required defaultValue={property.name} />
          </div>
          <div className="space-y-2">
            <Label>Entity</Label>
            <EntitySelect entities={entities} value={entityId} onValueChange={setEntityId} />
          </div>
          <div className="space-y-2">
            <Label>Property Type</Label>
            <Select value={propertyType} onValueChange={setPropertyType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(RE_PROPERTY_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Ownership</Label>
            <Select value={ownershipStatus} onValueChange={setOwnershipStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(RE_OWNERSHIP_STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(RE_PROPERTY_STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label htmlFor="governorate">Governorate</Label><Input id="governorate" name="governorate" defaultValue={property.governorate ?? ""} /></div>
          <div className="space-y-2"><Label htmlFor="wilayat">Wilayat</Label><Input id="wilayat" name="wilayat" defaultValue={property.wilayat ?? ""} /></div>
          <div className="space-y-2"><Label htmlFor="area">Area</Label><Input id="area" name="area" defaultValue={property.area ?? ""} /></div>
          <div className="space-y-2"><Label htmlFor="streetAddress">Street Address</Label><Input id="streetAddress" name="streetAddress" defaultValue={property.streetAddress ?? ""} /></div>
          <div className="space-y-2"><Label htmlFor="plotNumber">Plot Number</Label><Input id="plotNumber" name="plotNumber" defaultValue={property.plotNumber ?? ""} /></div>
          <div className="space-y-2"><Label htmlFor="parcelNumber">Parcel Number</Label><Input id="parcelNumber" name="parcelNumber" defaultValue={property.parcelNumber ?? ""} /></div>
          <div className="space-y-2"><Label htmlFor="landAreaSqm">Land Area (m²)</Label><Input id="landAreaSqm" name="landAreaSqm" defaultValue={formatDecimalInput(property.landAreaSqm)} /></div>
          <div className="space-y-2"><Label htmlFor="builtUpAreaSqm">Built-up Area (m²)</Label><Input id="builtUpAreaSqm" name="builtUpAreaSqm" defaultValue={formatDecimalInput(property.builtUpAreaSqm)} /></div>
          <div className="space-y-2"><Label htmlFor="numFloors">Floors</Label><Input id="numFloors" name="numFloors" type="number" defaultValue={property.numFloors ?? ""} /></div>
          <div className="space-y-2"><Label htmlFor="yearBuilt">Year Built</Label><Input id="yearBuilt" name="yearBuilt" type="number" defaultValue={property.yearBuilt ?? ""} /></div>
          <div className="space-y-2"><Label htmlFor="purchaseDate">Purchase Date</Label><Input id="purchaseDate" name="purchaseDate" type="date" defaultValue={formatDateInput(property.purchaseDate)} /></div>
          <div className="space-y-2"><Label htmlFor="purchasePriceOmr">Purchase Price (OMR)</Label><Input id="purchasePriceOmr" name="purchasePriceOmr" defaultValue={formatDecimalInput(property.purchasePriceOmr)} /></div>
          <div className="space-y-2"><Label htmlFor="currentValuationOmr">Current Valuation (OMR)</Label><Input id="currentValuationOmr" name="currentValuationOmr" defaultValue={formatDecimalInput(property.currentValuationOmr)} /></div>
          <div className="space-y-2"><Label htmlFor="lastValuationDate">Last Valuation Date</Label><Input id="lastValuationDate" name="lastValuationDate" type="date" defaultValue={formatDateInput(property.lastValuationDate)} /></div>
          <div className="space-y-2">
            <Label>Valuation Method</Label>
            <Select value={valuationMethod} onValueChange={setValuationMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not specified</SelectItem>
                {Object.entries(RE_VALUATION_METHOD_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label htmlFor="mortgageBank">Mortgage Bank</Label><Input id="mortgageBank" name="mortgageBank" defaultValue={property.mortgageBank ?? ""} /></div>
          <div className="space-y-2"><Label htmlFor="mortgageOutstandingOmr">Mortgage Outstanding (OMR)</Label><Input id="mortgageOutstandingOmr" name="mortgageOutstandingOmr" defaultValue={formatDecimalInput(property.mortgageOutstandingOmr)} /></div>
          <div className="space-y-2"><Label htmlFor="mortgageMonthlyPaymentOmr">Monthly Payment (OMR)</Label><Input id="mortgageMonthlyPaymentOmr" name="mortgageMonthlyPaymentOmr" defaultValue={formatDecimalInput(property.mortgageMonthlyPaymentOmr)} /></div>
          <div className="space-y-2"><Label htmlFor="mortgageEndDate">Mortgage End Date</Label><Input id="mortgageEndDate" name="mortgageEndDate" type="date" defaultValue={formatDateInput(property.mortgageEndDate)} /></div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={3} defaultValue={property.notes ?? ""} />
          </div>
          {error ? <p className="text-sm text-destructive md:col-span-2">{error}</p> : null}
          <div className="md:col-span-2">
            <Button type="submit" disabled={pending}>{pending ? "Saving..." : "Save Changes"}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
