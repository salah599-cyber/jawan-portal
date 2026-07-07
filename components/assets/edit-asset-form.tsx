"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateAsset, type CreateAssetInput } from "@/lib/actions/assets";
import { getAssetCategoryLabel } from "@/lib/assets/category-display";
import {
  PRECIOUS_METAL_PRICE_BASIS_LABELS,
  PRECIOUS_METAL_UNIT_LABELS,
} from "@/lib/assets/precious-metals/constants";
import { EDITABLE_ASSET_STATUS_ENTRIES } from "@/lib/labels";
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
import {
  EMPTY_PRECIOUS_METAL_FORM,
  PreciousMetalFields,
} from "@/components/assets/precious-metal-fields";
import type {
  PreciousMetalPriceBasis,
  PreciousMetalType,
  PreciousMetalUnit,
} from "@/lib/generated/prisma/client";

type AssetRecord = {
  id: string;
  name: string;
  category: string;
  assetType?: { name: string } | null;
  preciousMetal?: {
    metal: PreciousMetalType;
    unit: PreciousMetalUnit;
    quantity: { toString(): string };
    priceBasis: PreciousMetalPriceBasis;
    lastUnitPrice: { toString(): string } | null;
    priceFetchedAt: Date | null;
    priceSource: string | null;
  } | null;
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
  const [preciousMetal, setPreciousMetal] = useState(
    asset.preciousMetal
      ? {
          metal: asset.preciousMetal.metal,
          unit: asset.preciousMetal.unit,
          quantity: asset.preciousMetal.quantity.toString(),
          priceBasis: asset.preciousMetal.priceBasis,
        }
      : EMPTY_PRECIOUS_METAL_FORM,
  );

  const isPreciousMetal = asset.category === "PRECIOUS_METALS";

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
      currentValue: isPreciousMetal ? undefined : String(form.get("currentValue") ?? ""),
      description: String(form.get("description") ?? ""),
      managerName: String(form.get("managerName") ?? ""),
      managerEmail: String(form.get("managerEmail") ?? ""),
      preciousMetal: isPreciousMetal ? preciousMetal : undefined,
    };

    startTransition(async () => {
      try {
        await updateAsset(asset.id, input);
        router.push("/assets/" + asset.id);
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
            <Input value={getAssetCategoryLabel(asset)} disabled className="bg-muted" />
          </div>

          <div className="space-y-2">
            <Label>Entity</Label>
            <EntitySelect entities={entities} value={entityId} onValueChange={setEntityId} />
          </div>

          {isPreciousMetal ? (
            <PreciousMetalFields value={preciousMetal} onChange={setPreciousMetal} />
          ) : null}

          <div className="space-y-2">
            <Label>Status</Label>
            {asset.status === "EXITED" ? (
              <Input value="Exited" disabled className="bg-muted" />
            ) : (
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EDITABLE_ASSET_STATUS_ENTRIES.map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label>Currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["OMR", "USD", "EUR", "GBP", "AED"].map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isPreciousMetal ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="acquisitionDate">Acquisition Date</Label>
                <Input
                  id="acquisitionDate"
                  name="acquisitionDate"
                  type="date"
                  defaultValue={formatDateInput(asset.acquisitionDate)}
                  className="w-full max-w-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="acquisitionCost">Acquisition Cost</Label>
                <Input
                  id="acquisitionCost"
                  name="acquisitionCost"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={formatDecimalInput(asset.acquisitionCost)}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Current Value</Label>
                <p className="text-sm text-muted-foreground">
                  {formatDecimalInput(asset.currentValue)} {asset.currency} — refreshed from live
                  prices on save.
                </p>
                {asset.preciousMetal?.lastUnitPrice ? (
                  <p className="text-xs text-muted-foreground">
                    Last unit price: {formatDecimalInput(asset.preciousMetal.lastUnitPrice)}{" "}
                    {asset.currency} per {PRECIOUS_METAL_UNIT_LABELS[asset.preciousMetal.unit]} (
                    {PRECIOUS_METAL_PRICE_BASIS_LABELS[asset.preciousMetal.priceBasis]})
                  </p>
                ) : null}
              </div>
            </>
          ) : (
            <AssetAcquisitionFields
              acquisitionDateDefault={formatDateInput(asset.acquisitionDate)}
              acquisitionCostDefault={formatDecimalInput(asset.acquisitionCost)}
              currentValueDefault={formatDecimalInput(asset.currentValue)}
            />
          )}

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              rows={3}
              defaultValue={asset.description ?? ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="managerName">Manager Name</Label>
            <Input id="managerName" name="managerName" defaultValue={asset.managerName ?? ""} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="managerEmail">Manager Email</Label>
            <Input
              id="managerEmail"
              name="managerEmail"
              type="email"
              defaultValue={asset.managerEmail ?? ""}
            />
          </div>

          {error ? <p className="text-sm text-destructive md:col-span-2">{error}</p> : null}

          <div className="flex gap-2 md:col-span-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : "Save Changes"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
