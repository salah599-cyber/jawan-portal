"use server";

import { put } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { deleteBlobUrl } from "@/lib/blob";
import { logAudit } from "@/lib/audit/log";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { assetEntityFilter, loanEntityFilter } from "@/lib/permissions/scoped-queries";
import type {
  LiabilityStatus,
  LiabilityType,
  LoanDocumentType,
  PaymentFrequency,
} from "@/lib/generated/prisma/client";

function parseDate(value?: string | null) {
  if (!value || value.trim() === "") return undefined;
  return new Date(value);
}

function parseDecimal(value?: string | null) {
  if (!value || value.trim() === "") return undefined;
  return value.trim();
}

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

function readLoanFormData(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "LOAN") as LiabilityType;
  const status = String(formData.get("status") ?? "ACTIVE") as LiabilityStatus;
  const entityId = String(formData.get("entityId") ?? "").trim();
  const amount = parseDecimal(String(formData.get("amount") ?? ""));
  const assetIdRaw = String(formData.get("assetId") ?? "").trim();
  const paymentFrequencyRaw = String(formData.get("paymentFrequency") ?? "").trim();

  if (!name) throw new Error("Loan name is required.");
  if (!entityId) throw new Error("Entity is required.");
  if (!amount) throw new Error("Principal amount is required.");

  return {
    name,
    type,
    status,
    entityId,
    amount,
    outstandingBalance: parseDecimal(String(formData.get("outstandingBalance") ?? "")),
    currency: String(formData.get("currency") ?? "OMR").trim() || "OMR",
    interestRate: parseDecimal(String(formData.get("interestRate") ?? "")),
    startDate: parseDate(String(formData.get("startDate") ?? "")),
    maturityDate: parseDate(String(formData.get("maturityDate") ?? "")),
    paymentAmount: parseDecimal(String(formData.get("paymentAmount") ?? "")),
    paymentFrequency: (paymentFrequencyRaw || undefined) as PaymentFrequency | undefined,
    lender: String(formData.get("lender") ?? "").trim() || undefined,
    accountReference: String(formData.get("accountReference") ?? "").trim() || undefined,
    contactName: String(formData.get("contactName") ?? "").trim() || undefined,
    contactEmail: String(formData.get("contactEmail") ?? "").trim() || undefined,
    contactPhone: String(formData.get("contactPhone") ?? "").trim() || undefined,
    notes: String(formData.get("notes") ?? "").trim() || undefined,
    assetId: assetIdRaw && assetIdRaw !== "none" ? assetIdRaw : undefined,
  };
}

async function uploadLoanFiles(
  liabilityId: string,
  files: File[],
  documentType: LoanDocumentType,
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
      "loans/" +
      liabilityId +
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

    await db.loanDocument.create({
      data: {
        liabilityId,
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

export async function createLoan(formData: FormData) {
  const ctx = await requireModuleAccess("LOANS");
  if (!canWrite(ctx, "LOANS")) {
    throw new Error("You do not have permission to register loans.");
  }

  const data = readLoanFormData(formData);
  assertEntityAccess(ctx, data.entityId);

  if (data.assetId) {
    const asset = await db.asset.findFirst({
      where: { id: data.assetId, ...assetEntityFilter(ctx) },
    });
    if (!asset) throw new Error("Linked asset not found.");
  }

  const loan = await db.liability.create({
    data: {
      ...data,
      outstandingBalance: data.outstandingBalance ?? data.amount,
    },
  });

  const agreementFiles = getFilesFromFormData(formData, "agreementFiles");
  const scheduleFiles = getFilesFromFormData(formData, "scheduleFiles");
  const statementFiles = getFilesFromFormData(formData, "statementFiles");
  const otherFiles = getFilesFromFormData(formData, "otherFiles");

  if (agreementFiles.length) {
    await uploadLoanFiles(loan.id, agreementFiles, "LOAN_AGREEMENT", ctx.id);
  }
  if (scheduleFiles.length) {
    await uploadLoanFiles(loan.id, scheduleFiles, "PAYMENT_SCHEDULE", ctx.id);
  }
  if (statementFiles.length) {
    await uploadLoanFiles(loan.id, statementFiles, "STATEMENT", ctx.id);
  }
  if (otherFiles.length) {
    await uploadLoanFiles(loan.id, otherFiles, "OTHER", ctx.id, "Other document");
  }

  await logAudit({
    userId: ctx.id,
    action: "CREATE",
    resource: "Liability",
    resourceId: loan.id,
    metadata: { name: loan.name, type: loan.type },
  });

  revalidatePath("/loans");
  revalidatePath("/dashboard");
  return loan;
}

export async function updateLoan(id: string, formData: FormData) {
  const ctx = await requireModuleAccess("LOANS");
  if (!canWrite(ctx, "LOANS")) {
    throw new Error("You do not have permission to update loans.");
  }

  const existing = await db.liability.findFirst({
    where: { id, ...loanEntityFilter(ctx) },
  });
  if (!existing) throw new Error("Loan not found.");

  const data = readLoanFormData(formData);
  assertEntityAccess(ctx, data.entityId);

  if (data.assetId) {
    const asset = await db.asset.findFirst({
      where: { id: data.assetId, ...assetEntityFilter(ctx) },
    });
    if (!asset) throw new Error("Linked asset not found.");
  }

  const hasPayments = (await db.loanPayment.count({ where: { liabilityId: id } })) > 0;

  const loan = await db.liability.update({
    where: { id },
    data: {
      ...data,
      outstandingBalance: hasPayments
        ? undefined
        : data.outstandingBalance ?? data.amount,
      paymentFrequency: data.paymentFrequency ?? null,
      assetId: data.assetId ?? null,
    },
  });

  await logAudit({
    userId: ctx.id,
    action: "UPDATE",
    resource: "Liability",
    resourceId: id,
    metadata: { name: loan.name },
  });

  revalidatePath("/loans");
  revalidatePath("/loans/" + id);
  revalidatePath("/loans/" + id + "/edit");
  revalidatePath("/dashboard");
  return loan;
}

export async function uploadLoanDocuments(formData: FormData) {
  const ctx = await requireModuleAccess("LOANS");
  if (!canWrite(ctx, "LOANS")) {
    throw new Error("You do not have permission to upload loan documents.");
  }

  const liabilityId = String(formData.get("liabilityId") ?? "").trim();
  const documentType = String(formData.get("documentType") ?? "") as LoanDocumentType;
  if (!liabilityId) throw new Error("Loan is required.");
  if (!documentType) throw new Error("Document type is required.");

  const loan = await db.liability.findFirst({
    where: { id: liabilityId, ...loanEntityFilter(ctx) },
  });
  if (!loan) throw new Error("Loan not found.");

  const field =
    documentType === "LOAN_AGREEMENT"
      ? "agreementFiles"
      : documentType === "PAYMENT_SCHEDULE"
        ? "scheduleFiles"
        : documentType === "STATEMENT"
          ? "statementFiles"
          : "otherFiles";

  const files = getFilesFromFormData(formData, field);
  if (files.length === 0) throw new Error("At least one file is required.");

  await uploadLoanFiles(
    liabilityId,
    files,
    documentType,
    ctx.id,
    documentType === "OTHER" ? "Other document" : undefined,
  );

  await logAudit({
    userId: ctx.id,
    action: "UPLOAD",
    resource: "LoanDocument",
    resourceId: liabilityId,
    metadata: { documentType, count: files.length },
  });

  revalidatePath("/loans/" + liabilityId);
  revalidatePath("/loans");
}

export async function listLoans() {
  const ctx = await requireModuleAccess("LOANS");
  return db.liability.findMany({
    where: loanEntityFilter(ctx),
    include: {
      entity: true,
      asset: { select: { id: true, name: true } },
      documents: { select: { id: true, documentType: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getLoan(id: string) {
  const ctx = await requireModuleAccess("LOANS");
  return db.liability.findFirst({
    where: { id, ...loanEntityFilter(ctx) },
    include: {
      entity: true,
      asset: true,
      documents: { orderBy: { createdAt: "desc" } },
      payments: {
        include: { documents: { orderBy: { createdAt: "desc" } } },
        orderBy: [{ paymentDate: "desc" }, { createdAt: "desc" }],
      },
    },
  });
}

export async function listLoanAssetOptions() {
  const ctx = await requireModuleAccess("LOANS");
  return db.asset.findMany({
    where: assetEntityFilter(ctx),
    select: { id: true, name: true, entityId: true },
    orderBy: { name: "asc" },
  });
}

export async function deleteLoanDocument(id: string) {
  const ctx = await requireModuleAccess("LOANS");
  if (!canWrite(ctx, "LOANS")) {
    throw new Error("You do not have permission to delete loan documents.");
  }

  const document = await db.loanDocument.findFirst({
    where: { id, liability: loanEntityFilter(ctx) },
  });
  if (!document) throw new Error("Document not found.");

  await deleteBlobUrl(document.fileUrl);
  await db.loanDocument.delete({ where: { id } });

  await logAudit({
    userId: ctx.id,
    action: "DELETE",
    resource: "LoanDocument",
    resourceId: id,
    metadata: { liabilityId: document.liabilityId },
  });

  revalidatePath("/loans/" + document.liabilityId);
  revalidatePath("/loans");
}

export async function deleteLoan(id: string) {
  const ctx = await requireModuleAccess("LOANS");
  if (!canWrite(ctx, "LOANS")) {
    throw new Error("You do not have permission to delete loans.");
  }

  const loan = await db.liability.findFirst({
    where: { id, ...loanEntityFilter(ctx) },
    include: { documents: true },
  });
  if (!loan) throw new Error("Loan not found.");

  for (const doc of loan.documents) {
    await deleteBlobUrl(doc.fileUrl);
  }

  await db.liability.delete({ where: { id } });

  await logAudit({
    userId: ctx.id,
    action: "DELETE",
    resource: "Liability",
    resourceId: id,
    metadata: { name: loan.name },
  });

  revalidatePath("/loans");
  revalidatePath("/dashboard");
}
