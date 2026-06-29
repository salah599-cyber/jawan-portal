"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createAsset } from "@/lib/actions/assets";
import {
  ASSET_CATEGORY_LABELS,
  ASSET_STATUS_LABELS,
} from "@/lib/labels";
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

type EntityOption = { id: string; name: string };

export function CreateAssetForm({ entities }: { entities: EntityOption[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState("REAL_ESTATE");
  const [status, setStatus] = useState("ACTIVE");
  const [entityId, setEntityId] = useState(entities[0]?.id ?? "");
  const [currency, setCurrency] = useState("OMR");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        await createAsset({
          name: String(form.get("name") ?? ""),
          category: category as never,
          entityId: entityId || String(form.get("entityId") ?? ""),
          status: status as never,
          currency,
          acquisitionCost: String(form.get("acquisitionCost") ?? ""),
          currentValue: String(form.get("currentValue") ?? ""),
          description: String(form.get("description") ?? ""),
          managerName: String(form.get("managerName") ?? ""),
          managerEmail: String(form.get("managerEmail") ?? ""),
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
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ASSET_CATEGORY_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Entity</Label>
            <Select value={entityId} onValueChange={setEntityId}>
              <SelectTrigger>
                <SelectValue placeholder="Select entity" />
              </SelectTrigger>
              <SelectContent>
                {entities.map((entity) => (
                  <SelectItem key={entity.id} value={entity.id}>
                    {entity.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ASSET_STATUS_LABELS).map(([value, label]) => (
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

          <div className="space-y-2">
            <Label htmlFor="acquisitionCost">Acquisition Cost</Label>
            <Input id="acquisitionCost" name="acquisitionCost" type="number" step="0.01" min="0" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="currentValue">Current Value</Label>
            <Input id="currentValue" name="currentValue" type="number" step="0.01" min="0" />
          </div>

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
