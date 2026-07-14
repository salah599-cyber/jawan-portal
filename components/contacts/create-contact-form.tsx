"use client";

import { useState, useTransition } from "react";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { createDirectoryContact } from "@/lib/actions/contacts";
import { DirectoryContactFields } from "@/components/contacts/directory-contact-fields";
import { DIRECTORY_CONTACT_TYPE_LABELS } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EntitySelect, type EntityOption } from "@/components/platform/entity-select";

export function CreateContactForm({ entities }: { entities: EntityOption[] }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [entityId, setEntityId] = useState("none");
  const [contactType, setContactType] = useState("OTHER");
  const [isActive, setIsActive] = useState(true);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set("entityId", entityId === "none" ? "" : entityId);
    formData.set("contactType", contactType);
    formData.set("isActive", isActive ? "true" : "false");
    const emailsInput = form.querySelector<HTMLInputElement>('input[name="emailsJson"]');
    const phonesInput = form.querySelector<HTMLInputElement>('input[name="phonesJson"]');
    if (emailsInput) formData.set("emailsJson", emailsInput.value);
    if (phonesInput) formData.set("phonesJson", phonesInput.value);

    startTransition(async () => {
      try {
        await createDirectoryContact(formData);
      } catch (err) {
        if (isRedirectError(err)) throw err;
        setError(err instanceof Error ? err.message : "Failed to create contact.");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Contact</CardTitle>
        <CardDescription>
          Register bankers, lawyers, fund managers, brokers, and other external parties.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input id="fullName" name="fullName" required placeholder="Contact name" />
          </div>
          <div className="space-y-2">
            <Label>Contact Type</Label>
            <Select value={contactType} onValueChange={setContactType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(DIRECTORY_CONTACT_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Entity (optional)</Label>
            <EntitySelect
              entities={entities}
              value={entityId}
              onValueChange={setEntityId}
              allowNone
              noneLabel="Global (no entity)"
              allowAdd={false}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="organization">Organization</Label>
            <Input id="organization" name="organization" placeholder="Company or firm" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="jobTitle">Job Title</Label>
            <Input id="jobTitle" name="jobTitle" placeholder="Role or title" />
          </div>

          <DirectoryContactFields />

          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input id="website" name="website" placeholder="https://..." />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="address">Address</Label>
            <Input id="address" name="address" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input id="city" name="city" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Input id="country" name="country" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastContactDate">Last Contact Date</Label>
            <Input id="lastContactDate" name="lastContactDate" type="date" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nextFollowUpDate">Next Follow-up Date</Label>
            <Input id="nextFollowUpDate" name="nextFollowUpDate" type="date" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="tags">Tags</Label>
            <Input id="tags" name="tags" placeholder="Comma-separated tags" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={3} />
          </div>
          <div className="flex items-center gap-2 md:col-span-2">
            <input
              id="isActive"
              type="checkbox"
              className="size-4"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            <Label htmlFor="isActive">Active contact</Label>
          </div>
          {error ? <p className="text-sm text-destructive md:col-span-2">{error}</p> : null}
          <div className="md:col-span-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : "Create Contact"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
