import { formatTags, isFollowUpOverdue } from "@/lib/contacts/helpers";
import { formatPhoneDisplay } from "@/lib/contacts/phone-helpers";
import type { DirectoryContactDetail } from "@/lib/actions/contacts";

export type SerializedDirectoryContact = {
  id: string;
  fullName: string;
  organization: string | null;
  jobTitle: string | null;
  contactType: string;
  email: string | null;
  phonePrimary: string | null;
  phoneSecondary: string | null;
  emails: Array<{ id: string; email: string; label: string | null; sortOrder: number }>;
  phones: Array<{
    id: string;
    countryCode: string;
    phone: string;
    label: string | null;
    sortOrder: number;
    display: string;
  }>;
  address: string | null;
  city: string | null;
  country: string | null;
  website: string | null;
  entityId: string | null;
  entityName: string | null;
  notes: string | null;
  tags: string[];
  lastContactDate: Date | null;
  nextFollowUpDate: Date | null;
  isActive: boolean;
  followUpOverdue: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export function serializeDirectoryContact(
  contact: DirectoryContactDetail,
): SerializedDirectoryContact {
  return {
    id: contact.id,
    fullName: contact.fullName,
    organization: contact.organization,
    jobTitle: contact.jobTitle,
    contactType: contact.contactType,
    email: contact.email,
    phonePrimary: contact.phonePrimary,
    phoneSecondary: contact.phoneSecondary,
    emails: contact.emails.map((row) => ({
      id: row.id,
      email: row.email,
      label: row.label,
      sortOrder: row.sortOrder,
    })),
    phones: contact.phones.map((row) => ({
      id: row.id,
      countryCode: row.countryCode,
      phone: row.phone,
      label: row.label,
      sortOrder: row.sortOrder,
      display: formatPhoneDisplay(row.countryCode, row.phone),
    })),
    address: contact.address,
    city: contact.city,
    country: contact.country,
    website: contact.website,
    entityId: contact.entityId,
    entityName: contact.entity?.name ?? null,
    notes: contact.notes,
    tags: formatTags(contact.tags),
    lastContactDate: contact.lastContactDate,
    nextFollowUpDate: contact.nextFollowUpDate,
    isActive: contact.isActive,
    followUpOverdue: contact.isActive && isFollowUpOverdue(contact.nextFollowUpDate),
    createdAt: contact.createdAt,
    updatedAt: contact.updatedAt,
  };
}
