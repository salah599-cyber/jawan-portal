"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateAsset, type CreateAssetInput } from "@/lib/actions/assets";
import { ASSET_CATEGORY_LABELS, EDITABLE_ASSET_STATUS_ENTRIES } from "@/lib/labels";
import { formatDecimalInput, formatDateInput } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EntitySelect, type EntityOption } from "@/components/platform/entity-select";
import { AssetAcquisitionFields } from "@/components/assets/asset-acquisition-fields";

type AssetRecord = {
  id: string;
  name: string;
  category: string;
  status: string;
  entityId: string;
  currency: string;
  acquisitionDate: Date | null;
  acquisitionCost: { toString(): string } | null;
  currentValue: { toString(): string } | null;
  description: string | null;
  managerName: string | null;
  managerEmail: string | null;
};

export function EditAssetForm({
  asset,
  entities,
}: {
  asset: AssetRecord;
  entities: EntityOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState(asset.status);
  const [entityId, setEntityId] = useState(asset.entityId);
  const [currency, setCurrency] = useState(asset.currency);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);

    const input: CreateAssetInput = {
      name: String(form.get("name") ?? ""),
      category: asset.category as CreateAssetInput["category"],
      entityId: entityId || String(form.get("entityId") ?? ""),
      status: status as CreateAssetInput["status"],
      currency,
      acquisitionDate: String(form.get("acquisitionDate") ?? ""),
      acquisitionCost: String(form.get("acquisitionCost") ?? ""),
      currentValue: String(form.get("currentValue") ?? ""),
      description: String(form.get("description") ?? ""),
      managerName: String(form.get("managerName") ?? ""),
      managerEmail: String(form.get("managerEmail") ?? ""),
    };

    startTransition(async () => {
      try {
        await updateAsset(asset.id, input);
        router.push("/assets");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update asset.");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Asset</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required defaultValue={asset.name} />
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Input
              value={ASSET_CATEGORY_LABELS[asset.category] ?? asset.category}
              disabled
              className="bg-muted"
            />
          </div>

          <div className="space-y-2">
            <Label>Entity</Label>
            <EntitySelect entities={entities} value={entityId} onValueChange={setEntityId} />
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            {asset.status === "EXITED" ? (
              <Input value="Exited" disabled className="bg-muted" />
            ) : (
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EDITABLE_ASSET_STATUS_ENTRIES.map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label>Currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["OMR", "USD", "EUR", "GBP", "AED"].map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <AssetAcquisitionFields
            acquisitionDateDefault={formatDateInput(asset.acquisitionDate)}
            acquisitionCostDefault={formatDecimalInput(asset.acquisitionCost)}
            currentValueDefault={formatDecimalInput(asset.currentValue)}
          />

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" rows={3} defaultValue={asset.description ?? ""} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="managerName">Manager Name</Label>
            <Input id="managerName" name="managerName" defaultValue={asset.managerName ?? ""} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="managerEmail">Manager Email</Label>
            <Input id="managerEmail" name="managerEmail" type="email" defaultValue={asset.managerEmail ?? ""} />
          </div>

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
