"use client";

import { useState } from "react";
import type { DistributionInstructionInput } from "@/lib/actions/succession";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type LinkOptions = Awaited<ReturnType<typeof import("@/lib/actions/family-members").getFamilyLinkOptions>>;
type MemberOption = { id: string; fullName: string };

const emptyItem = (): DistributionInstructionInput => ({
  currency: "OMR",
  instructions: "",
});

type TargetType = "entity" | "asset" | "land" | "company" | "property" | "vehicle";

export function SuccessionDistributionFields({
  initialItems = [],
  linkOptions,
  members,
  distributionJsonName = "distributionJson",
}: {
  initialItems?: DistributionInstructionInput[];
  linkOptions: LinkOptions;
  members: MemberOption[];
  distributionJsonName?: string;
}) {
  const [items, setItems] = useState<DistributionInstructionInput[]>(initialItems);
  const [targetTypes, setTargetTypes] = useState<TargetType[]>(
    initialItems.map(() => "asset" as TargetType),
  );

  const serialized = JSON.stringify(items);

  return (
    <div className="space-y-4">
      <input type="hidden" name={distributionJsonName} value={serialized} readOnly />
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-medium text-muted-foreground">Distribution Instructions</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setItems((c) => [...c, emptyItem()]);
            setTargetTypes((c) => [...c, "asset"]);
          }}
        >
          Add instruction
        </Button>
      </div>
      {items.map((item, index) => (
        <div key={index} className="grid gap-4 rounded-lg border p-4 md:grid-cols-2">
          <div className="flex items-center justify-between md:col-span-2">
            <p className="text-sm font-medium">Instruction {index + 1}</p>
            <Button type="button" variant="ghost" size="sm" onClick={() => {
              setItems((c) => c.filter((_, i) => i !== index));
              setTargetTypes((c) => c.filter((_, i) => i !== index));
            }}>
              Remove
            </Button>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Beneficiary</Label>
            <Select
              value={item.beneficiaryMemberId ?? ""}
              onValueChange={(v) => setItems((c) => c.map((it, i) => i === index ? { ...it, beneficiaryMemberId: v } : it))}
            >
              <SelectTrigger><SelectValue placeholder="Select family member" /></SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.fullName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Target Type</Label>
            <Select
              value={targetTypes[index] ?? "asset"}
              onValueChange={(v) => setTargetTypes((c) => c.map((t, i) => i === index ? (v as TargetType) : t))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="entity">Entity</SelectItem>
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
                targetTypes[index] === "entity" ? item.entityId ?? "" :
                targetTypes[index] === "land" ? item.landParcelId ?? "" :
                targetTypes[index] === "company" ? item.registeredCompanyId ?? "" :
                targetTypes[index] === "property" ? item.rePropertyId ?? "" :
                targetTypes[index] === "vehicle" ? item.vehicleId ?? "" :
                item.assetId ?? ""
              }
              onValueChange={(v) => {
                const base = { ...item, entityId: undefined, assetId: undefined, landParcelId: undefined, registeredCompanyId: undefined, rePropertyId: undefined, vehicleId: undefined };
                const type = targetTypes[index];
                if (type === "entity") setItems((c) => c.map((it, i) => i === index ? { ...base, entityId: v } : it));
                else if (type === "land") setItems((c) => c.map((it, i) => i === index ? { ...base, landParcelId: v } : it));
                else if (type === "company") setItems((c) => c.map((it, i) => i === index ? { ...base, registeredCompanyId: v } : it));
                else if (type === "property") setItems((c) => c.map((it, i) => i === index ? { ...base, rePropertyId: v } : it));
                else if (type === "vehicle") setItems((c) => c.map((it, i) => i === index ? { ...base, vehicleId: v } : it));
                else setItems((c) => c.map((it, i) => i === index ? { ...base, assetId: v } : it));
              }}
            >
              <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                {(targetTypes[index] === "entity" ? linkOptions.entities :
                  targetTypes[index] === "land" ? linkOptions.lands :
                  targetTypes[index] === "company" ? linkOptions.companies :
                  targetTypes[index] === "property" ? linkOptions.properties :
                  targetTypes[index] === "vehicle" ? linkOptions.vehicles :
                  linkOptions.assets
                ).map((opt) => (
                  <SelectItem key={opt.id} value={opt.id}>{opt.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Allocation %</Label>
            <Input
              value={item.allocationPct ?? ""}
              onChange={(e) => setItems((c) => c.map((it, i) => i === index ? { ...it, allocationPct: e.target.value } : it))}
            />
          </div>
          <div className="space-y-2">
            <Label>Fixed Amount</Label>
            <Input
              value={item.allocationAmount ?? ""}
              onChange={(e) => setItems((c) => c.map((it, i) => i === index ? { ...it, allocationAmount: e.target.value } : it))}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Instructions</Label>
            <Textarea
              value={item.instructions ?? ""}
              onChange={(e) => setItems((c) => c.map((it, i) => i === index ? { ...it, instructions: e.target.value } : it))}
              rows={2}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
