"use client";

import { useState } from "react";
import type { LandRegisteredHolderInput } from "@/lib/actions/lands";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const emptyHolder = (): LandRegisteredHolderInput => ({
  name: "",
  ownershipPct: "",
  email: "",
  phone: "",
  notes: "",
});

export function LandRegisteredHoldersFields({
  initialHolders = [],
  holdersJsonName = "holdersJson",
}: {
  initialHolders?: LandRegisteredHolderInput[];
  holdersJsonName?: string;
}) {
  const [holders, setHolders] = useState<LandRegisteredHolderInput[]>(
    initialHolders.length > 0 ? initialHolders : [emptyHolder()],
  );

  function updateHolder(index: number, field: keyof LandRegisteredHolderInput, value: string) {
    setHolders((current) =>
      current.map((holder, i) => (i === index ? { ...holder, [field]: value } : holder)),
    );
  }

  function addHolder() {
    setHolders((current) => [...current, emptyHolder()]);
  }

  function removeHolder(index: number) {
    setHolders((current) => (current.length <= 1 ? current : current.filter((_, i) => i !== index)));
  }

  const serialized = JSON.stringify(holders.filter((holder) => holder.name.trim().length > 0));

  return (
    <div className="md:col-span-2 space-y-4">
      <input type="hidden" name={holdersJsonName} value={serialized} readOnly />
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Registered holders</p>
          <p className="text-xs text-muted-foreground">
            Names on the Krooki or title deed. Add one row per holder.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addHolder}>
          Add holder
        </Button>
      </div>
      {holders.map((holder, index) => (
        <div key={index} className="grid gap-4 rounded-lg border p-4 md:grid-cols-2">
          <div className="flex items-center justify-between md:col-span-2">
            <p className="text-sm font-medium">Holder {index + 1}</p>
            {holders.length > 1 ? (
              <Button type="button" variant="ghost" size="sm" onClick={() => removeHolder(index)}>
                Remove
              </Button>
            ) : null}
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor={"land-holder-name-" + index}>Name</Label>
            <Input
              id={"land-holder-name-" + index}
              value={holder.name}
              onChange={(e) => updateHolder(index, "name", e.target.value)}
              placeholder="Registered holder name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={"land-holder-pct-" + index}>Title share %</Label>
            <Input
              id={"land-holder-pct-" + index}
              value={holder.ownershipPct ?? ""}
              onChange={(e) => updateHolder(index, "ownershipPct", e.target.value)}
              placeholder="e.g. 50"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={"land-holder-email-" + index}>Email</Label>
            <Input
              id={"land-holder-email-" + index}
              type="email"
              value={holder.email ?? ""}
              onChange={(e) => updateHolder(index, "email", e.target.value)}
              placeholder="holder@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={"land-holder-phone-" + index}>Phone</Label>
            <Input
              id={"land-holder-phone-" + index}
              value={holder.phone ?? ""}
              onChange={(e) => updateHolder(index, "phone", e.target.value)}
              placeholder="+968 ..."
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor={"land-holder-notes-" + index}>Notes</Label>
            <Textarea
              id={"land-holder-notes-" + index}
              value={holder.notes ?? ""}
              onChange={(e) => updateHolder(index, "notes", e.target.value)}
              rows={2}
              placeholder="Optional notes"
            />
          </div>
        </div>
      ))}
    </div>
  );
}
