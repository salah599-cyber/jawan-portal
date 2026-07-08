"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { deleteBlobUrl, uploadPrivateFile } from "@/lib/blob";
import { logAudit } from "@/lib/audit/log";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { assetEntityFilter, loanEntityFilter } from "@/lib/permissions/scoped-queries";
import {
  assertEnumValue,
  parseOrThrow,
  zOptionalDate,
  zOptionalDecimal,
  zRequiredDecimal,
  zRequiredString,
} from "@/lib/validation/primitives";
import type {
  LiabilityStatus,
  LiabilityType,
  LoanDocumentType,
  PaymentFrequency,
} from "@/lib/generated/prisma/client";

const LIABILITY_TYPE_VALUES = ["MORTGAGE", "LOAN", "CREDIT", "OTHER"] as const satisfies readonly LiabilityType[];
const LIABILITY_STATUS_VALUES = ["ACTIVE", "PAID_OFF", "DEFAULTED"] as const satisfies readonly LiabilityStatus[];
const PAYMENT_FREQUENCY_VALUES = [
  "MONTHLY",
  "QUARTERLY",
  "SEMI_ANNUAL",
  "ANNUAL",
  "BULLET",
  "OTHER",
] as const satisfies readonly PaymentFrequency[];

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
  const name = parseOrThrow(zRequiredString("Loan name"), formData.get("name") ?? "");
  const type = assertEnumValue(String(formData.get("type") ?? "LOAN"), LIABILITY_TYPE_VALUES, "Type");
  const status = assertEnumValue(String(formData.get("status") ?? "ACTIVE"), LIABILITY_STATUS_VALUES, "Status");
  const entityId = parseOrThrow(zRequiredString("Entity"), formData.get("entityId") ?? "");
  const amount = parseOrThrow(zRequiredDecimal("Principal amount", { min: 0 }), formData.get("amount") ?? "");
  const assetIdRaw = String(formData.get("assetId") ?? "").trim();
  const paymentFrequencyRaw = String(formData.get("paymentFrequency") ?? "").trim();
  const paymentFrequency = paymentFrequencyRaw
    ? assertEnumValue(paymentFrequencyRaw, PAYMENT_FREQUENCY_VALUES, "Payment frequency")
    : undefined;

  return {
    name,
    type,
    status,
    entityId,
    amount,
    outstandingBalance: parseOrThrow(
      zOptionalDecimal("Outstanding balance", { min: 0 }),
      formData.get("outstandingBalance") ?? "",
    ),
    currency: String(formData.get("currency") ?? "OMR").trim() || "OMR",
    interestRate: parseOrThrow(zOptionalDecimal("Interest rate", { min: 0 }), formData.get("interestRate") ?? ""),
    startDate: parseOrThrow(zOptionalDate("Start date"), formData.get("startDate") ?? ""),
    maturityDate: parseOrThrow(zOptionalDate("Maturity date"), formData.get("maturityDate") ?? ""),
    paymentAmount: parseOrThrow(zOptionalDecimal("Payment amount", { min: 0 }), formData.get("paymentAmount") ?? ""),
    paymentFrequency,
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
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (!(file instanceof File) || file.size === 0) continue;

    const uploaded = await uploadPrivateFile(["loans", liabilityId, documentType.toLowerCase()], file);
    try {
      await db.loanDocument.create({
        data: {
          liabilityId,
          documentType,
          label: labelPrefix ? labelPrefix + " " + (i + 1) : uploaded.fileName,
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
    metadata: { documentType, count: files.length, fileNames: files.map((f) => f.name) },
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
    metadata: { liabilityId: document.liabilityId, fileName: document.fileName },
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
