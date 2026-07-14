"use client";

import { useState } from "react";
import type { FamilyEmailInput, FamilyPhoneInput } from "@/lib/family/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const emptyEmail = (): FamilyEmailInput => ({ email: "", label: "" });
const emptyPhone = (): FamilyPhoneInput => ({ phone: "", label: "" });

function buildInitialEmails(
  emails: FamilyEmailInput[],
  legacyEmail: string | null | undefined,
): FamilyEmailInput[] {
  if (emails.length > 0) return emails;
  if (legacyEmail?.trim()) return [{ email: legacyEmail, label: "Primary" }];
  return [emptyEmail()];
}

function buildInitialPhones(
  phones: FamilyPhoneInput[],
  legacyPrimary: string | null | undefined,
  legacySecondary: string | null | undefined,
): FamilyPhoneInput[] {
  if (phones.length > 0) return phones;

  const rows: FamilyPhoneInput[] = [];
  if (legacyPrimary?.trim()) rows.push({ phone: legacyPrimary, label: "Primary" });
  if (legacySecondary?.trim()) rows.push({ phone: legacySecondary, label: "Secondary" });
  return rows.length > 0 ? rows : [emptyPhone()];
}

export function FamilyContactFields({
  initialEmails = [],
  initialPhones = [],
  legacyEmail,
  legacyPrimaryPhone,
  legacySecondaryPhone,
  emailsJsonName = "emailsJson",
  phonesJsonName = "phonesJson",
}: {
  initialEmails?: FamilyEmailInput[];
  initialPhones?: FamilyPhoneInput[];
  legacyEmail?: string | null;
  legacyPrimaryPhone?: string | null;
  legacySecondaryPhone?: string | null;
  emailsJsonName?: string;
  phonesJsonName?: string;
}) {
  const [emails, setEmails] = useState<FamilyEmailInput[]>(() =>
    buildInitialEmails(initialEmails, legacyEmail),
  );
  const [phones, setPhones] = useState<FamilyPhoneInput[]>(() =>
    buildInitialPhones(initialPhones, legacyPrimaryPhone, legacySecondaryPhone),
  );

  const serializedEmails = JSON.stringify(
    emails.filter((row) => row.email.trim()).map((row) => ({
      email: row.email.trim(),
      label: row.label?.trim() || undefined,
    })),
  );
  const serializedPhones = JSON.stringify(
    phones.filter((row) => row.phone.trim()).map((row) => ({
      phone: row.phone.trim(),
      label: row.label?.trim() || undefined,
    })),
  );

  return (
    <div className="md:col-span-2 space-y-6">
      <input type="hidden" name={emailsJsonName} value={serializedEmails} readOnly />
      <input type="hidden" name={phonesJsonName} value={serializedPhones} readOnly />

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-medium text-muted-foreground">Email Addresses</p>
          <Button type="button" variant="outline" size="sm" onClick={() => setEmails((rows) => [...rows, emptyEmail()])}>
            Add email
          </Button>
        </div>
        {emails.map((row, index) => (
          <div key={`email-${index}`} className="grid gap-3 rounded-lg border p-4 md:grid-cols-[1fr_160px_auto]">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={row.email}
                onChange={(e) =>
                  setEmails((rows) =>
                    rows.map((item, i) => (i === index ? { ...item, email: e.target.value } : item)),
                  )
                }
                placeholder="name@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Label</Label>
              <Input
                value={row.label ?? ""}
                onChange={(e) =>
                  setEmails((rows) =>
                    rows.map((item, i) => (i === index ? { ...item, label: e.target.value } : item)),
                  )
                }
                placeholder="Personal, work…"
              />
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={emails.length === 1}
                onClick={() => setEmails((rows) => rows.filter((_, i) => i !== index))}
              >
                Remove
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-medium text-muted-foreground">Phone Numbers</p>
          <Button type="button" variant="outline" size="sm" onClick={() => setPhones((rows) => [...rows, emptyPhone()])}>
            Add phone
          </Button>
        </div>
        {phones.map((row, index) => (
          <div key={`phone-${index}`} className="grid gap-3 rounded-lg border p-4 md:grid-cols-[1fr_160px_auto]">
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={row.phone}
                onChange={(e) =>
                  setPhones((rows) =>
                    rows.map((item, i) => (i === index ? { ...item, phone: e.target.value } : item)),
                  )
                }
                placeholder="+968 …"
              />
            </div>
            <div className="space-y-2">
              <Label>Label</Label>
              <Input
                value={row.label ?? ""}
                onChange={(e) =>
                  setPhones((rows) =>
                    rows.map((item, i) => (i === index ? { ...item, label: e.target.value } : item)),
                  )
                }
                placeholder="Mobile, office…"
              />
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={phones.length === 1}
                onClick={() => setPhones((rows) => rows.filter((_, i) => i !== index))}
              >
                Remove
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
