"use client";

import { useState } from "react";
import type { OwnershipStakeInput } from "@/lib/family/types";
import {
  FAMILY_OWNERSHIP_STAKE_TYPE_LABELS,
} from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type LinkOptions = Awaited<ReturnType<typeof import("@/lib/actions/family-members").getFamilyLinkOptions>>;

const emptyStake = (): OwnershipStakeInput => ({
  entityId: "",
  stakeType: "ECONOMIC",
  ownershipPct: "",
  roleLabel: "",
  notes: "",
});

type TargetType = "entity" | "asset" | "land" | "company" | "property" | "vehicle";

function getTargetType(stake: OwnershipStakeInput): TargetType {
  if (stake.assetId) return "asset";
  if (stake.landParcelId) return "land";
  if (stake.registeredCompanyId) return "company";
  if (stake.rePropertyId) return "property";
  if (stake.vehicleId) return "vehicle";
  return "entity";
}

function getTargetId(stake: OwnershipStakeInput, type: TargetType): string {
  if (type === "asset") return stake.assetId ?? "";
  if (type === "land") return stake.landParcelId ?? "";
  if (type === "company") return stake.registeredCompanyId ?? "";
  if (type === "property") return stake.rePropertyId ?? "";
  if (type === "vehicle") return stake.vehicleId ?? "";
  return stake.entityId ?? "";
}

function setTarget(stake: OwnershipStakeInput, type: TargetType, id: string): OwnershipStakeInput {
  return {
    ...stake,
    entityId: type === "entity" ? id : stake.entityId,
    assetId: type === "asset" ? id : undefined,
    landParcelId: type === "land" ? id : undefined,
    registeredCompanyId: type === "company" ? id : undefined,
    rePropertyId: type === "property" ? id : undefined,
    vehicleId: type === "vehicle" ? id : undefined,
  };
}

export function FamilyOwnershipStakesFields({
  initialStakes = [],
  linkOptions,
  stakesJsonName = "stakesJson",
}: {
  initialStakes?: OwnershipStakeInput[];
  linkOptions: LinkOptions;
  stakesJsonName?: string;
}) {
  const [stakes, setStakes] = useState<OwnershipStakeInput[]>(
    initialStakes.length > 0 ? initialStakes : [],
  );
  const [targetTypes, setTargetTypes] = useState<TargetType[]>(
    initialStakes.map((s) => getTargetType(s)),
  );

  function updateStake(index: number, next: OwnershipStakeInput) {
    setStakes((current) => current.map((s, i) => (i === index ? next : s)));
  }

  function addStake() {
    setStakes((current) => [...current, emptyStake()]);
    setTargetTypes((current) => [...current, "entity"]);
  }

  function removeStake(index: number) {
    setStakes((current) => current.filter((_, i) => i !== index));
    setTargetTypes((current) => current.filter((_, i) => i !== index));
  }

  const serialized = JSON.stringify(stakes);

  return (
    <div className="md:col-span-2 space-y-4">
      <input type="hidden" name={stakesJsonName} value={serialized} readOnly />
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-medium text-muted-foreground">Ownership Stakes</p>
        <Button type="button" variant="outline" size="sm" onClick={addStake}>
          Add stake
        </Button>
      </div>
      {stakes.length === 0 ? (
        <p className="text-sm text-muted-foreground">No ownership stakes recorded.</p>
      ) : null}
      {stakes.map((stake, index) => {
        const targetType = targetTypes[index] ?? "entity";
        return (
          <div key={index} className="grid gap-4 rounded-lg border p-4 md:grid-cols-2">
            <div className="flex items-center justify-between md:col-span-2">
              <p className="text-sm font-medium">Stake {index + 1}</p>
              <Button type="button" variant="ghost" size="sm" onClick={() => removeStake(index)}>
                Remove
              </Button>
            </div>
            <div className="space-y-2">
              <Label>Target Type</Label>
              <Select
                value={targetType}
                onValueChange={(value) => {
                  setTargetTypes((current) =>
                    current.map((t, i) => (i === index ? (value as TargetType) : t)),
                  );
                  updateStake(index, setTarget(stake, value as TargetType, ""));
                }}
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
                value={getTargetId(stake, targetType)}
                onValueChange={(value) => updateStake(index, setTarget(stake, targetType, value))}
              >
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {(targetType === "entity" ? linkOptions.entities :
                    targetType === "asset" ? linkOptions.assets :
                    targetType === "land" ? linkOptions.lands :
                    targetType === "company" ? linkOptions.companies :
                    targetType === "property" ? linkOptions.properties :
                    linkOptions.vehicles
                  ).map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Stake Type</Label>
              <Select
                value={stake.stakeType ?? "ECONOMIC"}
                onValueChange={(value) => updateStake(index, { ...stake, stakeType: value })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(FAMILY_OWNERSHIP_STAKE_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Ownership %</Label>
              <Input
                value={stake.ownershipPct ?? ""}
                onChange={(e) => updateStake(index, { ...stake, ownershipPct: e.target.value })}
                placeholder="e.g. 50"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Role Label</Label>
              <Input
                value={stake.roleLabel ?? ""}
                onChange={(e) => updateStake(index, { ...stake, roleLabel: e.target.value })}
                placeholder="e.g. Shareholder"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Notes</Label>
              <Textarea
                value={stake.notes ?? ""}
                onChange={(e) => updateStake(index, { ...stake, notes: e.target.value })}
                rows={2}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
