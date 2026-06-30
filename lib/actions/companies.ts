"use server";

import { put } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { deleteBlobUrl } from "@/lib/blob";
import { logAudit } from "@/lib/audit/log";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { companyEntityFilter } from "@/lib/permissions/scoped-queries";
import type { AssetStatus, CompanyDocumentType } from "@/lib/generated/prisma/client";

export type CompanyOwnerInput = {
  name: string;
  ownershipPct?: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
};

function parseDate(value?: string | null) {
  if (!value || value.trim() === "") return undefined;
  return new Date(value);
}

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function getFilesFromFormData(formData: FormData, field: string): File[] {
  return formData
    .getAll(field)
    .filter((item): item is File => item instanceof File && item.size > 0);
}

function parseOwnersJson(raw: string): CompanyOwnerInput[] {
  if (!raw.trim()) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Invalid owners data.");
  }
  if (!Array.isArray(parsed)) throw new Error("Owners must be a list.");

  const owners: CompanyOwnerInput[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const name = String(record.name ?? "").trim();
    if (!name) continue;
    owners.push({
      name,
      ownershipPct: String(record.ownershipPct ?? "").trim() || undefined,
      email: String(record.email ?? "").trim() || undefined,
      phone: String(record.phone ?? "").trim() || undefined,
      address: String(record.address ?? "").trim() || undefined,
      notes: String(record.notes ?? "").trim() || undefined,
    });
  }
  return owners;
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

async function uploadCompanyFiles(
  companyId: string,
  files: File[],
  documentType: CompanyDocumentType,
  uploadedById: string,
  labelPrefix?: string,
) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error(
      "BLOB_READ_WRITE_TOKEN is not configured. Document uploads require Vercel Blob storage.",
    );
  }

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (!(file instanceof File) || file.size === 0) continue;

    const pathname =
      "companies/" +
      companyId +
      "/" +
      documentType.toLowerCase() +
      "/" +
      Date.now() +
      "-" +
      i +
      "-" +
      sanitizeFileName(file.name);

    const blob = await put(pathname, file, {
      access: "public",
      token,
      contentType: file.type || undefined,
    });

    await db.companyDocument.create({
      data: {
        companyId,
        documentType,
        label: labelPrefix ? labelPrefix + " " + (i + 1) : file.name,
        fileName: file.name,
        fileUrl: blob.url,
        mimeType: file.type || "application/octet-stream",
        fileSize: file.size,
        uploadedById,
      },
    });
  }
}

async function replaceOwners(companyId: string, owners: CompanyOwnerInput[]) {
  await db.companyOwner.deleteMany({ where: { companyId } });
  if (owners.length === 0) return;

  await db.companyOwner.createMany({
    data: owners.map((owner, index) => ({
      companyId,
      name: owner.name,
      ownershipPct: owner.ownershipPct || undefined,
      email: owner.email,
      phone: owner.phone,
      address: owner.address,
      notes: owner.notes,
      sortOrder: index,
    })),
  });
}

function readCompanyFormData(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const registrationNumber = String(formData.get("registrationNumber") ?? "").trim();
  const entityId = String(formData.get("entityId") ?? "").trim();
  const status = String(formData.get("status") ?? "ACTIVE") as AssetStatus;

  if (!name) throw new Error("Company name is required.");
  if (!registrationNumber) throw new Error("Registration number is required.");
  if (!entityId) throw new Error("Entity is required.");

  return {
    name,
    registrationNumber,
    registrationDate: parseDate(String(formData.get("registrationDate") ?? "")),
    registrationExpiryDate: parseDate(String(formData.get("registrationExpiryDate") ?? "")),
    ceoName: String(formData.get("ceoName") ?? "").trim() || undefined,
    ceoEmail: String(formData.get("ceoEmail") ?? "").trim() || undefined,
    ceoPhone: String(formData.get("ceoPhone") ?? "").trim() || undefined,
    managementContactName: String(formData.get("managementContactName") ?? "").trim() || undefined,
    managementEmail: String(formData.get("managementEmail") ?? "").trim() || undefined,
    managementPhone: String(formData.get("managementPhone") ?? "").trim() || undefined,
    managementNotes: String(formData.get("managementNotes") ?? "").trim() || undefined,
    entityId,
    status,
    notes: String(formData.get("notes") ?? "").trim() || undefined,
    owners: parseOwnersJson(String(formData.get("ownersJson") ?? "[]")),
  };
}

export async function createCompany(formData: FormData) {
  const ctx = await requireModuleAccess("COMPANIES");
  if (!canWrite(ctx, "COMPANIES")) {
    throw new Error("You do not have permission to register companies.");
  }

  const data = readCompanyFormData(formData);
  assertEntityAccess(ctx, data.entityId);

  const asset = await db.asset.create({
    data: {
      name: data.name,
      category: "PRIVATE_EQUITY",
      status: data.status,
      entityId: data.entityId,
      description: "Registration " + data.registrationNumber,
      managerName: data.ceoName,
      managerEmail: data.ceoEmail,
      managerPhone: data.ceoPhone,
      managerNotes: data.managementNotes,
      privateEquity: {
        create: {
          registeredHolder: data.owners.map((o) => o.name).join(", ") || undefined,
          contactName: data.managementContactName,
          contactEmail: data.managementEmail,
          contactPhone: data.managementPhone,
        },
      },
    },
  });

  const company = await db.registeredCompany.create({
    data: {
      name: data.name,
      registrationNumber: data.registrationNumber,
      registrationDate: data.registrationDate,
      registrationExpiryDate: data.registrationExpiryDate,
      ceoName: data.ceoName,
      ceoEmail: data.ceoEmail,
      ceoPhone: data.ceoPhone,
      managementContactName: data.managementContactName,
      managementEmail: data.managementEmail,
      managementPhone: data.managementPhone,
      managementNotes: data.managementNotes,
      status: data.status,
      notes: data.notes,
      entityId: data.entityId,
      assetId: asset.id,
    },
  });

  await replaceOwners(company.id, data.owners);

  const registrationFiles = getFilesFromFormData(formData, "registrationCopyFiles");
  const chamberFiles = getFilesFromFormData(formData, "chamberCopyFiles");
  const financialsFiles = getFilesFromFormData(formData, "financialsFiles");
  const otherFiles = getFilesFromFormData(formData, "otherFiles");

  if (registrationFiles.length) {
    await uploadCompanyFiles(company.id, registrationFiles, "REGISTRATION_COPY", ctx.id);
  }
  if (chamberFiles.length) {
    await uploadCompanyFiles(company.id, chamberFiles, "CHAMBER_COPY", ctx.id);
  }
  if (financialsFiles.length) {
    await uploadCompanyFiles(company.id, financialsFiles, "FINANCIALS", ctx.id);
  }
  if (otherFiles.length) {
    await uploadCompanyFiles(company.id, otherFiles, "OTHER", ctx.id, "Other document");
  }

  await logAudit({
    userId: ctx.id,
    action: "CREATE",
    resource: "RegisteredCompany",
    resourceId: company.id,
    metadata: { name: company.name, registrationNumber: company.registrationNumber },
  });

  revalidatePath("/companies");
  revalidatePath("/assets");
  return company;
}

export async function updateCompany(id: string, formData: FormData) {
  const ctx = await requireModuleAccess("COMPANIES");
  if (!canWrite(ctx, "COMPANIES")) {
    throw new Error("You do not have permission to update companies.");
  }

  const existing = await db.registeredCompany.findFirst({
    where: { id, ...companyEntityFilter(ctx) },
    include: { asset: { include: { privateEquity: true } } },
  });
  if (!existing) throw new Error("Company not found.");

  const data = readCompanyFormData(formData);
  assertEntityAccess(ctx, data.entityId);

  const company = await db.registeredCompany.update({
    where: { id },
    data: {
      name: data.name,
      registrationNumber: data.registrationNumber,
      registrationDate: data.registrationDate,
      registrationExpiryDate: data.registrationExpiryDate,
      ceoName: data.ceoName,
      ceoEmail: data.ceoEmail,
      ceoPhone: data.ceoPhone,
      managementContactName: data.managementContactName,
      managementEmail: data.managementEmail,
      managementPhone: data.managementPhone,
      managementNotes: data.managementNotes,
      status: data.status,
      notes: data.notes,
      entityId: data.entityId,
    },
  });

  await replaceOwners(company.id, data.owners);

  if (existing.assetId) {
    await db.asset.update({
      where: { id: existing.assetId },
      data: {
        name: data.name,
        status: data.status,
        entityId: data.entityId,
        description: "Registration " + data.registrationNumber,
        managerName: data.ceoName,
        managerEmail: data.ceoEmail,
        managerPhone: data.ceoPhone,
        managerNotes: data.managementNotes,
        privateEquity: existing.asset?.privateEquity
          ? {
              update: {
                registeredHolder: data.owners.map((o) => o.name).join(", ") || undefined,
                contactName: data.managementContactName,
                contactEmail: data.managementEmail,
                contactPhone: data.managementPhone,
              },
            }
          : {
              create: {
                registeredHolder: data.owners.map((o) => o.name).join(", ") || undefined,
                contactName: data.managementContactName,
                contactEmail: data.managementEmail,
                contactPhone: data.managementPhone,
              },
            },
      },
    });
  }

  await logAudit({
    userId: ctx.id,
    action: "UPDATE",
    resource: "RegisteredCompany",
    resourceId: id,
    metadata: { name: company.name },
  });

  revalidatePath("/companies");
  revalidatePath("/companies/" + id);
  revalidatePath("/companies/" + id + "/edit");
  revalidatePath("/assets");
  return company;
}

export async function uploadCompanyDocuments(formData: FormData) {
  const ctx = await requireModuleAccess("COMPANIES");
  if (!canWrite(ctx, "COMPANIES")) {
    throw new Error("You do not have permission to upload company documents.");
  }

  const companyId = String(formData.get("companyId") ?? "").trim();
  const documentType = String(formData.get("documentType") ?? "") as CompanyDocumentType;
  if (!companyId) throw new Error("Company is required.");
  if (!documentType) throw new Error("Document type is required.");

  const company = await db.registeredCompany.findFirst({
    where: { id: companyId, ...companyEntityFilter(ctx) },
  });
  if (!company) throw new Error("Company not found.");

  const field =
    documentType === "REGISTRATION_COPY"
      ? "registrationCopyFiles"
      : documentType === "CHAMBER_COPY"
        ? "chamberCopyFiles"
        : documentType === "FINANCIALS"
          ? "financialsFiles"
          : "otherFiles";

  const files = getFilesFromFormData(formData, field);
  if (files.length === 0) throw new Error("At least one file is required.");

  await uploadCompanyFiles(
    companyId,
    files,
    documentType,
    ctx.id,
    documentType === "OTHER" ? "Other document" : undefined,
  );

  await logAudit({
    userId: ctx.id,
    action: "UPLOAD",
    resource: "CompanyDocument",
    resourceId: companyId,
    metadata: { documentType, count: files.length },
  });

  revalidatePath("/companies/" + companyId);
  revalidatePath("/companies");
}

export async function listCompanies() {
  const ctx = await requireModuleAccess("COMPANIES");
  return db.registeredCompany.findMany({
    where: companyEntityFilter(ctx),
    include: {
      entity: true,
      owners: { orderBy: { sortOrder: "asc" } },
      documents: { select: { id: true, documentType: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getCompany(id: string) {
  const ctx = await requireModuleAccess("COMPANIES");
  return db.registeredCompany.findFirst({
    where: { id, ...companyEntityFilter(ctx) },
    include: {
      entity: true,
      owners: { orderBy: { sortOrder: "asc" } },
      documents: { orderBy: { createdAt: "desc" } },
      asset: true,
    },
  });
}

export async function deleteCompanyDocument(id: string) {
  const ctx = await requireModuleAccess("COMPANIES");
  if (!canWrite(ctx, "COMPANIES")) {
    throw new Error("You do not have permission to delete company documents.");
  }

  const document = await db.companyDocument.findFirst({
    where: { id, company: companyEntityFilter(ctx) },
  });
  if (!document) throw new Error("Document not found.");

  await deleteBlobUrl(document.fileUrl);
  await db.companyDocument.delete({ where: { id } });

  await logAudit({
    userId: ctx.id,
    action: "DELETE",
    resource: "CompanyDocument",
    resourceId: id,
    metadata: { companyId: document.companyId },
  });

  revalidatePath("/companies/" + document.companyId);
  revalidatePath("/companies");
}

export async function deleteCompany(id: string) {
  const ctx = await requireModuleAccess("COMPANIES");
  if (!canWrite(ctx, "COMPANIES")) {
    throw new Error("You do not have permission to delete companies.");
  }

  const company = await db.registeredCompany.findFirst({
    where: { id, ...companyEntityFilter(ctx) },
    include: { documents: true },
  });
  if (!company) throw new Error("Company not found.");

  for (const doc of company.documents) {
    await deleteBlobUrl(doc.fileUrl);
  }

  const assetId = company.assetId;
  await db.registeredCompany.delete({ where: { id } });
  if (assetId) await db.asset.delete({ where: { id: assetId } });

  await logAudit({
    userId: ctx.id,
    action: "DELETE",
    resource: "RegisteredCompany",
    resourceId: id,
    metadata: { name: company.name },
  });

  revalidatePath("/companies");
  revalidatePath("/assets");
}
