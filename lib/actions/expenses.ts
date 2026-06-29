"use server";

import { put } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { deleteBlobUrl } from "@/lib/blob";
import { logAudit } from "@/lib/audit/log";
import { createExpenseType, resolveExpenseType } from "@/lib/data/expense-types";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { expenseEntityFilter } from "@/lib/permissions/scoped-queries";
import type { ExpenseAttachmentType, ExpenseStatus } from "@/lib/generated/prisma/client";

export type CreateExpenseInput = {
  title: string;
  amount: string;
  currency: string;
  expenseTypeId: string;
  status: ExpenseStatus;
  dueDate?: string;
  isRecurring: boolean;
  entityId?: string;
};

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function getFilesFromFormData(formData: FormData, field: string): File[] {
  return formData
    .getAll(field)
    .filter((item): item is File => item instanceof File && item.size > 0);
}

async function uploadExpenseFiles(
  expenseId: string,
  files: File[],
  attachmentType: ExpenseAttachmentType,
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
      "expenses/" +
      expenseId +
      "/" +
      attachmentType.toLowerCase() +
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

    await db.expenseAttachment.create({
      data: {
        expenseId,
        attachmentType,
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

function readExpenseFields(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const amount = String(formData.get("amount") ?? "").trim();
  const currency = String(formData.get("currency") ?? "OMR").trim() || "OMR";
  const expenseTypeId = String(formData.get("expenseTypeId") ?? "").trim();
  const status = String(formData.get("status") ?? "PENDING") as ExpenseStatus;
  const dueDateRaw = String(formData.get("dueDate") ?? "").trim();
  const entityIdRaw = String(formData.get("entityId") ?? "").trim();
  const isRecurring = formData.get("isRecurring") === "true" || formData.get("isRecurring") === "on";

  if (!title) throw new Error("Title is required.");
  if (!amount || Number.isNaN(parseFloat(amount))) throw new Error("A valid amount is required.");
  if (!expenseTypeId) throw new Error("Expense type is required.");

  return {
    title,
    amount,
    currency,
    expenseTypeId,
    status,
    dueDate: dueDateRaw ? new Date(dueDateRaw) : undefined,
    entityId: entityIdRaw || undefined,
    isRecurring,
  };
}

function assertEntityAccess(ctx: Awaited<ReturnType<typeof requireModuleAccess>>, entityId?: string) {
  if (
    entityId &&
    ctx.entityIds.length > 0 &&
    !ctx.entityIds.includes(entityId)
  ) {
    throw new Error("You do not have access to this entity.");
  }
}

export async function addExpenseType(name: string) {
  const ctx = await requireModuleAccess("EXPENSES");
  if (!canWrite(ctx, "EXPENSES")) {
    throw new Error("You do not have permission to add expense types.");
  }

  const type = await createExpenseType(name);

  await logAudit({
    userId: ctx.id,
    action: "CREATE",
    resource: "ExpenseType",
    resourceId: type.id,
    metadata: { name: type.name },
  });

  revalidatePath("/expenses");
  return type;
}

export async function createExpense(formData: FormData) {
  const ctx = await requireModuleAccess("EXPENSES");
  if (!canWrite(ctx, "EXPENSES")) {
    throw new Error("You do not have permission to create expenses.");
  }

  const fields = readExpenseFields(formData);
  assertEntityAccess(ctx, fields.entityId);

  const expenseType = await resolveExpenseType(fields.expenseTypeId);

  const expense = await db.expense.create({
    data: {
      title: fields.title,
      amount: fields.amount,
      currency: fields.currency,
      category: expenseType.name,
      expenseTypeId: expenseType.id,
      status: fields.status,
      dueDate: fields.dueDate,
      isRecurring: fields.isRecurring,
      entityId: fields.entityId,
    },
  });

  const invoiceFiles = getFilesFromFormData(formData, "invoiceFiles");
  const paymentSlipFiles = getFilesFromFormData(formData, "paymentSlipFiles");
  const chequeFiles = getFilesFromFormData(formData, "chequeFiles");

  if (invoiceFiles.length) await uploadExpenseFiles(expense.id, invoiceFiles, "INVOICE", ctx.id);
  if (paymentSlipFiles.length) {
    await uploadExpenseFiles(expense.id, paymentSlipFiles, "PAYMENT_SLIP", ctx.id);
  }
  if (chequeFiles.length) await uploadExpenseFiles(expense.id, chequeFiles, "CHEQUE_COPY", ctx.id);

  await logAudit({
    userId: ctx.id,
    action: "CREATE",
    resource: "Expense",
    resourceId: expense.id,
    metadata: { title: expense.title, amount: expense.amount.toString() },
  });

  revalidatePath("/expenses");
  revalidatePath("/dashboard");
  return expense;
}

export async function createExpenseFromInput(input: CreateExpenseInput) {
  const formData = new FormData();
  formData.set("title", input.title);
  formData.set("amount", input.amount);
  formData.set("currency", input.currency);
  formData.set("expenseTypeId", input.expenseTypeId);
  formData.set("status", input.status);
  if (input.dueDate) formData.set("dueDate", input.dueDate);
  formData.set("isRecurring", input.isRecurring ? "true" : "false");
  if (input.entityId) formData.set("entityId", input.entityId);
  return createExpense(formData);
}

export async function listExpenses() {
  const ctx = await requireModuleAccess("EXPENSES");
  return db.expense.findMany({
    where: expenseEntityFilter(ctx),
    include: {
      entity: true,
      expenseType: true,
      attachments: { select: { id: true, attachmentType: true } },
    },
    orderBy: { dueDate: "desc" },
  });
}

export async function getExpense(id: string) {
  const ctx = await requireModuleAccess("EXPENSES");
  return db.expense.findFirst({
    where: { id, ...expenseEntityFilter(ctx) },
    include: {
      entity: true,
      expenseType: true,
      attachments: { orderBy: { createdAt: "desc" } },
    },
  });
}

export async function uploadExpenseAttachments(formData: FormData) {
  const ctx = await requireModuleAccess("EXPENSES");
  if (!canWrite(ctx, "EXPENSES")) {
    throw new Error("You do not have permission to upload expense attachments.");
  }

  const expenseId = String(formData.get("expenseId") ?? "").trim();
  const attachmentType = String(formData.get("attachmentType") ?? "") as ExpenseAttachmentType;
  if (!expenseId) throw new Error("Expense is required.");
  if (!attachmentType) throw new Error("Attachment type is required.");

  const expense = await db.expense.findFirst({
    where: { id: expenseId, ...expenseEntityFilter(ctx) },
  });
  if (!expense) throw new Error("Expense not found.");

  const field =
    attachmentType === "INVOICE"
      ? "invoiceFiles"
      : attachmentType === "PAYMENT_SLIP"
        ? "paymentSlipFiles"
        : attachmentType === "CHEQUE_COPY"
          ? "chequeFiles"
          : "otherFiles";

  const files = getFilesFromFormData(formData, field);
  if (files.length === 0) throw new Error("At least one file is required.");

  await uploadExpenseFiles(
    expenseId,
    files,
    attachmentType,
    ctx.id,
    attachmentType === "OTHER" ? "Other document" : undefined,
  );

  await logAudit({
    userId: ctx.id,
    action: "UPLOAD",
    resource: "ExpenseAttachment",
    resourceId: expenseId,
    metadata: { attachmentType, count: files.length },
  });

  revalidatePath("/expenses/" + expenseId);
  revalidatePath("/expenses");
}

export async function deleteExpenseAttachment(id: string) {
  const ctx = await requireModuleAccess("EXPENSES");
  if (!canWrite(ctx, "EXPENSES")) {
    throw new Error("You do not have permission to delete expense attachments.");
  }

  const attachment = await db.expenseAttachment.findFirst({
    where: { id, expense: expenseEntityFilter(ctx) },
  });
  if (!attachment) throw new Error("Attachment not found.");

  await deleteBlobUrl(attachment.fileUrl);
  await db.expenseAttachment.delete({ where: { id } });

  await logAudit({
    userId: ctx.id,
    action: "DELETE",
    resource: "ExpenseAttachment",
    resourceId: id,
    metadata: { expenseId: attachment.expenseId },
  });

  revalidatePath("/expenses/" + attachment.expenseId);
  revalidatePath("/expenses");
}

export async function deleteExpense(id: string) {
  const ctx = await requireModuleAccess("EXPENSES");
  if (!canWrite(ctx, "EXPENSES")) {
    throw new Error("You do not have permission to delete expenses.");
  }

  const expense = await db.expense.findFirst({
    where: { id, ...expenseEntityFilter(ctx) },
    include: { attachments: true },
  });
  if (!expense) throw new Error("Expense not found.");

  for (const attachment of expense.attachments) {
    await deleteBlobUrl(attachment.fileUrl);
  }

  await db.expense.delete({ where: { id } });

  await logAudit({
    userId: ctx.id,
    action: "DELETE",
    resource: "Expense",
    resourceId: id,
    metadata: { title: expense.title },
  });

  revalidatePath("/expenses");
  revalidatePath("/dashboard");
}

export async function updateExpense(id: string, input: CreateExpenseInput) {
  const ctx = await requireModuleAccess("EXPENSES");
  if (!canWrite(ctx, "EXPENSES")) {
    throw new Error("You do not have permission to update expenses.");
  }

  const expense = await db.expense.findFirst({
    where: { id, ...expenseEntityFilter(ctx) },
  });
  if (!expense) throw new Error("Expense not found.");

  assertEntityAccess(ctx, input.entityId);

  const amount = input.amount.trim();
  if (!amount || Number.isNaN(parseFloat(amount))) {
    throw new Error("A valid amount is required.");
  }

  const expenseType = await resolveExpenseType(input.expenseTypeId);

  const updated = await db.expense.update({
    where: { id },
    data: {
      title: input.title.trim(),
      amount,
      currency: input.currency || "OMR",
      category: expenseType.name,
      expenseTypeId: expenseType.id,
      status: input.status,
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      isRecurring: input.isRecurring,
      entityId: input.entityId || null,
    },
  });

  await logAudit({
    userId: ctx.id,
    action: "UPDATE",
    resource: "Expense",
    resourceId: id,
    metadata: { title: updated.title },
  });

  revalidatePath("/expenses");
  revalidatePath("/expenses/" + id);
  revalidatePath("/expenses/" + id + "/edit");
  revalidatePath("/dashboard");
  return updated;
}
