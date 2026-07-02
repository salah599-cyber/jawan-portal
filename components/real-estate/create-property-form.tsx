"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { createProperty } from "@/lib/actions/real-estate";
import type { ReUnitInput } from "@/lib/actions/real-estate";
import {
  RE_OWNERSHIP_STATUS_LABELS,
  RE_PROPERTY_STATUS_LABELS,
  RE_PROPERTY_TYPE_LABELS,
  RE_UNIT_TYPE_LABELS,
  RE_VALUATION_METHOD_LABELS,
} from "@/lib/labels";
import { EntitySelect, type EntityOption } from "@/components/platform/entity-select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const emptyUnit = (): ReUnitInput => ({
  unitNumber: "",
  unitType: "FLAT",
});

export function CreatePropertyForm({ entities }: { entities: EntityOption[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [entityId, setEntityId] = useState(entities[0]?.id ?? "");
  const [propertyType, setPropertyType] = useState("APARTMENT_BUILDING");
  const [ownershipStatus, setOwnershipStatus] = useState("OWNED");
  const [status, setStatus] = useState("ACTIVE");
  const [valuationMethod, setValuationMethod] = useState("none");
  const [unitsMode, setUnitsMode] = useState<"rows" | "json">("rows");
  const [unitRows, setUnitRows] = useState<ReUnitInput[]>([emptyUnit()]);
  const [unitsJson, setUnitsJson] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("entityId", entityId);
    formData.set("propertyType", propertyType);
    formData.set("ownershipStatus", ownershipStatus);
    formData.set("status", status);
    formData.set("valuationMethod", valuationMethod === "none" ? "" : valuationMethod);

    if (unitsMode === "json") {
      formData.set("unitsJson", unitsJson);
    } else {
      const validUnits = unitRows.filter((u) => u.unitNumber.trim());
      formData.set("unitsJson", JSON.stringify(validUnits));
    }

    startTransition(async () => {
      try {
        const property = await createProperty(formData);
        router.push(`/real-estate/${property.id}`);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create property.");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Register Property</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="name">Property Name</Label>
              <Input id="name" name="name" required placeholder="e.g. Al Khuwair Building" />
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
          </div>

          <div>
            <h3 className="mb-3 text-sm font-medium">Location</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="governorate">Governorate</Label><Input id="governorate" name="governorate" /></div>
              <div className="space-y-2"><Label htmlFor="wilayat">Wilayat</Label><Input id="wilayat" name="wilayat" /></div>
              <div className="space-y-2"><Label htmlFor="area">Area</Label><Input id="area" name="area" /></div>
              <div className="space-y-2"><Label htmlFor="streetAddress">Street Address</Label><Input id="streetAddress" name="streetAddress" /></div>
              <div className="space-y-2"><Label htmlFor="plotNumber">Plot Number</Label><Input id="plotNumber" name="plotNumber" /></div>
              <div className="space-y-2"><Label htmlFor="parcelNumber">Parcel Number</Label><Input id="parcelNumber" name="parcelNumber" /></div>
              <div className="space-y-2"><Label htmlFor="googleMapsUrl">Google Maps URL</Label><Input id="googleMapsUrl" name="googleMapsUrl" /></div>
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-medium">Physical Details</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="landAreaSqm">Land Area (m²)</Label><Input id="landAreaSqm" name="landAreaSqm" /></div>
              <div className="space-y-2"><Label htmlFor="builtUpAreaSqm">Built-up Area (m²)</Label><Input id="builtUpAreaSqm" name="builtUpAreaSqm" /></div>
              <div className="space-y-2"><Label htmlFor="numFloors">Floors</Label><Input id="numFloors" name="numFloors" type="number" min="0" /></div>
              <div className="space-y-2"><Label htmlFor="yearBuilt">Year Built</Label><Input id="yearBuilt" name="yearBuilt" type="number" min="1800" /></div>
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-medium">Acquisition & Valuation</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="purchaseDate">Purchase Date</Label><Input id="purchaseDate" name="purchaseDate" type="date" /></div>
              <div className="space-y-2"><Label htmlFor="purchasePriceOmr">Purchase Price (OMR)</Label><Input id="purchasePriceOmr" name="purchasePriceOmr" /></div>
              <div className="space-y-2"><Label htmlFor="currentValuationOmr">Current Valuation (OMR)</Label><Input id="currentValuationOmr" name="currentValuationOmr" /></div>
              <div className="space-y-2"><Label htmlFor="lastValuationDate">Last Valuation Date</Label><Input id="lastValuationDate" name="lastValuationDate" type="date" /></div>
              <div className="space-y-2">
                <Label>Valuation Method</Label>
                <Select value={valuationMethod} onValueChange={setValuationMethod}>
                  <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not specified</SelectItem>
                    {Object.entries(RE_VALUATION_METHOD_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-medium">Mortgage (optional)</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="mortgageBank">Bank</Label><Input id="mortgageBank" name="mortgageBank" /></div>
              <div className="space-y-2"><Label htmlFor="mortgageOutstandingOmr">Outstanding (OMR)</Label><Input id="mortgageOutstandingOmr" name="mortgageOutstandingOmr" /></div>
              <div className="space-y-2"><Label htmlFor="mortgageMonthlyPaymentOmr">Monthly Payment (OMR)</Label><Input id="mortgageMonthlyPaymentOmr" name="mortgageMonthlyPaymentOmr" /></div>
              <div className="space-y-2"><Label htmlFor="mortgageEndDate">End Date</Label><Input id="mortgageEndDate" name="mortgageEndDate" type="date" /></div>
            </div>
          </div>

          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-medium">Units (optional)</h3>
              <div className="flex gap-2">
                <Button type="button" variant={unitsMode === "rows" ? "default" : "outline"} size="sm" onClick={() => setUnitsMode("rows")}>
                  Unit Rows
                </Button>
                <Button type="button" variant={unitsMode === "json" ? "default" : "outline"} size="sm" onClick={() => setUnitsMode("json")}>
                  JSON
                </Button>
              </div>
            </div>

            {unitsMode === "json" ? (
              <div className="space-y-2">
                <Label htmlFor="unitsJson">Units JSON</Label>
                <Textarea
                  id="unitsJson"
                  value={unitsJson}
                  onChange={(e) => setUnitsJson(e.target.value)}
                  rows={6}
                  placeholder={'[{"unitNumber":"101","unitType":"FLAT","marketRentOmr":"350"}]'}
                />
              </div>
            ) : (
              <div className="space-y-3">
                {unitRows.map((unit, index) => (
                  <div key={index} className="grid gap-3 rounded-lg border p-3 md:grid-cols-4">
                    <div className="space-y-2">
                      <Label>Unit #</Label>
                      <Input
                        value={unit.unitNumber}
                        onChange={(e) => {
                          const next = [...unitRows];
                          next[index] = { ...next[index]!, unitNumber: e.target.value };
                          setUnitRows(next);
                        }}
                        placeholder="101"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select
                        value={unit.unitType}
                        onValueChange={(value) => {
                          const next = [...unitRows];
                          next[index] = { ...next[index]!, unitType: value as ReUnitInput["unitType"] };
                          setUnitRows(next);
                        }}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(RE_UNIT_TYPE_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Market Rent (OMR)</Label>
                      <Input
                        value={unit.marketRentOmr ?? ""}
                        onChange={(e) => {
                          const next = [...unitRows];
                          next[index] = { ...next[index]!, marketRentOmr: e.target.value };
                          setUnitRows(next);
                        }}
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={unitRows.length === 1}
                        onClick={() => setUnitRows(unitRows.filter((_, i) => i !== index))}
                        aria-label="Remove unit"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => setUnitRows([...unitRows, emptyUnit()])}>
                  <Plus className="mr-1 size-4" /> Add Unit Row
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={3} />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <Button type="submit" disabled={pending}>
            {pending ? "Creating..." : "Create Property"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
