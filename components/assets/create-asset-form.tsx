"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createAsset } from "@/lib/actions/assets";
import { encodeBuiltInAssetCategory } from "@/lib/assets/category-display";
import { EDITABLE_ASSET_STATUS_ENTRIES } from "@/lib/labels";
import { AssetCategorySelect, type CustomAssetTypeOption } from "@/components/assets/asset-category-select";
import {
  EMPTY_PRECIOUS_METAL_FORM,
  PreciousMetalFields,
  isPreciousMetalsSelection,
} from "@/components/assets/precious-metal-fields";
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
import { EntitySelect } from "@/components/platform/entity-select";

export function CreateAssetForm({
  entities,
  customTypes,
}: {
  entities: { id: string; name: string }[];
  customTypes: CustomAssetTypeOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [categorySelection, setCategorySelection] = useState(encodeBuiltInAssetCategory("REAL_ESTATE"));
  const [customTypeOptions, setCustomTypeOptions] = useState(customTypes);
  const [status, setStatus] = useState("ACTIVE");
  const [entityId, setEntityId] = useState(entities[0]?.id ?? "");
  const [currency, setCurrency] = useState("OMR");
  const [preciousMetal, setPreciousMetal] = useState(EMPTY_PRECIOUS_METAL_FORM);

  const isPreciousMetal = useMemo(
    () => isPreciousMetalsSelection(categorySelection),
    [categorySelection],
  );

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        await createAsset({
          name: String(form.get("name") ?? ""),
          categorySelection,
          entityId: entityId || String(form.get("entityId") ?? ""),
          status: status as never,
          currency,
          acquisitionDate: String(form.get("acquisitionDate") ?? ""),
          acquisitionCost: String(form.get("acquisitionCost") ?? ""),
          currentValue: isPreciousMetal ? undefined : String(form.get("currentValue") ?? ""),
          description: String(form.get("description") ?? ""),
          managerName: String(form.get("managerName") ?? ""),
          managerEmail: String(form.get("managerEmail") ?? ""),
          preciousMetal: isPreciousMetal ? preciousMetal : undefined,
        });
        router.push("/assets");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create asset.");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>New Asset</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required placeholder="Asset name" />
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <AssetCategorySelect
              customTypes={customTypeOptions}
              value={categorySelection}
              onValueChange={setCategorySelection}
              onTypeAdded={(type) => setCustomTypeOptions((current) => [...current, type])}
            />
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
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {EDITABLE_ASSET_STATUS_ENTRIES.map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger>
                <SelectValue placeholder="Select currency" />
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

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="acquisitionDate">Acquisition Date</Label>
            <Input
              id="acquisitionDate"
              name="acquisitionDate"
              type="date"
              className="w-full max-w-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="acquisitionCost">Acquisition Cost</Label>
            <Input id="acquisitionCost" name="acquisitionCost" type="number" step="0.01" min="0" />
          </div>

          {!isPreciousMetal ? (
            <div className="space-y-2">
              <Label htmlFor="currentValue">Current Value</Label>
              <Input id="currentValue" name="currentValue" type="number" step="0.01" min="0" />
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Current Value</Label>
              <p className="text-sm text-muted-foreground">
                Calculated automatically from live gold/silver prices after creation.
              </p>
            </div>
          )}

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" rows={3} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="managerName">Manager Name</Label>
            <Input id="managerName" name="managerName" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="managerEmail">Manager Email</Label>
            <Input id="managerEmail" name="managerEmail" type="email" />
          </div>

          {error ? (
            <p className="text-sm text-destructive md:col-span-2">{error}</p>
          ) : null}

          <div className="flex gap-2 md:col-span-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Creating..." : "Create Asset"}
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
