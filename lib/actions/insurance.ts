"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { ensureInsuranceSchema } from "@/lib/db/ensure-insurance-schema";
import { deleteBlobUrl, uploadPrivateFile } from "@/lib/blob";
import { logAudit } from "@/lib/audit/log";
import { canAccess, canWrite, requireModuleAccess } from "@/lib/permissions/access";
import {
  carEntityFilter,
  companyEntityFilter,
  insurancePolicyEntityFilter,
  landEntityFilter,
  rePropertyEntityFilter,
} from "@/lib/permissions/scoped-queries";
import { INSURANCE_PATH } from "@/lib/insurance/constants";
import { isExpiringWithinDays, parseDate, parseDecimal, resolvePolicyStatus } from "@/lib/insurance/helpers";
import type {
  InsuranceDocumentType,
  InsurancePolicyStatus,
  InsurancePolicyType,
  InsurancePremiumFrequency,
  Prisma,
} from "@/lib/generated/prisma/client";

const policyInclude = {
  entity: { select: { name: true } },
  vehicle: { select: { id: true, name: true } },
  reProperty: { select: { id: true, name: true } },
  landParcel: { select: { id: true, name: true } },
  registeredCompany: { select: { id: true, name: true } },
  documents: { orderBy: { createdAt: "desc" as const } },
} as const;

export type InsurancePolicyDetail = NonNullable<Awaited<ReturnType<typeof getInsurancePolicy>>>;

export type InsurancePolicyListRow = {
  id: string;
  entityId: string;
  entityName: string;
  policyType: string;
  insurer: string;
  policyNumber: string;
  policyHolder: string | null;
  description: string | null;
  premium: number | null;
  premiumFrequency: string;
  currency: string;
  expiryDate: Date | null;
  effectiveStatus: string;
  linkedAssetLabel: string | null;
  documentCount: number;
  updatedAt: Date;
};

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function getFilesFromFormData(formData: FormData, field: string): File[] {
  return formData
    .getAll(field)
    .filter((item): item is File => item instanceof File && item.size > 0);
}

function assertEntityAccess(
  ctx: Awaited<ReturnType<typeof requireModuleAccess>>,
  entityId: string,
) {
  if (ctx.entityIds.length > 0 && !ctx.entityIds.includes(entityId)) {
    if (ctx.role !== "PRINCIPAL" && !ctx.isSuperAdmin) {
      throw new Error("You do not have access to this entity.");
    }
  }
}

function revalidateInsurance(policyId?: string) {
  revalidatePath(INSURANCE_PATH);
  revalidatePath("/documents");
  if (policyId) {
    revalidatePath(`${INSURANCE_PATH}/${policyId}`);
    revalidatePath(`${INSURANCE_PATH}/${policyId}/edit`);
  }
  revalidatePath("/dashboard");
  revalidatePath("/calendar");
  revalidatePath("/reports");
}

function readPolicyFormData(formData: FormData) {
  const entityId = String(formData.get("entityId") ?? "").trim();
  const insurer = String(formData.get("insurer") ?? "").trim();
  const policyNumber = String(formData.get("policyNumber") ?? "").trim();

  if (!entityId) throw new Error("Entity is required.");
  if (!insurer) throw new Error("Insurer is required.");
  if (!policyNumber) throw new Error("Policy number is required.");

  return {
    entityId,
    policyType: String(formData.get("policyType") ?? "OTHER") as InsurancePolicyType,
    insurer,
    policyNumber,
    policyHolder: String(formData.get("policyHolder") ?? "").trim() || undefined,
    description: String(formData.get("description") ?? "").trim() || undefined,
    premium: parseDecimal(String(formData.get("premium") ?? "")),
    premiumFrequency: String(formData.get("premiumFrequency") ?? "ANNUAL") as InsurancePremiumFrequency,
    coverageAmount: parseDecimal(String(formData.get("coverageAmount") ?? "")),
    currency: String(formData.get("currency") ?? "OMR").trim() || "OMR",
    startDate: parseDate(String(formData.get("startDate") ?? "")),
    expiryDate: parseDate(String(formData.get("expiryDate") ?? "")),
    renewalDate: parseDate(String(formData.get("renewalDate") ?? "")),
    status: String(formData.get("status") ?? "ACTIVE") as InsurancePolicyStatus,
    vehicleId: String(formData.get("vehicleId") ?? "").trim() || null,
    rePropertyId: String(formData.get("rePropertyId") ?? "").trim() || null,
    landParcelId: String(formData.get("landParcelId") ?? "").trim() || null,
    registeredCompanyId: String(formData.get("registeredCompanyId") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? "").trim() || undefined,
  };
}

async function validateLinkedRecords(
  ctx: Awaited<ReturnType<typeof requireModuleAccess>>,
  data: ReturnType<typeof readPolicyFormData>,
) {
  if (data.vehicleId) {
    const vehicle = await db.vehicle.findFirst({
      where: { id: data.vehicleId, entityId: data.entityId, ...carEntityFilter(ctx) },
    });
    if (!vehicle) throw new Error("Linked vehicle not found for this entity.");
  }
  if (data.rePropertyId) {
    const property = await db.reProperty.findFirst({
      where: { id: data.rePropertyId, entityId: data.entityId, ...rePropertyEntityFilter(ctx) },
    });
    if (!property) throw new Error("Linked property not found for this entity.");
  }
  if (data.landParcelId) {
    const land = await db.landParcel.findFirst({
      where: { id: data.landParcelId, entityId: data.entityId, ...landEntityFilter(ctx) },
    });
    if (!land) throw new Error("Linked land parcel not found for this entity.");
  }
  if (data.registeredCompanyId) {
    const company = await db.registeredCompany.findFirst({
      where: { id: data.registeredCompanyId, entityId: data.entityId, ...companyEntityFilter(ctx) },
    });
    if (!company) throw new Error("Linked company not found for this entity.");
  }
}

function toPolicyCreateData(data: ReturnType<typeof readPolicyFormData>): Prisma.InsurancePolicyUncheckedCreateInput {
  return {
    entityId: data.entityId,
    policyType: data.policyType,
    insurer: data.insurer,
    policyNumber: data.policyNumber,
    policyHolder: data.policyHolder,
    description: data.description,
    premium: data.premium?.toString() ?? null,
    premiumFrequency: data.premiumFrequency,
    coverageAmount: data.coverageAmount?.toString() ?? null,
    currency: data.currency,
    startDate: data.startDate,
    expiryDate: data.expiryDate,
    renewalDate: data.renewalDate,
    status: data.status,
    vehicleId: data.vehicleId,
    rePropertyId: data.rePropertyId,
    landParcelId: data.landParcelId,
    registeredCompanyId: data.registeredCompanyId,
    notes: data.notes,
  };
}

async function uploadPolicyFiles(
  policyId: string,
  files: File[],
  documentType: InsuranceDocumentType,
  uploadedById: string,
) {
  for (const file of files) {
    const uploaded = await uploadPrivateFile(
      ["insurance", policyId, documentType.toLowerCase()],
      file,
    );
    try {
      await db.insurancePolicyDocument.create({
        data: {
          policyId,
          documentType,
          fileName: uploaded.fileName,
          fileUrl: uploaded.fileUrl,
          mimeType: uploaded.mimeType,
          fileSize: uploaded.fileSize,
          uploadedById,
        },
      });
    } catch (error) {
      await deleteBlobUrl(uploaded.fileUrl);
      throw error;
    }
  }
}

function mapPolicyRow(
  policy: Prisma.InsurancePolicyGetPayload<{
    include: {
      entity: { select: { name: true } };
      vehicle: { select: { name: true } };
      reProperty: { select: { name: true } };
      landParcel: { select: { name: true } };
      registeredCompany: { select: { name: true } };
      documents: { select: { id: true } };
    };
  }>,
): InsurancePolicyListRow {
  return {
    id: policy.id,
    entityId: policy.entityId,
    entityName: policy.entity.name,
    policyType: policy.policyType,
    insurer: policy.insurer,
    policyNumber: policy.policyNumber,
    policyHolder: policy.policyHolder,
    description: policy.description,
    premium: policy.premium ? parseFloat(policy.premium.toString()) : null,
    premiumFrequency: policy.premiumFrequency,
    currency: policy.currency,
    expiryDate: policy.expiryDate,
    effectiveStatus: resolvePolicyStatus(policy.status, policy.expiryDate),
    linkedAssetLabel:
      policy.vehicle?.name ??
      policy.reProperty?.name ??
      policy.landParcel?.name ??
      policy.registeredCompany?.name ??
      null,
    documentCount: policy.documents.length,
    updatedAt: policy.updatedAt,
  };
}

export async function listInsurancePolicies(filters?: {
  entityId?: string;
  policyType?: string;
  status?: string;
}): Promise<InsurancePolicyListRow[]> {
  const ctx = await requireModuleAccess("INSURANCE");
  await ensureInsuranceSchema();

  const policies = await db.insurancePolicy.findMany({
    where: {
      ...insurancePolicyEntityFilter(ctx),
      ...(filters?.entityId ? { entityId: filters.entityId } : {}),
      ...(filters?.policyType ? { policyType: filters.policyType as InsurancePolicyType } : {}),
      ...(filters?.status && filters.status !== "EXPIRED"
        ? { status: filters.status as InsurancePolicyStatus }
        : {}),
    },
    include: {
      entity: { select: { name: true } },
      vehicle: { select: { name: true } },
      reProperty: { select: { name: true } },
      landParcel: { select: { name: true } },
      registeredCompany: { select: { name: true } },
      documents: { select: { id: true } },
    },
    orderBy: [{ expiryDate: "asc" }, { updatedAt: "desc" }],
  });

  let rows = policies.map(mapPolicyRow);

  if (filters?.status === "EXPIRED") {
    rows = rows.filter((row) => row.effectiveStatus === "EXPIRED");
  } else if (filters?.status === "EXPIRING") {
    rows = rows.filter((row) => isExpiringWithinDays(row.expiryDate, 30));
  }

  return rows;
}

export async function getInsurancePolicy(id: string) {
  const ctx = await requireModuleAccess("INSURANCE");
  await ensureInsuranceSchema();

  return db.insurancePolicy.findFirst({
    where: { id, ...insurancePolicyEntityFilter(ctx) },
    include: policyInclude,
  });
}

export async function getInsuranceLinkOptions(entityId: string) {
  const ctx = await getCurrentUserContextSafe();
  if (!ctx) return { vehicles: [], properties: [], lands: [], companies: [] };

  const [vehicles, properties, lands, companies] = await Promise.all([
    canAccess(ctx, "CARS")
      ? db.vehicle.findMany({
          where: { entityId, ...carEntityFilter(ctx) },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : [],
    canAccess(ctx, "REAL_ESTATE")
      ? db.reProperty.findMany({
          where: { entityId, ...rePropertyEntityFilter(ctx) },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : [],
    canAccess(ctx, "LANDS")
      ? db.landParcel.findMany({
          where: { entityId, ...landEntityFilter(ctx) },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : [],
    canAccess(ctx, "COMPANIES")
      ? db.registeredCompany.findMany({
          where: { entityId, ...companyEntityFilter(ctx) },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : [],
  ]);

  return { vehicles, properties, lands, companies };
}

async function getCurrentUserContextSafe() {
  try {
    return await requireModuleAccess("INSURANCE");
  } catch {
    return null;
  }
}

export async function createInsurancePolicy(formData: FormData) {
  const ctx = await requireModuleAccess("INSURANCE");
  if (!canWrite(ctx, "INSURANCE")) {
    throw new Error("You do not have permission to add insurance policies.");
  }

  await ensureInsuranceSchema();
  const data = readPolicyFormData(formData);
  assertEntityAccess(ctx, data.entityId);
  await validateLinkedRecords(ctx, data);

  const policy = await db.insurancePolicy.create({
    data: toPolicyCreateData(data),
  });

  const files = getFilesFromFormData(formData, "policyFiles");
  if (files.length > 0) {
    await uploadPolicyFiles(policy.id, files, "POLICY_SCHEDULE", ctx.id);
  }

  await logAudit({
    userId: ctx.id,
    action: "CREATE",
    resource: "InsurancePolicy",
    resourceId: policy.id,
    metadata: { policyNumber: policy.policyNumber, insurer: policy.insurer },
  });

  revalidateInsurance(policy.id);
  redirect(`${INSURANCE_PATH}/${policy.id}`);
}

export async function updateInsurancePolicy(id: string, formData: FormData) {
  const ctx = await requireModuleAccess("INSURANCE");
  if (!canWrite(ctx, "INSURANCE")) {
    throw new Error("You do not have permission to update insurance policies.");
  }

  const existing = await getInsurancePolicy(id);
  if (!existing) throw new Error("Policy not found.");

  const data = readPolicyFormData(formData);
  assertEntityAccess(ctx, data.entityId);
  await validateLinkedRecords(ctx, data);

  const policy = await db.insurancePolicy.update({
    where: { id },
    data: toPolicyCreateData(data),
  });

  await logAudit({
    userId: ctx.id,
    action: "UPDATE",
    resource: "InsurancePolicy",
    resourceId: id,
    metadata: { policyNumber: policy.policyNumber },
  });

  revalidateInsurance(id);
  redirect(`${INSURANCE_PATH}/${id}`);
}

export async function deleteInsurancePolicy(id: string) {
  const ctx = await requireModuleAccess("INSURANCE");
  if (!canWrite(ctx, "INSURANCE")) {
    throw new Error("You do not have permission to delete insurance policies.");
  }

  const policy = await getInsurancePolicy(id);
  if (!policy) throw new Error("Policy not found.");

  for (const doc of policy.documents) {
    await deleteBlobUrl(doc.fileUrl);
  }

  await db.insurancePolicy.delete({ where: { id } });

  await logAudit({
    userId: ctx.id,
    action: "DELETE",
    resource: "InsurancePolicy",
    resourceId: id,
    metadata: { policyNumber: policy.policyNumber },
  });

  revalidateInsurance(id);
  redirect(INSURANCE_PATH);
}

export async function uploadInsuranceDocuments(formData: FormData) {
  const ctx = await requireModuleAccess("INSURANCE");
  if (!canWrite(ctx, "INSURANCE")) {
    throw new Error("You do not have permission to upload documents.");
  }

  const policyId = String(formData.get("policyId") ?? "").trim();
  const documentType = String(formData.get("documentType") ?? "") as InsuranceDocumentType;
  if (!policyId) throw new Error("Policy is required.");
  if (!documentType) throw new Error("Document type is required.");

  const policy = await getInsurancePolicy(policyId);
  if (!policy) throw new Error("Policy not found.");

  const files = getFilesFromFormData(formData, "files");
  if (files.length === 0) throw new Error("At least one file is required.");

  await uploadPolicyFiles(policyId, files, documentType, ctx.id);

  await logAudit({
    userId: ctx.id,
    action: "UPLOAD",
    resource: "InsurancePolicyDocument",
    resourceId: policyId,
    metadata: { documentType, count: files.length },
  });

  revalidateInsurance(policyId);
}

export async function deleteInsuranceDocument(id: string) {
  const ctx = await requireModuleAccess("INSURANCE");
  if (!canWrite(ctx, "INSURANCE")) {
    throw new Error("You do not have permission to delete documents.");
  }

  const document = await db.insurancePolicyDocument.findFirst({
    where: {
      id,
      policy: insurancePolicyEntityFilter(ctx),
    },
  });
  if (!document) throw new Error("Document not found.");

  await deleteBlobUrl(document.fileUrl);
  await db.insurancePolicyDocument.delete({ where: { id } });

  await logAudit({
    userId: ctx.id,
    action: "DELETE",
    resource: "InsurancePolicyDocument",
    resourceId: id,
    metadata: { policyId: document.policyId },
  });

  revalidateInsurance(document.policyId);
}
