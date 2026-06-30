"use client";

import { useState } from "react";
import type { CompanyOwnerInput } from "@/lib/actions/companies";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const emptyOwner = (): CompanyOwnerInput => ({
  name: "",
  ownershipPct: "",
  email: "",
  phone: "",
  address: "",
  notes: "",
});

export function CompanyOwnersFields({
  initialOwners = [],
  ownersJsonName = "ownersJson",
}: {
  initialOwners?: CompanyOwnerInput[];
  ownersJsonName?: string;
}) {
  const [owners, setOwners] = useState<CompanyOwnerInput[]>(
    initialOwners.length > 0 ? initialOwners : [emptyOwner()],
  );

  function updateOwner(index: number, field: keyof CompanyOwnerInput, value: string) {
    setOwners((current) =>
      current.map((owner, i) => (i === index ? { ...owner, [field]: value } : owner)),
    );
  }

  function addOwner() {
    setOwners((current) => [...current, emptyOwner()]);
  }

  function removeOwner(index: number) {
    setOwners((current) => (current.length <= 1 ? current : current.filter((_, i) => i !== index)));
  }

  const serialized = JSON.stringify(
    owners.filter((owner) => owner.name.trim().length > 0),
  );

  return (
    <div className="md:col-span-2 space-y-4">
      <input type="hidden" name={ownersJsonName} value={serialized} readOnly />
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-medium text-muted-foreground">Owners</p>
        <Button type="button" variant="outline" size="sm" onClick={addOwner}>
          Add owner
        </Button>
      </div>
      {owners.map((owner, index) => (
        <div key={index} className="grid gap-4 rounded-lg border p-4 md:grid-cols-2">
          <div className="flex items-center justify-between md:col-span-2">
            <p className="text-sm font-medium">Owner {index + 1}</p>
            {owners.length > 1 ? (
              <Button type="button" variant="ghost" size="sm" onClick={() => removeOwner(index)}>
                Remove
              </Button>
            ) : null}
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor={"owner-name-" + index}>Name</Label>
            <Input
              id={"owner-name-" + index}
              value={owner.name}
              onChange={(e) => updateOwner(index, "name", e.target.value)}
              placeholder="Owner full name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={"owner-pct-" + index}>Ownership %</Label>
            <Input
              id={"owner-pct-" + index}
              value={owner.ownershipPct ?? ""}
              onChange={(e) => updateOwner(index, "ownershipPct", e.target.value)}
              placeholder="e.g. 50"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={"owner-email-" + index}>Email</Label>
            <Input
              id={"owner-email-" + index}
              type="email"
              value={owner.email ?? ""}
              onChange={(e) => updateOwner(index, "email", e.target.value)}
              placeholder="owner@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={"owner-phone-" + index}>Phone</Label>
            <Input
              id={"owner-phone-" + index}
              value={owner.phone ?? ""}
              onChange={(e) => updateOwner(index, "phone", e.target.value)}
              placeholder="+968 ..."
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor={"owner-address-" + index}>Address</Label>
            <Input
              id={"owner-address-" + index}
              value={owner.address ?? ""}
              onChange={(e) => updateOwner(index, "address", e.target.value)}
              placeholder="Address"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor={"owner-notes-" + index}>Notes</Label>
            <Textarea
              id={"owner-notes-" + index}
              value={owner.notes ?? ""}
              onChange={(e) => updateOwner(index, "notes", e.target.value)}
              rows={2}
              placeholder="Optional notes"
            />
          </div>
        </div>
      ))}
    </div>
  );
}
