"use client";

import { useLayoutEffect, useRef, useState } from "react";
import {
  CONTACT_EMAIL_LABEL_PRESETS,
  CONTACT_PHONE_LABEL_PRESETS,
  CUSTOM_CONTACT_LABEL,
  isPresetLabel,
} from "@/lib/contacts/contact-labels";
import {
  DEFAULT_PHONE_COUNTRY_CODE,
  PHONE_COUNTRY_CODES,
} from "@/lib/contacts/phone-country-codes";
import { parseLegacyPhone } from "@/lib/contacts/phone-helpers";
import type { ContactEmailInput, ContactPhoneInput } from "@/lib/contacts/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const emptyEmail = (): ContactEmailInput => ({ email: "", label: CONTACT_EMAIL_LABEL_PRESETS[0] });
const emptyPhone = (): ContactPhoneInput => ({
  countryCode: DEFAULT_PHONE_COUNTRY_CODE,
  phone: "",
  label: CONTACT_PHONE_LABEL_PRESETS[0],
});

function buildInitialEmails(
  emails: ContactEmailInput[],
  legacyEmail: string | null | undefined,
): ContactEmailInput[] {
  if (emails.length > 0) return emails;
  if (legacyEmail?.trim()) return [{ email: legacyEmail, label: "Primary" }];
  return [emptyEmail()];
}

function buildInitialPhones(
  phones: ContactPhoneInput[],
  legacyPrimary: string | null | undefined,
  legacySecondary: string | null | undefined,
): ContactPhoneInput[] {
  if (phones.length > 0) return phones;

  const rows: ContactPhoneInput[] = [];
  if (legacyPrimary?.trim()) {
    rows.push({ ...parseLegacyPhone(legacyPrimary), label: "Primary" });
  }
  if (legacySecondary?.trim()) {
    rows.push({ ...parseLegacyPhone(legacySecondary), label: "Secondary" });
  }
  return rows.length > 0 ? rows : [emptyPhone()];
}

function LabelSelect({
  value,
  presets,
  onChange,
}: {
  value?: string;
  presets: readonly string[];
  onChange: (label: string) => void;
}) {
  const selectValue = isPresetLabel(value, presets)
    ? value!
    : value?.trim()
      ? CUSTOM_CONTACT_LABEL
      : presets[0] ?? CUSTOM_CONTACT_LABEL;

  return (
    <div className="space-y-2">
      <Label>Label</Label>
      <Select
        value={selectValue}
        onValueChange={(next) => {
          if (next === CUSTOM_CONTACT_LABEL) {
            onChange("");
            return;
          }
          onChange(next);
        }}
      >
        <SelectTrigger><SelectValue placeholder="Select label" /></SelectTrigger>
        <SelectContent>
          {presets.map((preset) => (
            <SelectItem key={preset} value={preset}>{preset}</SelectItem>
          ))}
          <SelectItem value={CUSTOM_CONTACT_LABEL}>Custom</SelectItem>
        </SelectContent>
      </Select>
      {selectValue === CUSTOM_CONTACT_LABEL ? (
        <Input
          value={isPresetLabel(value, presets) ? "" : (value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter custom label"
        />
      ) : null}
    </div>
  );
}

export function serializeContactChannelsJson(
  emails: ContactEmailInput[],
  phones: ContactPhoneInput[],
): { emailsJson: string; phonesJson: string } {
  return {
    emailsJson: JSON.stringify(
      emails
        .filter((row) => row.email.trim())
        .map((row) => ({
          email: row.email.trim(),
          label: row.label?.trim() || undefined,
        })),
    ),
    phonesJson: JSON.stringify(
      phones
        .filter((row) => row.phone.trim())
        .map((row) => ({
          countryCode: row.countryCode?.trim() || DEFAULT_PHONE_COUNTRY_CODE,
          phone: row.phone.trim(),
          label: row.label?.trim() || undefined,
        })),
    ),
  };
}

export function DirectoryContactFields({
  initialEmails = [],
  initialPhones = [],
  legacyEmail,
  legacyPrimaryPhone,
  legacySecondaryPhone,
  emailsJsonName = "emailsJson",
  phonesJsonName = "phonesJson",
}: {
  initialEmails?: ContactEmailInput[];
  initialPhones?: ContactPhoneInput[];
  legacyEmail?: string | null;
  legacyPrimaryPhone?: string | null;
  legacySecondaryPhone?: string | null;
  emailsJsonName?: string;
  phonesJsonName?: string;
}) {
  const emailsHiddenRef = useRef<HTMLInputElement>(null);
  const phonesHiddenRef = useRef<HTMLInputElement>(null);
  const [emails, setEmails] = useState<ContactEmailInput[]>(() =>
    buildInitialEmails(initialEmails, legacyEmail),
  );
  const [phones, setPhones] = useState<ContactPhoneInput[]>(() =>
    buildInitialPhones(initialPhones, legacyPrimaryPhone, legacySecondaryPhone),
  );

  const { emailsJson, phonesJson } = serializeContactChannelsJson(emails, phones);

  useLayoutEffect(() => {
    if (emailsHiddenRef.current) emailsHiddenRef.current.value = emailsJson;
    if (phonesHiddenRef.current) phonesHiddenRef.current.value = phonesJson;
  }, [emailsJson, phonesJson]);

  return (
    <div className="md:col-span-2 space-y-6">
      <input ref={emailsHiddenRef} type="hidden" name={emailsJsonName} defaultValue={emailsJson} />
      <input ref={phonesHiddenRef} type="hidden" name={phonesJsonName} defaultValue={phonesJson} />

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-medium text-muted-foreground">Email Addresses</p>
          <Button type="button" variant="outline" size="sm" onClick={() => setEmails((rows) => [...rows, emptyEmail()])}>
            Add email
          </Button>
        </div>
        {emails.map((row, index) => (
          <div key={`email-${index}`} className="grid gap-3 rounded-lg border p-4 md:grid-cols-[1fr_180px_auto]">
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
            <LabelSelect
              value={row.label}
              presets={CONTACT_EMAIL_LABEL_PRESETS}
              onChange={(label) =>
                setEmails((rows) =>
                  rows.map((item, i) => (i === index ? { ...item, label } : item)),
                )
              }
            />
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
          <div key={`phone-${index}`} className="grid gap-3 rounded-lg border p-4 md:grid-cols-[140px_1fr_180px_auto]">
            <div className="space-y-2">
              <Label>Country Code</Label>
              <Select
                value={row.countryCode || DEFAULT_PHONE_COUNTRY_CODE}
                onValueChange={(countryCode) =>
                  setPhones((rows) =>
                    rows.map((item, i) => (i === index ? { ...item, countryCode } : item)),
                  )
                }
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PHONE_COUNTRY_CODES.map((option) => (
                    <SelectItem key={option.iso2} value={option.dialCode}>
                      {option.dialCode} {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input
                value={row.phone}
                onChange={(e) =>
                  setPhones((rows) =>
                    rows.map((item, i) => (i === index ? { ...item, phone: e.target.value } : item)),
                  )
                }
                placeholder="9123 4567"
              />
            </div>
            <LabelSelect
              value={row.label}
              presets={CONTACT_PHONE_LABEL_PRESETS}
              onChange={(label) =>
                setPhones((rows) =>
                  rows.map((item, i) => (i === index ? { ...item, label } : item)),
                )
              }
            />
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
