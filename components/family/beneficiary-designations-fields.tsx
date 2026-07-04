"use client";

import { useState } from "react";
import type { BeneficiaryDesignationInput } from "@/lib/family/types";
import { BENEFICIARY_DESIGNATION_TYPE_LABELS } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type LinkOptions = Awaited<ReturnType<typeof import("@/lib/actions/family-members").getFamilyLinkOptions>>;

const emptyDesignation = (): BeneficiaryDesignationInput => ({
  designationType: "PRIMARY",
  allocationPct: "",
  notes: "",
});

type TargetType = "insurance" | "asset" | "land" | "company" | "property" | "vehicle";

function getTargetType(d: BeneficiaryDesignationInput): TargetType {
  if (d.insurancePolicyId) return "insurance";
  if (d.assetId) return "asset";
  if (d.landParcelId) return "land";
  if (d.registeredCompanyId) return "company";
  if (d.rePropertyId) return "property";
  return "vehicle";
}

export function BeneficiaryDesignationsFields({
  initialDesignations = [],
  linkOptions,
  beneficiaryDesignationsJsonName = "beneficiaryDesignationsJson",
}: {
  initialDesignations?: BeneficiaryDesignationInput[];
  linkOptions: LinkOptions;
  beneficiaryDesignationsJsonName?: string;
}) {
  const [designations, setDesignations] = useState<BeneficiaryDesignationInput[]>(initialDesignations);
  const [targetTypes, setTargetTypes] = useState<TargetType[]>(
    initialDesignations.map((d) => getTargetType(d)),
  );

  function updateDesignation(index: number, next: BeneficiaryDesignationInput) {
    setDesignations((current) => current.map((d, i) => (i === index ? next : d)));
  }

  const serialized = JSON.stringify(designations);

  return (
    <div className="md:col-span-2 space-y-4">
      <input type="hidden" name={beneficiaryDesignationsJsonName} value={serialized} readOnly />
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-medium text-muted-foreground">Beneficiary Designations</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setDesignations((c) => [...c, emptyDesignation()]);
            setTargetTypes((c) => [...c, "asset"]);
          }}
        >
          Add designation
        </Button>
      </div>
      {designations.length === 0 ? (
        <p className="text-sm text-muted-foreground">No beneficiary designations recorded.</p>
      ) : null}
      {designations.map((d, index) => {
        const targetType = targetTypes[index] ?? "asset";
        return (
          <div key={index} className="grid gap-4 rounded-lg border p-4 md:grid-cols-2">
            <div className="flex items-center justify-between md:col-span-2">
              <p className="text-sm font-medium">Designation {index + 1}</p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDesignations((c) => c.filter((_, i) => i !== index));
                  setTargetTypes((c) => c.filter((_, i) => i !== index));
                }}
              >
                Remove
              </Button>
            </div>
            <div className="space-y-2">
              <Label>Target Type</Label>
              <Select
                value={targetType}
                onValueChange={(value) => {
                  setTargetTypes((c) => c.map((t, i) => (i === index ? (value as TargetType) : t)));
                  updateDesignation(index, emptyDesignation());
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="insurance">Insurance Policy</SelectItem>
                  <SelectItem value="asset">Asset</SelectItem>
                  <SelectItem value="land">Land</SelectItem>
                  <SelectItem value="company">Company</SelectItem>
                  <SelectItem value="property">Real Estate</SelectItem>
                  <SelectItem value="vehicle">Vehicle</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Target</Label>
              <Select
                value={
                  targetType === "insurance" ? d.insurancePolicyId ?? "" :
                  targetType === "asset" ? d.assetId ?? "" :
                  targetType === "land" ? d.landParcelId ?? "" :
                  targetType === "company" ? d.registeredCompanyId ?? "" :
                  targetType === "property" ? d.rePropertyId ?? "" :
                  d.vehicleId ?? ""
                }
                onValueChange={(value) => {
                  const base = { ...d, insurancePolicyId: undefined, assetId: undefined, landParcelId: undefined, registeredCompanyId: undefined, rePropertyId: undefined, vehicleId: undefined };
                  if (targetType === "insurance") updateDesignation(index, { ...base, insurancePolicyId: value });
                  else if (targetType === "asset") updateDesignation(index, { ...base, assetId: value });
                  else if (targetType === "land") updateDesignation(index, { ...base, landParcelId: value });
                  else if (targetType === "company") updateDesignation(index, { ...base, registeredCompanyId: value });
                  else if (targetType === "property") updateDesignation(index, { ...base, rePropertyId: value });
                  else updateDesignation(index, { ...base, vehicleId: value });
                }}
              >
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {(targetType === "insurance" ? linkOptions.policies :
                    targetType === "asset" ? linkOptions.assets :
                    targetType === "land" ? linkOptions.lands :
                    targetType === "company" ? linkOptions.companies :
                    targetType === "property" ? linkOptions.properties :
                    linkOptions.vehicles
                  ).map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {"name" in item ? item.name : `${item.insurer} — ${item.policyNumber}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Designation Type</Label>
              <Select
                value={d.designationType ?? "PRIMARY"}
                onValueChange={(value) => updateDesignation(index, { ...d, designationType: value })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(BENEFICIARY_DESIGNATION_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Allocation %</Label>
              <Input
                value={d.allocationPct ?? ""}
                onChange={(e) => updateDesignation(index, { ...d, allocationPct: e.target.value })}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Notes</Label>
              <Textarea value={d.notes ?? ""} onChange={(e) => updateDesignation(index, { ...d, notes: e.target.value })} rows={2} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
