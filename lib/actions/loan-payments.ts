"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { deleteBlobUrl, uploadPrivateFile } from "@/lib/blob";
import { logAudit } from "@/lib/audit/log";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { loanEntityFilter } from "@/lib/permissions/scoped-queries";
import type { LoanPaymentMethod } from "@/lib/generated/prisma/client";

function parseDecimal(value?: string | null) {
  if (!value || value.trim() === "") return undefined;
  return value.trim();
}

function parseDate(value?: string | null) {
  if (!value || value.trim() === "") return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date;
}

function getFilesFromFormData(formData: FormData, field: string): File[] {
  return formData
    .getAll(field)
    .filter((item): item is File => item instanceof File && item.size > 0);
}

function currentBalance(loan: { outstandingBalance: { toString(): string } | null; amount: { toString(): string } }) {
  const raw = loan.outstandingBalance?.toString() ?? loan.amount.toString();
  return parseFloat(raw);
}

async function uploadPaymentFiles(
  paymentId: string,
  liabilityId: string,
  files: File[],
  uploadedById: string,
) {
  for (const file of files) {
    const uploaded = await uploadPrivateFile(["loans", liabilityId, "payments", paymentId], file);
    try {
      await db.loanPaymentDocument.create({
        data: {
          paymentId,
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

function readPaymentFields(formData: FormData, loanCurrency: string) {
  const amount = parseDecimal(String(formData.get("amount") ?? ""));
  const paymentDateRaw = String(formData.get("paymentDate") ?? "").trim();
  const paymentMethod = String(formData.get("paymentMethod") ?? "BANK_TRANSFER") as LoanPaymentMethod;
  const principalPortion = parseDecimal(String(formData.get("principalPortion") ?? ""));
  const interestPortion = parseDecimal(String(formData.get("interestPortion") ?? ""));

  if (!amount) throw new Error("Payment amount is required.");
  const amountNum = parseFloat(amount);
  if (Number.isNaN(amountNum) || amountNum <= 0) throw new Error("Payment amount must be greater than zero.");

  const paymentDate = parseDate(paymentDateRaw);
  if (!paymentDate) throw new Error("Payment date is required.");

  if (principalPortion || interestPortion) {
    if (!principalPortion || !interestPortion) {
      throw new Error("Enter both principal and interest portions, or leave both blank.");
    }
    const sum = parseFloat(principalPortion) + parseFloat(interestPortion);
    if (Math.abs(sum - amountNum) > 0.01) {
      throw new Error("Principal and interest portions must sum to the payment amount.");
    }
  }

  return {
    amount,
    paymentDate,
    currency: String(formData.get("currency") ?? loanCurrency).trim() || loanCurrency,
    paymentMethod,
    principalPortion,
    interestPortion,
    reference: String(formData.get("reference") ?? "").trim() || undefined,
    notes: String(formData.get("notes") ?? "").trim() || undefined,
  };
}

export async function recordLoanPayment(formData: FormData) {
  const ctx = await requireModuleAccess("LOANS");
  if (!canWrite(ctx, "LOANS")) {
    throw new Error("You do not have permission to record loan payments.");
  }

  const liabilityId = String(formData.get("liabilityId") ?? "").trim();
  if (!liabilityId) throw new Error("Loan is required.");

  const loan = await db.liability.findFirst({
    where: { id: liabilityId, ...loanEntityFilter(ctx) },
  });
  if (!loan) throw new Error("Loan not found.");
  if (loan.status !== "ACTIVE") {
    throw new Error("Payments can only be recorded on active loans.");
  }

  const fields = readPaymentFields(formData, loan.currency);
  const balance = currentBalance(loan);
  const amountNum = parseFloat(fields.amount);

  if (amountNum > balance + 0.001) {
    throw new Error("Payment amount cannot exceed the outstanding balance.");
  }

  const newBalance = Math.max(0, balance - amountNum);
  const paidOff = newBalance <= 0.001;

  const payment = await db.loanPayment.create({
    data: {
      liabilityId,
      paymentDate: fields.paymentDate,
      amount: fields.amount,
      currency: fields.currency,
      principalPortion: fields.principalPortion,
      interestPortion: fields.interestPortion,
      paymentMethod: fields.paymentMethod,
      reference: fields.reference,
      notes: fields.notes,
      balanceAfter: newBalance.toFixed(2),
      recordedById: ctx.id,
    },
  });

  await db.liability.update({
    where: { id: liabilityId },
    data: {
      outstandingBalance: newBalance.toFixed(2),
      lastPaymentAt: fields.paymentDate,
      status: paidOff ? "PAID_OFF" : "ACTIVE",
    },
  });

  const receiptFiles = getFilesFromFormData(formData, "receiptFiles");
  if (receiptFiles.length > 0) {
    await uploadPaymentFiles(payment.id, liabilityId, receiptFiles, ctx.id);
  }

  await logAudit({
    userId: ctx.id,
    action: "CREATE",
    resource: "LoanPayment",
    resourceId: payment.id,
    metadata: { liabilityId, amount: fields.amount, balanceAfter: newBalance.toFixed(2) },
  });

  revalidatePath("/loans");
  revalidatePath("/loans/" + liabilityId);
  revalidatePath("/dashboard");
  return payment;
}

export async function deleteLoanPayment(id: string) {
  const ctx = await requireModuleAccess("LOANS");
  if (!canWrite(ctx, "LOANS")) {
    throw new Error("You do not have permission to delete loan payments.");
  }

  const payment = await db.loanPayment.findFirst({
    where: { id, liability: loanEntityFilter(ctx) },
    include: { documents: true, liability: true },
  });
  if (!payment) throw new Error("Payment not found.");

  for (const doc of payment.documents) {
    await deleteBlobUrl(doc.fileUrl);
  }

  await db.loanPayment.delete({ where: { id } });

  const remaining = await db.loanPayment.findMany({
    where: { liabilityId: payment.liabilityId },
    orderBy: [{ paymentDate: "desc" }, { createdAt: "desc" }],
  });

  let newBalance: number;
  let lastPaymentAt: Date | null = null;

  if (remaining.length === 0) {
    newBalance = parseFloat(payment.liability.amount.toString());
  } else {
    newBalance = parseFloat(remaining[0].balanceAfter.toString());
    lastPaymentAt = remaining[0].paymentDate;
  }

  await db.liability.update({
    where: { id: payment.liabilityId },
    data: {
      outstandingBalance: newBalance.toFixed(2),
      lastPaymentAt,
      status: newBalance <= 0.001 ? "PAID_OFF" : "ACTIVE",
    },
  });

  await logAudit({
    userId: ctx.id,
    action: "DELETE",
    resource: "LoanPayment",
    resourceId: id,
    metadata: { liabilityId: payment.liabilityId, amount: payment.amount.toString() },
  });

  revalidatePath("/loans");
  revalidatePath("/loans/" + payment.liabilityId);
  revalidatePath("/dashboard");
}

export async function deleteLoanPaymentDocument(id: string) {
  const ctx = await requireModuleAccess("LOANS");
  if (!canWrite(ctx, "LOANS")) {
    throw new Error("You do not have permission to delete payment documents.");
  }

  const document = await db.loanPaymentDocument.findFirst({
    where: { id, payment: { liability: loanEntityFilter(ctx) } },
    include: { payment: true },
  });
  if (!document) throw new Error("Document not found.");

  await deleteBlobUrl(document.fileUrl);
  await db.loanPaymentDocument.delete({ where: { id } });

  revalidatePath("/loans/" + document.payment.liabilityId);
}
