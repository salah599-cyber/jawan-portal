"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit/log";
import { ensureTransferLettersSchema } from "@/lib/db/ensure-transfer-letters-schema";
import { buildAmountInWords } from "@/lib/transfer/amount-in-words";
import { parseDateInputToUtc } from "@/lib/transfer/format-letter-date";
import { canWrite, getModulePermission, requireModuleAccess } from "@/lib/permissions/access";
import type { UserContext } from "@/lib/permissions/types";
import {
  assertEnumValue,
  parseOrThrow,
  zRequiredDecimal,
  zRequiredString,
} from "@/lib/validation/primitives";
import type { TransferLetterType } from "@/lib/generated/prisma/client";

const TRANSFER_LETTER_TYPE_VALUES = ["LOCAL", "INTERNATIONAL", "UK"] as const satisfies readonly TransferLetterType[];

const transferLetterInclude = {
  entity: { select: { id: true, name: true } },
  sourceBankAccount: {
    select: { id: true, accountName: true, bankName: true, accountNumber: true },
  },
  beneficiaryBankAccount: {
    select: { id: true, accountName: true, bankName: true, accountNumber: true },
  },
  createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
} as const;

function transferLetterEntityFilter(ctx: UserContext) {
  const level = getModulePermission(ctx, "ASSETS");
  if (level === "FULL" || level === "READ") return {};
  if (level === "FILTERED") return { entityId: { in: ctx.entityIds } };
  return { id: "__none__" };
}

function assertEntityAccess(ctx: UserContext, entityId: string) {
  if (ctx.entityIds.length > 0 && !ctx.entityIds.includes(entityId)) {
    if (ctx.role !== "PRINCIPAL" && !ctx.isSuperAdmin) {
      throw new Error("You do not have access to this entity.");
    }
  }
}

function readTransferLetterFormData(formData: FormData) {
  const type = assertEnumValue(
    String(formData.get("type") ?? "LOCAL"),
    TRANSFER_LETTER_TYPE_VALUES,
    "Transfer type",
  );
  const entityId = parseOrThrow(zRequiredString("Entity"), formData.get("entityId") ?? "");
  const letterDateStr = parseOrThrow(zRequiredString("Letter date"), formData.get("letterDate") ?? "");
  const letterDate = parseDateInputToUtc(letterDateStr);
  const amount = parseOrThrow(zRequiredDecimal("Amount", { min: 0.01 }), formData.get("amount") ?? "");
  const currency = String(formData.get("currency") ?? "OMR").trim() || "OMR";

  const sourceMode = String(formData.get("sourceMode") ?? "bank");
  const sourceBankAccountIdRaw = String(formData.get("sourceBankAccountId") ?? "").trim();
  const sourceBankName = parseOrThrow(zRequiredString("Source bank name"), formData.get("sourceBankName") ?? "");
  const sourceAccountNumber = parseOrThrow(
    zRequiredString("Source account number"),
    formData.get("sourceAccountNumber") ?? "",
  );

  const beneficiaryMode = String(formData.get("beneficiaryMode") ?? "manual");
  const beneficiaryBankAccountIdRaw = String(formData.get("beneficiaryBankAccountId") ?? "").trim();

  const beneficiaryBankName = parseOrThrow(
    zRequiredString("Beneficiary bank"),
    formData.get("beneficiaryBankName") ?? "",
  );
  const beneficiaryName = parseOrThrow(
    zRequiredString("Beneficiary name"),
    formData.get("beneficiaryName") ?? "",
  );

  return {
    type,
    entityId,
    letterDate,
    amount,
    currency,
    amountInWords: buildAmountInWords(amount, currency, type),
    sourceBankAccountId: sourceMode === "bank" && sourceBankAccountIdRaw ? sourceBankAccountIdRaw : null,
    sourceBankName: sourceBankName.trim(),
    sourceBranch: String(formData.get("sourceBranch") ?? "").trim() || null,
    sourceAccountNumber: sourceAccountNumber.trim(),
    beneficiaryBankAccountId:
      beneficiaryMode === "bank" && beneficiaryBankAccountIdRaw ? beneficiaryBankAccountIdRaw : null,
    beneficiaryBankName: beneficiaryBankName.trim(),
    beneficiaryName: beneficiaryName.trim(),
    beneficiaryAccountNumber: String(formData.get("beneficiaryAccountNumber") ?? "").trim() || null,
    beneficiaryIban: String(formData.get("beneficiaryIban") ?? "").trim() || null,
    beneficiarySortCode: String(formData.get("beneficiarySortCode") ?? "").trim() || null,
    beneficiarySwiftCode: String(formData.get("beneficiarySwiftCode") ?? "").trim() || null,
    purpose: String(formData.get("purpose") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
    mobileNo: String(formData.get("mobileNo") ?? "").trim() || null,
    email: String(formData.get("email") ?? "").trim() || null,
    specialInstructions: String(formData.get("specialInstructions") ?? "").trim() || null,
    chargesOnBeneficiary: formData.get("chargesOnBeneficiary") === "on" || formData.get("chargesOnBeneficiary") === "true",
  };
}

export async function listTransferLetters() {
  const ctx = await requireModuleAccess("ASSETS");
  await ensureTransferLettersSchema();

  return db.transferLetter.findMany({
    where: { deletedAt: null, ...transferLetterEntityFilter(ctx) },
    include: transferLetterInclude,
    orderBy: [{ letterDate: "desc" }, { serialNumber: "desc" }],
  });
}

export async function getTransferLetter(id: string) {
  const ctx = await requireModuleAccess("ASSETS");
  await ensureTransferLettersSchema();

  return db.transferLetter.findFirst({
    where: { id, deletedAt: null, ...transferLetterEntityFilter(ctx) },
    include: transferLetterInclude,
  });
}

export async function listTransferLetterBankAccountOptions() {
  const ctx = await requireModuleAccess("ASSETS");
  const filter = transferLetterEntityFilter(ctx);
  const where =
    "entityId" in filter && filter.entityId && typeof filter.entityId === "object"
      ? { OR: [{ entityId: filter.entityId }, { entityId: null }] }
      : {};

  return db.bankAccount.findMany({
    where,
    select: {
      id: true,
      accountName: true,
      bankName: true,
      accountNumber: true,
      iban: true,
      sortCode: true,
      swiftCode: true,
      entityId: true,
      currency: true,
      notes: true,
      accountNumbers: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          accountNumber: true,
          iban: true,
          currency: true,
          label: true,
        },
      },
    },
    orderBy: [{ bankName: "asc" }, { accountName: "asc" }],
  });
}

export async function createTransferLetter(formData: FormData) {
  const ctx = await requireModuleAccess("ASSETS");
  if (!canWrite(ctx, "ASSETS")) {
    throw new Error("You do not have permission to create transfer letters.");
  }

  await ensureTransferLettersSchema();
  const data = readTransferLetterFormData(formData);
  assertEntityAccess(ctx, data.entityId);

  const letter = await db.transferLetter.create({
    data: {
      ...data,
      createdById: ctx.id,
    },
  });

  await logAudit({
    userId: ctx.id,
    action: "TRANSFER_LETTER_CREATED",
    resource: "TransferLetter",
    resourceId: letter.id,
    metadata: {
      type: letter.type,
      amount: letter.amount.toString(),
      currency: letter.currency,
      serialNumber: letter.serialNumber,
    },
  });

  revalidatePath("/transfer-letters");
  return letter;
}

export async function updateTransferLetter(id: string, formData: FormData) {
  const ctx = await requireModuleAccess("ASSETS");
  if (!canWrite(ctx, "ASSETS")) {
    throw new Error("You do not have permission to update transfer letters.");
  }

  await ensureTransferLettersSchema();
  const existing = await getTransferLetter(id);
  if (!existing) throw new Error("Transfer letter not found.");

  const data = readTransferLetterFormData(formData);
  assertEntityAccess(ctx, data.entityId);

  const letter = await db.transferLetter.update({
    where: { id },
    data,
  });

  await logAudit({
    userId: ctx.id,
    action: "TRANSFER_LETTER_UPDATED",
    resource: "TransferLetter",
    resourceId: letter.id,
  });

  revalidatePath("/transfer-letters");
  revalidatePath("/transfer-letters/" + id);
  return letter;
}

export async function deleteTransferLetter(id: string) {
  const ctx = await requireModuleAccess("ASSETS");
  if (!canWrite(ctx, "ASSETS")) {
    throw new Error("You do not have permission to delete transfer letters.");
  }

  await ensureTransferLettersSchema();
  const existing = await getTransferLetter(id);
  if (!existing) throw new Error("Transfer letter not found.");

  await db.transferLetter.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  await logAudit({
    userId: ctx.id,
    action: "TRANSFER_LETTER_DELETED",
    resource: "TransferLetter",
    resourceId: id,
  });

  revalidatePath("/transfer-letters");
}
