"use client";

import { useState, useTransition } from "react";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { updateDirectoryContact } from "@/lib/actions/contacts";
import { DirectoryContactFields } from "@/components/contacts/directory-contact-fields";
import { DIRECTORY_CONTACT_TYPE_LABELS } from "@/lib/labels";
import { formatDateInput } from "@/lib/format";
import { formatTags } from "@/lib/contacts/helpers";
import type { DirectoryContactDetail } from "@/lib/actions/contacts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EntitySelect, type EntityOption } from "@/components/platform/entity-select";

export function EditContactForm({
  contact,
  entities,
}: {
  contact: DirectoryContactDetail;
  entities: EntityOption[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [entityId, setEntityId] = useState(contact.entityId ?? "none");
  const [contactType, setContactType] = useState<string>(contact.contactType);
  const [isActive, setIsActive] = useState(contact.isActive);

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
        await updateDirectoryContact(contact.id, formData);
      } catch (err) {
        if (isRedirectError(err)) throw err;
        setError(err instanceof Error ? err.message : "Failed to update contact.");
      }
    });
  }

  const tags = formatTags(contact.tags).join(", ");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit {contact.fullName}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input id="fullName" name="fullName" required defaultValue={contact.fullName} />
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
            <Input id="organization" name="organization" defaultValue={contact.organization ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="jobTitle">Job Title</Label>
            <Input id="jobTitle" name="jobTitle" defaultValue={contact.jobTitle ?? ""} />
          </div>

          <DirectoryContactFields
            initialEmails={contact.emails.map((row) => ({
              email: row.email,
              label: row.label ?? undefined,
            }))}
            initialPhones={contact.phones.map((row) => ({
              countryCode: row.countryCode,
              phone: row.phone,
              label: row.label ?? undefined,
            }))}
            legacyEmail={contact.email}
            legacyPrimaryPhone={contact.phonePrimary}
            legacySecondaryPhone={contact.phoneSecondary}
          />

          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input id="website" name="website" defaultValue={contact.website ?? ""} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="address">Address</Label>
            <Input id="address" name="address" defaultValue={contact.address ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input id="city" name="city" defaultValue={contact.city ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Input id="country" name="country" defaultValue={contact.country ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastContactDate">Last Contact Date</Label>
            <Input
              id="lastContactDate"
              name="lastContactDate"
              type="date"
              defaultValue={formatDateInput(contact.lastContactDate)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nextFollowUpDate">Next Follow-up Date</Label>
            <Input
              id="nextFollowUpDate"
              name="nextFollowUpDate"
              type="date"
              defaultValue={formatDateInput(contact.nextFollowUpDate)}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="tags">Tags</Label>
            <Input id="tags" name="tags" defaultValue={tags} placeholder="Comma-separated tags" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={3} defaultValue={contact.notes ?? ""} />
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
              {pending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
