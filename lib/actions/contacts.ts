"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { ensureContactsSchema } from "@/lib/db/ensure-contacts-schema";
import { logAudit } from "@/lib/audit/log";
import { CONTACTS_PATH } from "@/lib/contacts/constants";
import {
  isFollowUpDueWithinDays,
  isFollowUpOverdue,
  parseDate,
  parseTags,
} from "@/lib/contacts/helpers";
import {
  parseContactEmailsJson,
  parseContactPhonesJson,
} from "@/lib/contacts/parse-json";
import { phonesToLegacyFields } from "@/lib/contacts/phone-helpers";
import { DEFAULT_PHONE_COUNTRY_CODE } from "@/lib/contacts/phone-country-codes";
import type { ContactEmailInput, ContactPhoneInput } from "@/lib/contacts/types";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { contactEntityFilter } from "@/lib/permissions/scoped-queries";
import type { DirectoryContactType, Prisma } from "@/lib/generated/prisma/client";

const contactInclude = {
  entity: { select: { name: true } },
  emails: { orderBy: { sortOrder: "asc" as const } },
  phones: { orderBy: { sortOrder: "asc" as const } },
} as const;

export type DirectoryContactDetail = NonNullable<Awaited<ReturnType<typeof getDirectoryContact>>>;

export type DirectoryContactListRow = {
  id: string;
  fullName: string;
  organization: string | null;
  jobTitle: string | null;
  contactType: string;
  email: string | null;
  phonePrimary: string | null;
  entityId: string | null;
  entityName: string | null;
  nextFollowUpDate: Date | null;
  followUpDue: boolean;
  followUpOverdue: boolean;
  isActive: boolean;
  updatedAt: Date;
};

function revalidateContacts(contactId?: string) {
  revalidatePath(CONTACTS_PATH);
  if (contactId) {
    revalidatePath(`${CONTACTS_PATH}/${contactId}`);
    revalidatePath(`${CONTACTS_PATH}/${contactId}/edit`);
  }
  revalidatePath("/dashboard");
  revalidatePath("/calendar");
  revalidatePath("/reports");
}

function assertEntityAccess(
  ctx: Awaited<ReturnType<typeof requireModuleAccess>>,
  entityId: string | null,
) {
  if (!entityId) return;
  if (ctx.entityIds.length > 0 && !ctx.entityIds.includes(entityId)) {
    if (ctx.role !== "PRINCIPAL" && !ctx.isSuperAdmin) {
      throw new Error("You do not have access to this entity.");
    }
  }
}

function legacyContactFields(emails: ContactEmailInput[], phones: ContactPhoneInput[]) {
  const validEmails = emails.map((row) => row.email.trim()).filter(Boolean);
  const phoneLegacy = phonesToLegacyFields(phones);

  return {
    email: validEmails[0] ?? null,
    phonePrimary: phoneLegacy.phonePrimary,
    phoneSecondary: phoneLegacy.phoneSecondary,
  };
}

async function replaceContactEmails(contactId: string, emails: ContactEmailInput[]) {
  await db.directoryContactEmail.deleteMany({ where: { directoryContactId: contactId } });
  const valid = emails
    .map((row) => ({ email: row.email.trim(), label: row.label?.trim() || null }))
    .filter((row) => row.email);

  if (valid.length === 0) return;

  await db.directoryContactEmail.createMany({
    data: valid.map((row, index) => ({
      directoryContactId: contactId,
      email: row.email,
      label: row.label,
      sortOrder: index,
    })),
  });
}

async function replaceContactPhones(contactId: string, phones: ContactPhoneInput[]) {
  await db.directoryContactPhone.deleteMany({ where: { directoryContactId: contactId } });
  const valid = phones
    .map((row) => ({
      countryCode: row.countryCode?.trim() || DEFAULT_PHONE_COUNTRY_CODE,
      phone: row.phone.trim(),
      label: row.label?.trim() || null,
    }))
    .filter((row) => row.phone);

  if (valid.length === 0) return;

  await db.directoryContactPhone.createMany({
    data: valid.map((row, index) => ({
      directoryContactId: contactId,
      countryCode: row.countryCode,
      phone: row.phone,
      label: row.label,
      sortOrder: index,
    })),
  });
}

async function replaceContactChannels(
  contactId: string,
  emails: ContactEmailInput[],
  phones: ContactPhoneInput[],
) {
  await replaceContactEmails(contactId, emails);
  await replaceContactPhones(contactId, phones);

  await db.directoryContact.update({
    where: { id: contactId },
    data: legacyContactFields(emails, phones),
  });
}

function readContactFormData(formData: FormData) {
  const fullName = String(formData.get("fullName") ?? "").trim();
  if (!fullName) throw new Error("Full name is required.");

  const entityId = String(formData.get("entityId") ?? "").trim() || null;
  const tagsRaw = String(formData.get("tags") ?? "").trim();

  return {
    fullName,
    organization: String(formData.get("organization") ?? "").trim() || null,
    jobTitle: String(formData.get("jobTitle") ?? "").trim() || null,
    contactType: String(formData.get("contactType") ?? "OTHER") as DirectoryContactType,
    address: String(formData.get("address") ?? "").trim() || null,
    city: String(formData.get("city") ?? "").trim() || null,
    country: String(formData.get("country") ?? "").trim() || null,
    website: String(formData.get("website") ?? "").trim() || null,
    entityId,
    notes: String(formData.get("notes") ?? "").trim() || null,
    tags: parseTags(tagsRaw),
    lastContactDate: parseDate(String(formData.get("lastContactDate") ?? "")),
    nextFollowUpDate: parseDate(String(formData.get("nextFollowUpDate") ?? "")),
    isActive: formData.get("isActive") === "on" || formData.get("isActive") === "true",
  };
}

function toContactCreateData(
  data: ReturnType<typeof readContactFormData>,
  emails: ContactEmailInput[],
  phones: ContactPhoneInput[],
): Prisma.DirectoryContactUncheckedCreateInput {
  return {
    fullName: data.fullName,
    organization: data.organization,
    jobTitle: data.jobTitle,
    contactType: data.contactType,
    ...legacyContactFields(emails, phones),
    address: data.address,
    city: data.city,
    country: data.country,
    website: data.website,
    entityId: data.entityId,
    notes: data.notes,
    tags: data.tags,
    lastContactDate: data.lastContactDate,
    nextFollowUpDate: data.nextFollowUpDate,
    isActive: data.isActive,
  };
}

function mapContactRow(
  contact: Prisma.DirectoryContactGetPayload<{
    include: { entity: { select: { name: true } } };
  }>,
): DirectoryContactListRow {
  return {
    id: contact.id,
    fullName: contact.fullName,
    organization: contact.organization,
    jobTitle: contact.jobTitle,
    contactType: contact.contactType,
    email: contact.email,
    phonePrimary: contact.phonePrimary,
    entityId: contact.entityId,
    entityName: contact.entity?.name ?? null,
    nextFollowUpDate: contact.nextFollowUpDate,
    followUpDue:
      contact.isActive && isFollowUpDueWithinDays(contact.nextFollowUpDate, 14),
    followUpOverdue: contact.isActive && isFollowUpOverdue(contact.nextFollowUpDate),
    isActive: contact.isActive,
    updatedAt: contact.updatedAt,
  };
}

export async function listDirectoryContacts(filters?: {
  entityId?: string;
  contactType?: string;
  activeOnly?: boolean;
  followUpDue?: boolean;
}): Promise<DirectoryContactListRow[]> {
  const ctx = await requireModuleAccess("CONTACTS");
  await ensureContactsSchema();

  const entityFilter =
    filters?.entityId === "__global__"
      ? { entityId: null }
      : filters?.entityId
        ? { entityId: filters.entityId }
        : {};

  const contacts = await db.directoryContact.findMany({
    where: {
      ...contactEntityFilter(ctx),
      ...entityFilter,
      ...(filters?.contactType
        ? { contactType: filters.contactType as DirectoryContactType }
        : {}),
      ...(filters?.activeOnly ? { isActive: true } : {}),
    },
    include: contactInclude,
    orderBy: [{ fullName: "asc" }],
  });

  let rows = contacts.map(mapContactRow);

  if (filters?.followUpDue) {
    rows = rows.filter((row) => row.followUpDue || row.followUpOverdue);
  }

  return rows;
}

export async function getDirectoryContact(id: string) {
  const ctx = await requireModuleAccess("CONTACTS");
  await ensureContactsSchema();

  return db.directoryContact.findFirst({
    where: { id, ...contactEntityFilter(ctx) },
    include: contactInclude,
  });
}

export async function createDirectoryContact(formData: FormData) {
  const ctx = await requireModuleAccess("CONTACTS");
  if (!canWrite(ctx, "CONTACTS")) {
    throw new Error("You do not have permission to add contacts.");
  }

  await ensureContactsSchema();
  const data = readContactFormData(formData);
  assertEntityAccess(ctx, data.entityId);
  const emails = parseContactEmailsJson(String(formData.get("emailsJson") ?? ""));
  const phones = parseContactPhonesJson(String(formData.get("phonesJson") ?? ""));

  const contact = await db.directoryContact.create({
    data: toContactCreateData(data, emails, phones),
  });

  await replaceContactChannels(contact.id, emails, phones);

  await logAudit({
    userId: ctx.id,
    action: "CREATE",
    resource: "DirectoryContact",
    resourceId: contact.id,
    metadata: { fullName: contact.fullName, contactType: contact.contactType },
  });

  revalidateContacts(contact.id);
  redirect(`${CONTACTS_PATH}/${contact.id}`);
}

export async function updateDirectoryContact(id: string, formData: FormData) {
  const ctx = await requireModuleAccess("CONTACTS");
  if (!canWrite(ctx, "CONTACTS")) {
    throw new Error("You do not have permission to update contacts.");
  }

  const existing = await getDirectoryContact(id);
  if (!existing) throw new Error("Contact not found.");

  const data = readContactFormData(formData);
  assertEntityAccess(ctx, data.entityId);
  const emails = parseContactEmailsJson(String(formData.get("emailsJson") ?? ""));
  const phones = parseContactPhonesJson(String(formData.get("phonesJson") ?? ""));

  await db.directoryContact.update({
    where: { id },
    data: toContactCreateData(data, emails, phones),
  });

  await replaceContactChannels(id, emails, phones);

  await logAudit({
    userId: ctx.id,
    action: "UPDATE",
    resource: "DirectoryContact",
    resourceId: id,
    metadata: { fullName: data.fullName },
  });

  revalidateContacts(id);
  redirect(`${CONTACTS_PATH}/${id}`);
}

export async function deleteDirectoryContact(id: string) {
  const ctx = await requireModuleAccess("CONTACTS");
  if (!canWrite(ctx, "CONTACTS")) {
    throw new Error("You do not have permission to delete contacts.");
  }

  const existing = await getDirectoryContact(id);
  if (!existing) throw new Error("Contact not found.");

  await db.directoryContact.delete({ where: { id } });

  await logAudit({
    userId: ctx.id,
    action: "DELETE",
    resource: "DirectoryContact",
    resourceId: id,
    metadata: { fullName: existing.fullName },
  });

  revalidateContacts();
}
