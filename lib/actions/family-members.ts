"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { ensureFamilySchema } from "@/lib/db/ensure-family-schema";
import { deleteBlobUrl, uploadPrivateFile } from "@/lib/blob";
import { logAudit } from "@/lib/audit/log";
import { FAMILY_MEMBERS_PATH } from "@/lib/family/constants";
import { parseDate, parseDecimal } from "@/lib/family/helpers";
import {
  parseBeneficiaryDesignationsJson,
  parseFamilyEmailsJson,
  parseFamilyPhonesJson,
  parseOwnershipStakesJson,
  parseSignatoryRolesJson,
} from "@/lib/family/parse-json";
import { canAccess, canWrite, requireModuleAccess } from "@/lib/permissions/access";
import {
  assetEntityFilter,
  carEntityFilter,
  companyEntityFilter,
  familyMemberFilter,
  insurancePolicyEntityFilter,
  landEntityFilter,
  rePropertyEntityFilter,
} from "@/lib/permissions/scoped-queries";
import type {
  BeneficiaryDesignationType,
  FamilyKycStatus,
  FamilyMemberDocumentType,
  FamilyMemberIdType,
  FamilyOwnershipStakeType,
  FamilyRelationship,
  FamilySignatoryRoleType,
  Prisma,
} from "@/lib/generated/prisma/client";
import type {
  BeneficiaryDesignationInput,
  FamilyEmailInput,
  FamilyPhoneInput,
  OwnershipStakeInput,
  SignatoryAccountInput,
  SignatoryRoleInput,
} from "@/lib/family/types";

const memberInclude = {
  emails: { orderBy: { sortOrder: "asc" as const } },
  phones: { orderBy: { sortOrder: "asc" as const } },
  documents: { orderBy: { createdAt: "desc" as const } },
  ownershipStakes: {
    orderBy: { sortOrder: "asc" as const },
    include: {
      entity: { select: { name: true } },
      asset: { select: { name: true } },
      landParcel: { select: { name: true } },
      registeredCompany: { select: { name: true } },
      reProperty: { select: { name: true } },
      vehicle: { select: { name: true } },
    },
  },
  signatoryRoles: {
    orderBy: { sortOrder: "asc" as const },
    include: {
      entity: { select: { name: true } },
      registeredCompany: { select: { name: true } },
      asset: { select: { name: true } },
      vehicle: { select: { name: true } },
      accounts: { orderBy: { sortOrder: "asc" as const } },
    },
  },
  beneficiaryDesignations: {
    orderBy: { sortOrder: "asc" as const },
    include: {
      insurancePolicy: { select: { insurer: true, policyNumber: true } },
      asset: { select: { name: true } },
      landParcel: { select: { name: true } },
      registeredCompany: { select: { name: true } },
      reProperty: { select: { name: true } },
      vehicle: { select: { name: true } },
    },
  },
} as const;

export type FamilyMemberDetail = NonNullable<Awaited<ReturnType<typeof getFamilyMember>>>;

export type FamilyMemberListRow = {
  id: string;
  fullName: string;
  preferredName: string | null;
  relationship: string | null;
  kycStatus: string;
  effectiveKycStatus: string;
  isBeneficiary: boolean;
  deceased: boolean;
  idExpiryDate: Date | null;
  stakeCount: number;
  designationCount: number;
  documentCount: number;
  updatedAt: Date;
};

export type { OwnershipStakeInput, SignatoryRoleInput, SignatoryAccountInput, BeneficiaryDesignationInput, FamilyEmailInput, FamilyPhoneInput } from "@/lib/family/types";

function legacyContactFields(emails: FamilyEmailInput[], phones: FamilyPhoneInput[]) {
  const validEmails = emails.map((row) => row.email.trim()).filter(Boolean);
  const validPhones = phones.map((row) => row.phone.trim()).filter(Boolean);

  return {
    email: validEmails[0] ?? null,
    phonePrimary: validPhones[0] ?? null,
    phoneSecondary: validPhones[1] ?? null,
  };
}

async function replaceEmails(memberId: string, emails: FamilyEmailInput[]) {
  await db.familyMemberEmail.deleteMany({ where: { familyMemberId: memberId } });
  const valid = emails
    .map((row) => ({ email: row.email.trim(), label: row.label?.trim() || null }))
    .filter((row) => row.email);

  if (valid.length === 0) return;

  await db.familyMemberEmail.createMany({
    data: valid.map((row, index) => ({
      familyMemberId: memberId,
      email: row.email,
      label: row.label,
      sortOrder: index,
    })),
  });
}

async function replacePhones(memberId: string, phones: FamilyPhoneInput[]) {
  await db.familyMemberPhone.deleteMany({ where: { familyMemberId: memberId } });
  const valid = phones
    .map((row) => ({ phone: row.phone.trim(), label: row.label?.trim() || null }))
    .filter((row) => row.phone);

  if (valid.length === 0) return;

  await db.familyMemberPhone.createMany({
    data: valid.map((row, index) => ({
      familyMemberId: memberId,
      phone: row.phone,
      label: row.label,
      sortOrder: index,
    })),
  });
}

async function replaceMemberContacts(
  memberId: string,
  emails: FamilyEmailInput[],
  phones: FamilyPhoneInput[],
) {
  await replaceEmails(memberId, emails);
  await replacePhones(memberId, phones);

  await db.familyMember.update({
    where: { id: memberId },
    data: legacyContactFields(emails, phones),
  });
}

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function getFilesFromFormData(formData: FormData, field: string): File[] {
  return formData
    .getAll(field)
    .filter((item): item is File => item instanceof File && item.size > 0);
}

function revalidateFamily(memberId?: string) {
  revalidatePath(FAMILY_MEMBERS_PATH);
  if (memberId) {
    revalidatePath(`${FAMILY_MEMBERS_PATH}/${memberId}`);
    revalidatePath(`${FAMILY_MEMBERS_PATH}/${memberId}/edit`);
  }
  revalidatePath("/dashboard");
  revalidatePath("/calendar");
  revalidatePath("/reports");
}

function readMemberFormData(formData: FormData) {
  const fullName = String(formData.get("fullName") ?? "").trim();
  if (!fullName) throw new Error("Full name is required.");

  const relationship = String(formData.get("relationship") ?? "").trim();
  const idType = String(formData.get("idType") ?? "").trim();

  return {
    fullName,
    preferredName: String(formData.get("preferredName") ?? "").trim() || null,
    dateOfBirth: parseDate(String(formData.get("dateOfBirth") ?? "")),
    nationality: String(formData.get("nationality") ?? "").trim() || null,
    relationship: relationship ? (relationship as FamilyRelationship) : null,
    idType: idType ? (idType as FamilyMemberIdType) : null,
    idNumber: String(formData.get("idNumber") ?? "").trim() || null,
    idExpiryDate: parseDate(String(formData.get("idExpiryDate") ?? "")),
    kycStatus: String(formData.get("kycStatus") ?? "NOT_STARTED") as FamilyKycStatus,
    kycNotes: String(formData.get("kycNotes") ?? "").trim() || null,
    address: String(formData.get("address") ?? "").trim() || null,
    emergencyContactName: String(formData.get("emergencyContactName") ?? "").trim() || null,
    emergencyContactPhone: String(formData.get("emergencyContactPhone") ?? "").trim() || null,
    isBeneficiary: formData.get("isBeneficiary") === "on" || formData.get("isBeneficiary") === "true",
    deceased: formData.get("deceased") === "on" || formData.get("deceased") === "true",
    dateOfDeath: parseDate(String(formData.get("dateOfDeath") ?? "")),
    notes: String(formData.get("notes") ?? "").trim() || null,
  };
}

export async function listFamilyMembers(filters?: {
  relationship?: string;
  kycStatus?: string;
  beneficiariesOnly?: boolean;
}): Promise<FamilyMemberListRow[]> {
  const ctx = await requireModuleAccess("FAMILY_MEMBERS");
  await ensureFamilySchema();

  const members = await db.familyMember.findMany({
    where: {
      ...familyMemberFilter(ctx),
      ...(filters?.relationship ? { relationship: filters.relationship as FamilyRelationship } : {}),
      ...(filters?.kycStatus ? { kycStatus: filters.kycStatus as FamilyKycStatus } : {}),
      ...(filters?.beneficiariesOnly ? { isBeneficiary: true } : {}),
    },
    include: {
      ownershipStakes: { select: { id: true } },
      beneficiaryDesignations: { select: { id: true } },
      documents: { select: { id: true } },
    },
    orderBy: [{ fullName: "asc" }],
  });

  return members.map((member) => {
    const effectiveKycStatus =
      member.idExpiryDate && member.idExpiryDate < new Date() ? "EXPIRED" : member.kycStatus;

    return {
      id: member.id,
      fullName: member.fullName,
      preferredName: member.preferredName,
      relationship: member.relationship,
      kycStatus: member.kycStatus,
      effectiveKycStatus,
      isBeneficiary: member.isBeneficiary,
      deceased: member.deceased,
      idExpiryDate: member.idExpiryDate,
      stakeCount: member.ownershipStakes.length,
      designationCount: member.beneficiaryDesignations.length,
      documentCount: member.documents.length,
      updatedAt: member.updatedAt,
    };
  });
}

export async function getFamilyMember(id: string) {
  const ctx = await requireModuleAccess("FAMILY_MEMBERS");
  await ensureFamilySchema();

  return db.familyMember.findFirst({
    where: { id, ...familyMemberFilter(ctx) },
    include: memberInclude,
  });
}

export async function getFamilyLinkOptions(entityId?: string) {
  const ctx = await requireModuleAccess("FAMILY_MEMBERS");

  const entityFilter = entityId ? { entityId } : {};

  const [entities, assets, vehicles, properties, lands, companies, policies] = await Promise.all([
    db.entity.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    canAccess(ctx, "ASSETS")
      ? db.asset.findMany({
          where: { ...assetEntityFilter(ctx), ...entityFilter, status: "ACTIVE" },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : [],
    canAccess(ctx, "CARS")
      ? db.vehicle.findMany({
          where: { ...carEntityFilter(ctx), ...entityFilter },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : [],
    canAccess(ctx, "REAL_ESTATE")
      ? db.reProperty.findMany({
          where: { ...rePropertyEntityFilter(ctx), ...entityFilter },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : [],
    canAccess(ctx, "LANDS")
      ? db.landParcel.findMany({
          where: { ...landEntityFilter(ctx), ...entityFilter },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : [],
    canAccess(ctx, "COMPANIES")
      ? db.registeredCompany.findMany({
          where: { ...companyEntityFilter(ctx), ...entityFilter },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : [],
    canAccess(ctx, "INSURANCE")
      ? db.insurancePolicy.findMany({
          where: { ...insurancePolicyEntityFilter(ctx), ...entityFilter },
          select: { id: true, insurer: true, policyNumber: true },
          orderBy: { policyNumber: "asc" },
        })
      : [],
  ]);

  return { entities, assets, vehicles, properties, lands, companies, policies };
}

export async function listFamilyMemberOptions() {
  const ctx = await requireModuleAccess("FAMILY_MEMBERS");
  await ensureFamilySchema();

  return db.familyMember.findMany({
    where: { ...familyMemberFilter(ctx), deceased: false },
    select: { id: true, fullName: true },
    orderBy: { fullName: "asc" },
  });
}

async function replaceOwnershipStakes(memberId: string, stakes: OwnershipStakeInput[]) {
  await db.familyOwnershipStake.deleteMany({ where: { familyMemberId: memberId } });
  if (stakes.length === 0) return;

  await db.familyOwnershipStake.createMany({
    data: stakes.map((stake, index) => ({
      familyMemberId: memberId,
      entityId: stake.entityId || null,
      assetId: stake.assetId || null,
      landParcelId: stake.landParcelId || null,
      registeredCompanyId: stake.registeredCompanyId || null,
      rePropertyId: stake.rePropertyId || null,
      vehicleId: stake.vehicleId || null,
      stakeType: (stake.stakeType || "ECONOMIC") as FamilyOwnershipStakeType,
      ownershipPct: parseDecimal(stake.ownershipPct ?? "")?.toString() ?? null,
      roleLabel: stake.roleLabel?.trim() || null,
      notes: stake.notes?.trim() || null,
      sortOrder: index,
    })),
  });
}

async function replaceSignatoryRoles(memberId: string, roles: SignatoryRoleInput[]) {
  await db.familySignatoryRole.deleteMany({ where: { familyMemberId: memberId } });
  const valid = roles.filter((role) => role.entityId?.trim());
  if (valid.length === 0) return;

  for (const [index, role] of valid.entries()) {
    const accounts = normalizeSignatoryAccounts(role);
    const primaryAccount = accounts[0]?.accountNumber ?? role.accountRef?.trim() ?? null;

    await db.familySignatoryRole.create({
      data: {
        familyMemberId: memberId,
        entityId: role.entityId,
        registeredCompanyId: role.registeredCompanyId || null,
        assetId: role.assetId || null,
        vehicleId: role.vehicleId || null,
        roleType: (role.roleType || "OTHER") as FamilySignatoryRoleType,
        bankName: role.bankName?.trim() || null,
        accountRef: primaryAccount,
        effectiveFrom: parseDate(role.effectiveFrom ?? ""),
        effectiveTo: parseDate(role.effectiveTo ?? ""),
        isActive: role.isActive !== false,
        notes: role.notes?.trim() || null,
        sortOrder: index,
        accounts: {
          create: accounts.map((account, accountIndex) => ({
            accountNumber: account.accountNumber,
            currency: account.currency?.trim() || "OMR",
            label: account.label?.trim() || null,
            sortOrder: accountIndex,
          })),
        },
      },
    });
  }
}

function normalizeSignatoryAccounts(role: SignatoryRoleInput): SignatoryAccountInput[] {
  const fromAccounts = (role.accounts ?? [])
    .map((account) => ({
      accountNumber: account.accountNumber.trim(),
      currency: account.currency?.trim() || "OMR",
      label: account.label?.trim() || undefined,
    }))
    .filter((account) => account.accountNumber);

  if (fromAccounts.length > 0) return fromAccounts;

  const legacyRef = role.accountRef?.trim();
  if (legacyRef) {
    return [{ accountNumber: legacyRef, currency: "OMR" }];
  }

  return [];
}

async function replaceBeneficiaryDesignations(memberId: string, designations: BeneficiaryDesignationInput[]) {
  await db.beneficiaryDesignation.deleteMany({ where: { familyMemberId: memberId } });
  if (designations.length === 0) return;

  await db.beneficiaryDesignation.createMany({
    data: designations.map((d, index) => ({
      familyMemberId: memberId,
      insurancePolicyId: d.insurancePolicyId || null,
      assetId: d.assetId || null,
      landParcelId: d.landParcelId || null,
      registeredCompanyId: d.registeredCompanyId || null,
      rePropertyId: d.rePropertyId || null,
      vehicleId: d.vehicleId || null,
      designationType: (d.designationType || "PRIMARY") as BeneficiaryDesignationType,
      allocationPct: parseDecimal(d.allocationPct ?? "")?.toString() ?? null,
      effectiveDate: parseDate(d.effectiveDate ?? ""),
      notes: d.notes?.trim() || null,
      sortOrder: index,
    })),
  });
}

export async function createFamilyMember(formData: FormData) {
  const ctx = await requireModuleAccess("FAMILY_MEMBERS");
  if (!canWrite(ctx, "FAMILY_MEMBERS")) {
    throw new Error("You do not have permission to add family members.");
  }

  await ensureFamilySchema();
  const data = readMemberFormData(formData);

  const member = await db.familyMember.create({
    data: {
      ...data,
      ...legacyContactFields(
        parseFamilyEmailsJson(String(formData.get("emailsJson") ?? "")),
        parseFamilyPhonesJson(String(formData.get("phonesJson") ?? "")),
      ),
    },
  });

  const stakes = parseOwnershipStakesJson(String(formData.get("stakesJson") ?? ""));
  const roles = parseSignatoryRolesJson(String(formData.get("signatoryRolesJson") ?? ""));
  const designations = parseBeneficiaryDesignationsJson(String(formData.get("beneficiaryDesignationsJson") ?? ""));
  const emails = parseFamilyEmailsJson(String(formData.get("emailsJson") ?? ""));
  const phones = parseFamilyPhonesJson(String(formData.get("phonesJson") ?? ""));

  await replaceMemberContacts(member.id, emails, phones);

  await replaceOwnershipStakes(member.id, stakes);
  await replaceSignatoryRoles(member.id, roles);
  await replaceBeneficiaryDesignations(member.id, designations);

  const poaFiles = getFilesFromFormData(formData, "poaFiles");
  if (poaFiles.length > 0) {
    const poaExpiry = parseDate(String(formData.get("poaExpiryDate") ?? ""));
    await uploadMemberFiles(member.id, poaFiles, "POA", ctx.id, poaExpiry);
  }

  await logAudit({
    userId: ctx.id,
    action: "CREATE",
    resource: "FamilyMember",
    resourceId: member.id,
    metadata: { fullName: member.fullName },
  });

  revalidateFamily(member.id);
  redirect(`${FAMILY_MEMBERS_PATH}/${member.id}`);
}

export async function updateFamilyMember(memberId: string, formData: FormData) {
  const ctx = await requireModuleAccess("FAMILY_MEMBERS");
  if (!canWrite(ctx, "FAMILY_MEMBERS")) {
    throw new Error("You do not have permission to edit family members.");
  }

  await ensureFamilySchema();
  const existing = await getFamilyMember(memberId);
  if (!existing) throw new Error("Family member not found.");

  const data = readMemberFormData(formData);

  await db.familyMember.update({ where: { id: memberId }, data });

  if (formData.has("emailsJson") || formData.has("phonesJson")) {
    const emails = parseFamilyEmailsJson(String(formData.get("emailsJson") ?? ""));
    const phones = parseFamilyPhonesJson(String(formData.get("phonesJson") ?? ""));
    await replaceMemberContacts(memberId, emails, phones);
  }

  if (formData.has("stakesJson")) {
    await replaceOwnershipStakes(memberId, parseOwnershipStakesJson(String(formData.get("stakesJson"))));
  }
  if (formData.has("signatoryRolesJson")) {
    await replaceSignatoryRoles(memberId, parseSignatoryRolesJson(String(formData.get("signatoryRolesJson"))));
  }
  if (formData.has("beneficiaryDesignationsJson")) {
    await replaceBeneficiaryDesignations(
      memberId,
      parseBeneficiaryDesignationsJson(String(formData.get("beneficiaryDesignationsJson"))),
    );
  }

  await logAudit({
    userId: ctx.id,
    action: "UPDATE",
    resource: "FamilyMember",
    resourceId: memberId,
    metadata: { fullName: data.fullName },
  });

  revalidateFamily(memberId);
  redirect(`${FAMILY_MEMBERS_PATH}/${memberId}`);
}

export async function saveFamilyMemberRelations(memberId: string, formData: FormData) {
  const ctx = await requireModuleAccess("FAMILY_MEMBERS");
  if (!canWrite(ctx, "FAMILY_MEMBERS")) {
    throw new Error("You do not have permission to edit family members.");
  }

  await ensureFamilySchema();
  const existing = await getFamilyMember(memberId);
  if (!existing) throw new Error("Family member not found.");

  if (formData.has("stakesJson")) {
    await replaceOwnershipStakes(memberId, parseOwnershipStakesJson(String(formData.get("stakesJson"))));
  }
  if (formData.has("signatoryRolesJson")) {
    await replaceSignatoryRoles(memberId, parseSignatoryRolesJson(String(formData.get("signatoryRolesJson"))));
  }
  if (formData.has("beneficiaryDesignationsJson")) {
    await replaceBeneficiaryDesignations(
      memberId,
      parseBeneficiaryDesignationsJson(String(formData.get("beneficiaryDesignationsJson"))),
    );
  }

  revalidateFamily(memberId);
}

export async function deleteFamilyMember(memberId: string) {
  const ctx = await requireModuleAccess("FAMILY_MEMBERS");
  if (!canWrite(ctx, "FAMILY_MEMBERS")) {
    throw new Error("You do not have permission to delete family members.");
  }

  await ensureFamilySchema();
  const member = await getFamilyMember(memberId);
  if (!member) throw new Error("Family member not found.");

  for (const doc of member.documents) {
    await deleteBlobUrl(doc.fileUrl);
  }

  await db.familyMember.delete({ where: { id: memberId } });

  await logAudit({
    userId: ctx.id,
    action: "DELETE",
    resource: "FamilyMember",
    resourceId: memberId,
    metadata: { fullName: member.fullName },
  });

  revalidateFamily();
  redirect(FAMILY_MEMBERS_PATH);
}

async function uploadMemberFiles(
  memberId: string,
  files: File[],
  documentType: FamilyMemberDocumentType,
  uploadedById: string,
  expiryDate: Date | null,
) {
  for (const file of files) {
    const uploaded = await uploadPrivateFile(
      ["family", memberId, documentType.toLowerCase()],
      file,
    );
    try {
      await db.familyMemberDocument.create({
        data: {
          familyMemberId: memberId,
          documentType,
          fileName: uploaded.fileName,
          fileUrl: uploaded.fileUrl,
          mimeType: uploaded.mimeType,
          fileSize: uploaded.fileSize,
          expiryDate,
          uploadedById,
        },
      });
    } catch (error) {
      await deleteBlobUrl(uploaded.fileUrl);
      throw error;
    }
  }
}

export async function uploadFamilyMemberDocuments(formData: FormData) {
  const ctx = await requireModuleAccess("FAMILY_MEMBERS");
  if (!canWrite(ctx, "FAMILY_MEMBERS")) {
    throw new Error("You do not have permission to upload documents.");
  }

  await ensureFamilySchema();
  const memberId = String(formData.get("memberId") ?? "").trim();
  if (!memberId) throw new Error("Member ID is required.");

  const member = await getFamilyMember(memberId);
  if (!member) throw new Error("Family member not found.");

  const documentType = String(formData.get("documentType") ?? "OTHER") as FamilyMemberDocumentType;
  const expiryDate = parseDate(String(formData.get("expiryDate") ?? ""));
  const files = getFilesFromFormData(formData, "files");
  if (files.length === 0) throw new Error("Select at least one file.");

  await uploadMemberFiles(memberId, files, documentType, ctx.id, expiryDate);
  revalidateFamily(memberId);
}

export async function deleteFamilyMemberDocument(documentId: string) {
  const ctx = await requireModuleAccess("FAMILY_MEMBERS");
  if (!canWrite(ctx, "FAMILY_MEMBERS")) {
    throw new Error("You do not have permission to delete documents.");
  }

  await ensureFamilySchema();
  const doc = await db.familyMemberDocument.findFirst({
    where: {
      id: documentId,
      familyMember: familyMemberFilter(ctx),
    },
  });
  if (!doc) throw new Error("Document not found.");

  await deleteBlobUrl(doc.fileUrl);
  await db.familyMemberDocument.delete({ where: { id: documentId } });
  revalidateFamily(doc.familyMemberId);
}
