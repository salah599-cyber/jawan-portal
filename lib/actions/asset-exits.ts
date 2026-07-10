"use server";

import { revalidatePath } from "next/cache";
import { db, type DbClient } from "@/lib/db";
import { deleteBlobUrl, uploadPrivateFile } from "@/lib/blob";
import { logAudit } from "@/lib/audit/log";
import { ensureExitRoiSchema } from "@/lib/db/ensure-exit-roi-schema";
import { ensureExitSettlementSchema } from "@/lib/db/ensure-exit-settlement-schema";
import { parkExitProceedsInSuspense, transferExitProceedsFromSuspense } from "@/lib/cash/exit-proceeds-suspense";
import { syncBankBalancesToCashAssets } from "@/lib/portfolio/cash-sync";
import { cashBankAccountFilter } from "@/lib/permissions/scoped-queries";
import { canWrite, requireModuleAccess, requireUserContext } from "@/lib/permissions/access";
import { assetEntityFilter } from "@/lib/permissions/scoped-queries";
import { computeRealizedGain, computeRoiPct } from "@/lib/portfolio/exit-metrics";
import { assertEnumValue, parseOrThrow, zOptionalDecimal, zRequiredDate } from "@/lib/validation/primitives";
import type { AssetExitDocumentType, ExitType } from "@/lib/generated/prisma/client";

const EXIT_TYPE_VALUES = ["SALE", "TRANSFER", "LIQUIDATION", "WRITE_OFF", "OTHER"] as const satisfies readonly ExitType[];

function getFilesFromFormData(formData: FormData, field: string): File[] {
  return formData
    .getAll(field)
    .filter((item): item is File => item instanceof File && item.size > 0);
}

async function canRecordExitForAsset(
  ctx: Awaited<ReturnType<typeof requireUserContext>>,
  asset: {
    entityId: string;
    landParcel: { id: string } | null;
    vehicle: { id: string } | null;
    registeredCompany: { id: string } | null;
  },
) {
  if (canWrite(ctx, "ASSETS")) return true;
  if (asset.landParcel && canWrite(ctx, "LANDS")) return true;
  if (asset.vehicle && canWrite(ctx, "CARS")) return true;
  if (asset.registeredCompany && canWrite(ctx, "COMPANIES")) return true;
  return false;
}

async function syncLinkedModuleStatus(client: DbClient, assetId: string, status: "EXITED") {
  const asset = await client.asset.findUnique({
    where: { id: assetId },
    select: {
      landParcel: { select: { id: true } },
      vehicle: { select: { id: true } },
      registeredCompany: { select: { id: true } },
    },
  });
  if (!asset) return;

  if (asset.landParcel) {
    await client.landParcel.update({ where: { id: asset.landParcel.id }, data: { status } });
  }
  if (asset.vehicle) {
    await client.vehicle.update({ where: { id: asset.vehicle.id }, data: { status } });
  }
  if (asset.registeredCompany) {
    await client.registeredCompany.update({ where: { id: asset.registeredCompany.id }, data: { status } });
  }
}

/**
 * Creates an asset exit record and applies its downstream effects (asset status,
 * linked module status, optional cash inflow) as a single Prisma transaction so a
 * failure partway through never leaves the asset half-exited.
 */
export async function createAssetExitRecord(input: {
  assetId: string;
  exitType: ExitType;
  exitDate: Date;
  proceeds?: string;
  currency: string;
  counterparty?: string;
  notes?: string;
  recordedById: string;
  landSaleId?: string;
}) {
  await ensureExitRoiSchema();
  await ensureExitSettlementSchema();

  return db.$transaction(async (tx) => {
    const asset = await tx.asset.findUnique({
      where: { id: input.assetId },
      include: { exit: true },
    });
    if (!asset) throw new Error("Asset not found.");
    if (asset.exit) {
      throw new Error("This asset has already been exited.");
    }

    const acquisitionCost = asset.acquisitionCost?.toString() ?? undefined;
    const realizedGain = computeRealizedGain(input.proceeds, acquisitionCost);
    const realizedGainPct = computeRoiPct(realizedGain, acquisitionCost);
    const hasProceeds = input.proceeds != null && parseFloat(input.proceeds) > 0;

    let suspenseBankAccountId: string | undefined;
    if (hasProceeds) {
      const suspense = await parkExitProceedsInSuspense({
        entityId: asset.entityId,
        currency: input.currency,
        amount: input.proceeds!,
        balanceDate: input.exitDate,
        description: `Pending exit proceeds for ${asset.name}`,
        recordedById: input.recordedById,
        client: tx,
      });
      suspenseBankAccountId = suspense.id;
    }

    const exit = await tx.assetExit.create({
      data: {
        assetId: input.assetId,
        exitType: input.exitType,
        exitDate: input.exitDate,
        proceeds: input.proceeds,
        currency: input.currency,
        counterparty: input.counterparty,
        acquisitionCost,
        realizedGain: realizedGain != null ? realizedGain.toFixed(2) : undefined,
        realizedGainPct: realizedGainPct != null ? realizedGainPct.toFixed(4) : undefined,
        recordCashInflow: false,
        settlementStatus: hasProceeds ? "PENDING" : "NONE",
        suspenseBankAccountId,
        notes: input.notes,
        recordedById: input.recordedById,
        landSaleId: input.landSaleId,
      },
    });

    await tx.asset.update({
      where: { id: input.assetId },
      data: {
        status: "EXITED",
        exitedAt: input.exitDate,
        currentValue: null,
        valueUpdatedAt: null,
      },
    });

    await syncLinkedModuleStatus(tx, input.assetId, "EXITED");

    return exit;
  });
}

async function uploadExitFiles(
  assetExitId: string,
  assetId: string,
  files: File[],
  documentType: AssetExitDocumentType,
  uploadedById: string,
) {
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (!(file instanceof File) || file.size === 0) continue;

    const uploaded = await uploadPrivateFile(
      ["asset-exits", assetId, documentType.toLowerCase()],
      file,
    );
    try {
      await db.assetExitDocument.create({
        data: {
          assetExitId,
          documentType,
          label: uploaded.fileName,
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

export async function recordAssetExit(formData: FormData) {
  const ctx = await requireUserContext();

  const assetId = String(formData.get("assetId") ?? "").trim();
  const exitType = assertEnumValue(String(formData.get("exitType") ?? "SALE"), EXIT_TYPE_VALUES, "Exit type");
  const proceeds = parseOrThrow(zOptionalDecimal("Proceeds", { min: 0 }), formData.get("proceeds") ?? "");
  const currency = String(formData.get("currency") ?? "OMR").trim() || "OMR";
  const counterparty = String(formData.get("counterparty") ?? "").trim() || undefined;
  const notes = String(formData.get("notes") ?? "").trim() || undefined;

  if (!assetId) throw new Error("Asset is required.");

  const exitDate = parseOrThrow(zRequiredDate("Exit date"), formData.get("exitDate") ?? "");

  if ((exitType === "SALE" || exitType === "LIQUIDATION") && !proceeds) {
    throw new Error("Proceeds are required for this exit type.");
  }

  const asset = await db.asset.findFirst({
    where: { id: assetId, ...assetEntityFilter(ctx) },
    include: {
      exit: true,
      landParcel: { select: { id: true, sale: true } },
      vehicle: { select: { id: true } },
      registeredCompany: { select: { id: true } },
    },
  });
  if (!asset) throw new Error("Asset not found.");

  if (asset.landParcel?.sale) {
    throw new Error("This land parcel was sold via the Lands module. View the sale record there.");
  }

  if (!(await canRecordExitForAsset(ctx, asset))) {
    throw new Error("You do not have permission to record an exit for this asset.");
  }

  const exit = await createAssetExitRecord({
    assetId,
    exitType,
    exitDate,
    proceeds,
    currency,
    counterparty,
    notes,
    recordedById: ctx.id,
  });

  const agreementFiles = getFilesFromFormData(formData, "agreementFiles");
  const transferFiles = getFilesFromFormData(formData, "transferFiles");
  const closingFiles = getFilesFromFormData(formData, "closingFiles");
  const otherFiles = getFilesFromFormData(formData, "otherFiles");

  if (agreementFiles.length) {
    await uploadExitFiles(exit.id, assetId, agreementFiles, "SALE_AGREEMENT", ctx.id);
  }
  if (transferFiles.length) {
    await uploadExitFiles(exit.id, assetId, transferFiles, "TRANSFER_DEED", ctx.id);
  }
  if (closingFiles.length) {
    await uploadExitFiles(exit.id, assetId, closingFiles, "CLOSING_STATEMENT", ctx.id);
  }
  if (otherFiles.length) {
    await uploadExitFiles(exit.id, assetId, otherFiles, "OTHER", ctx.id);
  }

  await logAudit({
    userId: ctx.id,
    action: "CREATE",
    resource: "AssetExit",
    resourceId: exit.id,
    metadata: { assetId, exitType, proceeds },
  });

  revalidatePath("/assets");
  revalidatePath("/assets/" + assetId);
  revalidatePath("/dashboard");
  revalidatePath("/portfolio/exits");
  revalidatePath("/cash");
  if (asset.landParcel) {
    revalidatePath("/lands");
    revalidatePath("/lands/" + asset.landParcel.id);
  }
  if (asset.vehicle) {
    revalidatePath("/cars");
    revalidatePath("/cars/" + asset.vehicle.id);
  }
  if (asset.registeredCompany) {
    revalidatePath("/companies");
    revalidatePath("/companies/" + asset.registeredCompany.id);
  }

  return exit;
}

export async function getAssetExitForAsset(assetId: string) {
  const ctx = await requireModuleAccess("ASSETS");
  const asset = await db.asset.findFirst({
    where: { id: assetId, ...assetEntityFilter(ctx) },
    select: { id: true },
  });
  if (!asset) return null;

  return db.assetExit.findUnique({
    where: { assetId },
    include: { documents: { orderBy: { createdAt: "desc" } } },
  });
}

export async function listRecentExits(limit = 5) {
  const ctx = await requireModuleAccess("ASSETS");
  const horizon = new Date();
  horizon.setMonth(horizon.getMonth() - 12);

  return db.assetExit.findMany({
    where: {
      exitDate: { gte: horizon },
      asset: assetEntityFilter(ctx),
    },
    include: {
      asset: { select: { id: true, name: true, category: true, entity: { select: { name: true } } } },
    },
    orderBy: { exitDate: "desc" },
    take: limit,
  });
}

export async function uploadAssetExitDocuments(formData: FormData) {
  const ctx = await requireUserContext();
  const assetExitId = String(formData.get("assetExitId") ?? "").trim();
  const documentType = String(formData.get("documentType") ?? "") as AssetExitDocumentType;
  if (!assetExitId) throw new Error("Exit record is required.");
  if (!documentType) throw new Error("Document type is required.");

  const exit = await db.assetExit.findFirst({
    where: { id: assetExitId, asset: assetEntityFilter(ctx) },
    include: { asset: { include: { landParcel: true, vehicle: true, registeredCompany: true } } },
  });
  if (!exit) throw new Error("Exit record not found.");
  if (!(await canRecordExitForAsset(ctx, exit.asset))) {
    throw new Error("You do not have permission to upload exit documents.");
  }

  const field =
    documentType === "SALE_AGREEMENT"
      ? "agreementFiles"
      : documentType === "TRANSFER_DEED"
        ? "transferFiles"
        : documentType === "CLOSING_STATEMENT"
          ? "closingFiles"
          : "otherFiles";

  const files = getFilesFromFormData(formData, field);
  if (files.length === 0) throw new Error("At least one file is required.");

  await uploadExitFiles(exit.id, exit.assetId, files, documentType, ctx.id);

  revalidatePath("/assets/" + exit.assetId);
}

export async function deleteAssetExitDocument(id: string) {
  const ctx = await requireUserContext();
  const document = await db.assetExitDocument.findFirst({
    where: { id, assetExit: { asset: assetEntityFilter(ctx) } },
    include: { assetExit: true },
  });
  if (!document) throw new Error("Document not found.");

  await deleteBlobUrl(document.fileUrl);
  await db.assetExitDocument.delete({ where: { id } });

  revalidatePath("/assets/" + document.assetExit.assetId);
}

export async function listAssignableBankAccountsForExit(exitId: string) {
  const ctx = await requireUserContext();
  const exit = await db.assetExit.findFirst({
    where: { id: exitId, asset: assetEntityFilter(ctx) },
    select: { currency: true, settlementStatus: true },
  });
  if (!exit || exit.settlementStatus !== "PENDING") return [];

  return db.bankAccount.findMany({
    where: {
      ...cashBankAccountFilter(ctx),
      currency: exit.currency,
      isActive: true,
      isExitSuspense: false,
      includeInCashPosition: true,
    },
    orderBy: [{ bankName: "asc" }, { accountName: "asc" }],
    select: {
      id: true,
      bankName: true,
      accountName: true,
      currency: true,
      currentBalance: true,
    },
  });
}

export async function assignExitProceedsToBankAccount(formData: FormData) {
  const ctx = await requireUserContext();
  const exitId = String(formData.get("exitId") ?? "").trim();
  const bankAccountId = String(formData.get("bankAccountId") ?? "").trim();
  if (!exitId) throw new Error("Exit record is required.");
  if (!bankAccountId) throw new Error("Bank account is required.");

  const exit = await db.assetExit.findFirst({
    where: { id: exitId, asset: assetEntityFilter(ctx) },
    include: {
      asset: {
        select: {
          id: true,
          name: true,
          entityId: true,
          landParcel: { select: { id: true } },
          vehicle: { select: { id: true } },
          registeredCompany: { select: { id: true } },
        },
      },
    },
  });
  if (!exit) throw new Error("Exit record not found.");
  if (exit.settlementStatus !== "PENDING") {
    throw new Error("These proceeds have already been assigned or do not require settlement.");
  }
  if (!exit.proceeds || !exit.suspenseBankAccountId) {
    throw new Error("This exit has no proceeds to assign.");
  }

  const target = await db.bankAccount.findFirst({
    where: {
      id: bankAccountId,
      ...cashBankAccountFilter(ctx),
      isExitSuspense: false,
      isActive: true,
      currency: exit.currency,
    },
  });
  if (!target) throw new Error("Bank account not found.");

  await ensureExitSettlementSchema();

  await db.$transaction(async (tx) => {
    await transferExitProceedsFromSuspense({
      suspenseBankAccountId: exit.suspenseBankAccountId!,
      targetBankAccountId: target.id,
      amount: exit.proceeds!.toString(),
      balanceDate: new Date(),
      description: exit.asset.name,
      recordedById: ctx.id,
      client: tx,
    });

    await tx.assetExit.update({
      where: { id: exitId },
      data: {
        settlementStatus: "SETTLED",
        settledBankAccountId: target.id,
        settledAt: new Date(),
      },
    });
  });

  await syncBankBalancesToCashAssets(ctx);

  await logAudit({
    userId: ctx.id,
    action: "UPDATE",
    resource: "AssetExit",
    resourceId: exitId,
    metadata: { bankAccountId: target.id, proceeds: exit.proceeds?.toString() },
  });

  revalidatePath("/portfolio/exits");
  revalidatePath("/assets/" + exit.assetId);
  revalidatePath("/dashboard");
  revalidatePath("/cash");

  const asset = exit.asset;
  if (asset.landParcel) {
    revalidatePath("/lands/" + asset.landParcel.id);
  }
  if (asset.vehicle) {
    revalidatePath("/cars/" + asset.vehicle.id);
  }
  if (asset.registeredCompany) {
    revalidatePath("/companies/" + asset.registeredCompany.id);
  }
}
