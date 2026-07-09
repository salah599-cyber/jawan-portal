"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { ensureLpFundSchema } from "@/lib/db/ensure-lp-fund-schema";
import { deleteBlobUrl, uploadPrivateFile } from "@/lib/blob";
import { logAudit } from "@/lib/audit/log";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { lpCommitmentEntityFilter } from "@/lib/permissions/scoped-queries";
import {
  LP_PATH,
  lpStatusToAssetStatus,
  refreshLpCapitalCallStatuses,
  syncLpCommitmentAsset,
} from "@/lib/lp/asset-sync";
import { parseDate, parseDecimal, parseIntOptional } from "@/lib/lp/helpers";
import type {
  LpCapitalCallStatus,
  LpCommitmentStatus,
  LpDistributionType,
  LpDocumentType,
  LpFundStatus,
  LpFundStrategy,
  LpNavSource,
  Prisma,
} from "@/lib/generated/prisma/client";

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

async function getLpCommitmentOrThrow(
  ctx: Awaited<ReturnType<typeof requireModuleAccess>>,
  commitmentId: string,
) {
  const commitment = await db.lpCommitment.findFirst({
    where: { id: commitmentId, ...lpCommitmentEntityFilter(ctx) },
    include: { fund: true },
  });
  if (!commitment) throw new Error("Commitment not found.");
  return commitment;
}

function revalidateLpCommitment(commitmentId: string) {
  revalidatePath(LP_PATH);
  revalidatePath(`${LP_PATH}/new`);
  revalidatePath(`${LP_PATH}/${commitmentId}`);
  revalidatePath(`${LP_PATH}/${commitmentId}/edit`);
  revalidatePath("/assets");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  revalidatePath("/calendar");
}

async function afterLpCashFlowChange(commitmentId: string) {
  await refreshLpCapitalCallStatuses(commitmentId);
  await syncLpCommitmentAsset(commitmentId);
}

export async function createLpCommitment(formData: FormData) {
  const ctx = await requireModuleAccess("FUND_LP");
  if (!canWrite(ctx, "FUND_LP")) {
    throw new Error("You do not have permission to add LP commitments.");
  }

  await ensureLpFundSchema();

  const entityId = String(formData.get("entityId") ?? "").trim();
  const fundMode = String(formData.get("fundMode") ?? "new").trim();
  const commitmentAmount = parseDecimal(String(formData.get("commitmentAmount") ?? ""));
  const commitmentDate = parseDate(String(formData.get("commitmentDate") ?? ""));
  const commitmentCurrency =
    String(formData.get("commitmentCurrency") ?? "USD").trim() || "USD";

  if (!entityId) throw new Error("Entity is required.");
  if (commitmentAmount == null || commitmentAmount <= 0) {
    throw new Error("Commitment amount is required.");
  }
  if (!commitmentDate) throw new Error("Commitment date is required.");

  assertEntityAccess(ctx, entityId);

  let fundId = String(formData.get("existingFundId") ?? "").trim();

  if (fundMode === "existing") {
    if (!fundId) throw new Error("Select an existing fund.");
    const fund = await db.lpFund.findUnique({ where: { id: fundId } });
    if (!fund) throw new Error("Fund not found.");
  } else {
    const fundName = String(formData.get("fundName") ?? "").trim();
    if (!fundName) throw new Error("Fund name is required.");

    const gpManagerName = String(formData.get("gpManagerName") ?? "").trim();
    let gpManagerId: string | undefined;

    if (gpManagerName) {
      const existing = await db.lpGpManager.findFirst({
        where: { name: { equals: gpManagerName, mode: "insensitive" } },
      });
      if (existing) {
        gpManagerId = existing.id;
      } else {
        const gp = await db.lpGpManager.create({
          data: { name: gpManagerName },
        });
        gpManagerId = gp.id;
      }
    }

    const fund = await db.lpFund.create({
      data: {
        name: fundName,
        gpManagerId,
        strategy: String(formData.get("strategy") ?? "OTHER") as LpFundStrategy,
        vintageYear: parseIntOptional(String(formData.get("vintageYear") ?? "")),
        fundSize: parseDecimal(String(formData.get("fundSize") ?? ""))?.toString(),
        currency: commitmentCurrency,
        fundTermYears: parseIntOptional(String(formData.get("fundTermYears") ?? "")),
        investmentPeriodEnd: parseDate(String(formData.get("investmentPeriodEnd") ?? "")),
        status: String(formData.get("fundStatus") ?? "ACTIVE") as LpFundStatus,
        notes: String(formData.get("fundNotes") ?? "").trim() || undefined,
      },
    });
    fundId = fund.id;
  }

  const duplicate = await db.lpCommitment.findUnique({
    where: { fundId_entityId: { fundId, entityId } },
  });
  if (duplicate) {
    throw new Error("A commitment already exists for this fund and entity.");
  }

  const fund = await db.lpFund.findUniqueOrThrow({ where: { id: fundId } });

  const asset = await db.asset.create({
    data: {
      name: `LP: ${fund.name}`,
      category: "FUND_LP",
      status: "ACTIVE",
      entityId,
      currency: commitmentCurrency,
      description: fund.strategy,
    },
  });

  const commitment = await db.lpCommitment.create({
    data: {
      fundId,
      entityId,
      assetId: asset.id,
      commitmentAmount: commitmentAmount.toString(),
      commitmentDate,
      commitmentCurrency,
      status: String(formData.get("status") ?? "ACTIVE") as LpCommitmentStatus,
      sideLetterNotes: String(formData.get("sideLetterNotes") ?? "").trim() || undefined,
      ownershipPctOfFund: parseDecimal(String(formData.get("ownershipPctOfFund") ?? ""))?.toString(),
    },
  });

  await syncLpCommitmentAsset(commitment.id);

  await logAudit({
    userId: ctx.id,
    action: "CREATE",
    resource: "LpCommitment",
    resourceId: commitment.id,
    metadata: { fundId, fundName: fund.name, entityId },
  });

  revalidateLpCommitment(commitment.id);
  redirect(`${LP_PATH}/${commitment.id}`);
}

export async function updateLpCommitment(id: string, formData: FormData) {
  const ctx = await requireModuleAccess("FUND_LP");
  if (!canWrite(ctx, "FUND_LP")) {
    throw new Error("You do not have permission to update commitments.");
  }

  const existing = await getLpCommitmentOrThrow(ctx, id);
  const entityId = String(formData.get("entityId") ?? existing.entityId).trim();
  assertEntityAccess(ctx, entityId);

  const commitmentAmount = parseDecimal(String(formData.get("commitmentAmount") ?? ""));
  const commitmentDate = parseDate(String(formData.get("commitmentDate") ?? ""));
  if (commitmentAmount == null || commitmentAmount <= 0) {
    throw new Error("Commitment amount is required.");
  }
  if (!commitmentDate) throw new Error("Commitment date is required.");

  const status = String(formData.get("status") ?? existing.status) as LpCommitmentStatus;
  const commitmentCurrency =
    String(formData.get("commitmentCurrency") ?? existing.commitmentCurrency).trim() ||
    existing.commitmentCurrency;

  await db.lpCommitment.update({
    where: { id },
    data: {
      commitmentAmount: commitmentAmount.toString(),
      commitmentDate,
      commitmentCurrency,
      status,
      sideLetterNotes: String(formData.get("sideLetterNotes") ?? "").trim() || null,
      ownershipPctOfFund: parseDecimal(String(formData.get("ownershipPctOfFund") ?? ""))?.toString() ?? null,
    },
  });

  const fundName = String(formData.get("fundName") ?? existing.fund.name).trim();
  if (!fundName) throw new Error("Fund name is required.");

  const gpManagerName = String(formData.get("gpManagerName") ?? "").trim();
  let gpManagerId: string | null | undefined = existing.fund.gpManagerId;

  if (gpManagerName) {
    const gp = await db.lpGpManager.findFirst({
      where: { name: { equals: gpManagerName, mode: "insensitive" } },
    });
    if (gp) {
      gpManagerId = gp.id;
    } else {
      const created = await db.lpGpManager.create({ data: { name: gpManagerName } });
      gpManagerId = created.id;
    }
  } else {
    gpManagerId = null;
  }

  await db.lpFund.update({
    where: { id: existing.fundId },
    data: {
      name: fundName,
      gpManagerId,
      strategy: String(formData.get("strategy") ?? existing.fund.strategy) as LpFundStrategy,
      vintageYear: parseIntOptional(String(formData.get("vintageYear") ?? "")),
      fundSize: parseDecimal(String(formData.get("fundSize") ?? ""))?.toString() ?? null,
      currency: commitmentCurrency,
      fundTermYears: parseIntOptional(String(formData.get("fundTermYears") ?? "")),
      investmentPeriodEnd: parseDate(String(formData.get("investmentPeriodEnd") ?? "")),
      status: String(formData.get("fundStatus") ?? existing.fund.status) as LpFundStatus,
      notes: String(formData.get("fundNotes") ?? "").trim() || null,
    },
  });

  if (existing.assetId) {
    await db.asset.update({
      where: { id: existing.assetId },
      data: {
        status: lpStatusToAssetStatus(status),
        currency: commitmentCurrency,
      },
    });
  }

  await syncLpCommitmentAsset(id);

  await logAudit({
    userId: ctx.id,
    action: "UPDATE",
    resource: "LpCommitment",
    resourceId: id,
    metadata: { fundName },
  });

  revalidateLpCommitment(id);
  redirect(`${LP_PATH}/${id}`);
}

export async function deleteLpCommitment(id: string) {
  const ctx = await requireModuleAccess("FUND_LP");
  if (!canWrite(ctx, "FUND_LP")) {
    throw new Error("You do not have permission to delete commitments.");
  }

  const commitment = await getLpCommitmentOrThrow(ctx, id);

  const documents = await db.lpFundDocument.findMany({
    where: { OR: [{ commitmentId: id }, { fundId: commitment.fundId }] },
  });

  for (const doc of documents) {
    await deleteBlobUrl(doc.fileUrl);
  }

  if (commitment.assetId) {
    await db.asset.delete({ where: { id: commitment.assetId } });
  }

  await db.lpCommitment.delete({ where: { id } });

  await logAudit({
    userId: ctx.id,
    action: "DELETE",
    resource: "LpCommitment",
    resourceId: id,
    metadata: { fundName: commitment.fund.name },
  });

  revalidateLpCommitment(id);
  redirect(LP_PATH);
}

export async function upsertLpCapitalCall(formData: FormData) {
  const ctx = await requireModuleAccess("FUND_LP");
  if (!canWrite(ctx, "FUND_LP")) throw new Error("You do not have permission.");

  const commitmentId = String(formData.get("commitmentId") ?? "").trim();
  const id = String(formData.get("id") ?? "").trim();
  if (!commitmentId) throw new Error("Commitment is required.");

  const commitment = await getLpCommitmentOrThrow(ctx, commitmentId);
  const callDate = parseDate(String(formData.get("callDate") ?? ""));
  const amount = parseDecimal(String(formData.get("amount") ?? ""));
  if (!callDate) throw new Error("Call date is required.");
  if (amount == null || amount <= 0) throw new Error("Amount is required.");

  const currency =
    String(formData.get("currency") ?? commitment.commitmentCurrency).trim() ||
    commitment.commitmentCurrency;
  const status = String(formData.get("status") ?? "PENDING") as LpCapitalCallStatus;
  const paidDate = parseDate(String(formData.get("paidDate") ?? ""));

  const data: Prisma.LpCapitalCallUncheckedCreateInput = {
    commitmentId,
    callDate,
    dueDate: parseDate(String(formData.get("dueDate") ?? "")),
    amount: amount.toString(),
    currency,
    status,
    paidDate: status === "PAID" ? paidDate ?? callDate : null,
    reference: String(formData.get("reference") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
  };

  if (id) {
    await db.lpCapitalCall.update({ where: { id }, data });
  } else {
    await db.lpCapitalCall.create({ data });
  }

  await afterLpCashFlowChange(commitmentId);

  await logAudit({
    userId: ctx.id,
    action: id ? "UPDATE" : "CREATE",
    resource: "LpCapitalCall",
    resourceId: id || commitmentId,
    metadata: { commitmentId, amount },
  });

  revalidateLpCommitment(commitmentId);
}

export async function markLpCapitalCallPaid(id: string, formData: FormData) {
  const ctx = await requireModuleAccess("FUND_LP");
  if (!canWrite(ctx, "FUND_LP")) throw new Error("You do not have permission.");

  const call = await db.lpCapitalCall.findFirst({
    where: {
      id,
      commitment: lpCommitmentEntityFilter(ctx),
    },
  });
  if (!call) throw new Error("Capital call not found.");

  const paidDate = parseDate(String(formData.get("paidDate") ?? "")) ?? new Date();

  await db.lpCapitalCall.update({
    where: { id },
    data: { status: "PAID", paidDate },
  });

  await afterLpCashFlowChange(call.commitmentId);

  await logAudit({
    userId: ctx.id,
    action: "UPDATE",
    resource: "LpCapitalCall",
    resourceId: id,
    metadata: { status: "PAID", paidDate },
  });

  revalidateLpCommitment(call.commitmentId);
}

export async function deleteLpCapitalCall(id: string) {
  const ctx = await requireModuleAccess("FUND_LP");
  if (!canWrite(ctx, "FUND_LP")) throw new Error("You do not have permission.");

  const call = await db.lpCapitalCall.findFirst({
    where: { id, commitment: lpCommitmentEntityFilter(ctx) },
  });
  if (!call) throw new Error("Capital call not found.");

  await db.lpCapitalCall.delete({ where: { id } });
  await afterLpCashFlowChange(call.commitmentId);

  await logAudit({
    userId: ctx.id,
    action: "DELETE",
    resource: "LpCapitalCall",
    resourceId: id,
    metadata: { commitmentId: call.commitmentId },
  });

  revalidateLpCommitment(call.commitmentId);
}

export async function upsertLpDistribution(formData: FormData) {
  const ctx = await requireModuleAccess("FUND_LP");
  if (!canWrite(ctx, "FUND_LP")) throw new Error("You do not have permission.");

  const commitmentId = String(formData.get("commitmentId") ?? "").trim();
  const id = String(formData.get("id") ?? "").trim();
  if (!commitmentId) throw new Error("Commitment is required.");

  const commitment = await getLpCommitmentOrThrow(ctx, commitmentId);
  const distributionDate = parseDate(String(formData.get("distributionDate") ?? ""));
  const amount = parseDecimal(String(formData.get("amount") ?? ""));
  if (!distributionDate) throw new Error("Distribution date is required.");
  if (amount == null || amount <= 0) throw new Error("Amount is required.");

  const currency =
    String(formData.get("currency") ?? commitment.commitmentCurrency).trim() ||
    commitment.commitmentCurrency;
  const isRecallable = formData.get("isRecallable") === "on" || formData.get("isRecallable") === "true";
  const recalledAmount = parseDecimal(String(formData.get("recalledAmount") ?? ""));

  const data: Prisma.LpDistributionUncheckedCreateInput = {
    commitmentId,
    distributionDate,
    amount: amount.toString(),
    currency,
    distributionType: String(formData.get("distributionType") ?? "RETURN_OF_CAPITAL") as LpDistributionType,
    isRecallable,
    recalledAmount: isRecallable && recalledAmount != null ? recalledAmount.toString() : null,
    notes: String(formData.get("notes") ?? "").trim() || null,
  };

  if (id) {
    await db.lpDistribution.update({ where: { id }, data });
  } else {
    await db.lpDistribution.create({ data });
  }

  await afterLpCashFlowChange(commitmentId);

  await logAudit({
    userId: ctx.id,
    action: id ? "UPDATE" : "CREATE",
    resource: "LpDistribution",
    resourceId: id || commitmentId,
    metadata: { commitmentId, amount, isRecallable },
  });

  revalidateLpCommitment(commitmentId);
}

export async function recallLpDistribution(id: string, formData: FormData) {
  const ctx = await requireModuleAccess("FUND_LP");
  if (!canWrite(ctx, "FUND_LP")) throw new Error("You do not have permission.");

  const dist = await db.lpDistribution.findFirst({
    where: { id, commitment: lpCommitmentEntityFilter(ctx) },
  });
  if (!dist) throw new Error("Distribution not found.");
  if (!dist.isRecallable) throw new Error("This distribution is not recallable.");

  const recalledAmount = parseDecimal(String(formData.get("recalledAmount") ?? ""));
  if (recalledAmount == null || recalledAmount <= 0) {
    throw new Error("Recalled amount is required.");
  }

  const currentRecalled = parseDecimal(dist.recalledAmount?.toString() ?? "0") ?? 0;
  const totalAmount = parseDecimal(dist.amount.toString()) ?? 0;
  const newRecalled = currentRecalled + recalledAmount;
  if (newRecalled > totalAmount) {
    throw new Error("Recalled amount cannot exceed distribution amount.");
  }

  await db.lpDistribution.update({
    where: { id },
    data: { recalledAmount: newRecalled.toString() },
  });

  await afterLpCashFlowChange(dist.commitmentId);

  await logAudit({
    userId: ctx.id,
    action: "UPDATE",
    resource: "LpDistribution",
    resourceId: id,
    metadata: { recalledAmount, totalRecalled: newRecalled },
  });

  revalidateLpCommitment(dist.commitmentId);
}

export async function deleteLpDistribution(id: string) {
  const ctx = await requireModuleAccess("FUND_LP");
  if (!canWrite(ctx, "FUND_LP")) throw new Error("You do not have permission.");

  const dist = await db.lpDistribution.findFirst({
    where: { id, commitment: lpCommitmentEntityFilter(ctx) },
  });
  if (!dist) throw new Error("Distribution not found.");

  await db.lpDistribution.delete({ where: { id } });
  await afterLpCashFlowChange(dist.commitmentId);

  await logAudit({
    userId: ctx.id,
    action: "DELETE",
    resource: "LpDistribution",
    resourceId: id,
    metadata: { commitmentId: dist.commitmentId },
  });

  revalidateLpCommitment(dist.commitmentId);
}

export async function upsertLpNavUpdate(formData: FormData) {
  const ctx = await requireModuleAccess("FUND_LP");
  if (!canWrite(ctx, "FUND_LP")) throw new Error("You do not have permission.");

  const commitmentId = String(formData.get("commitmentId") ?? "").trim();
  const id = String(formData.get("id") ?? "").trim();
  if (!commitmentId) throw new Error("Commitment is required.");

  const commitment = await getLpCommitmentOrThrow(ctx, commitmentId);
  const asOfDate = parseDate(String(formData.get("asOfDate") ?? ""));
  const nav = parseDecimal(String(formData.get("nav") ?? ""));
  if (!asOfDate) throw new Error("As-of date is required.");
  if (nav == null || nav < 0) throw new Error("NAV is required.");

  const currency =
    String(formData.get("currency") ?? commitment.commitmentCurrency).trim() ||
    commitment.commitmentCurrency;

  const data: Prisma.LpNavUpdateUncheckedCreateInput = {
    commitmentId,
    asOfDate,
    nav: nav.toString(),
    currency,
    source: String(formData.get("source") ?? "GP_REPORT") as LpNavSource,
    gpReportedTvpi: parseDecimal(String(formData.get("gpReportedTvpi") ?? ""))?.toString() ?? null,
    gpReportedIrr: parseDecimal(String(formData.get("gpReportedIrr") ?? ""))?.toString() ?? null,
    notes: String(formData.get("notes") ?? "").trim() || null,
  };

  if (id) {
    await db.lpNavUpdate.update({ where: { id }, data });
  } else {
    await db.lpNavUpdate.create({ data });
  }

  await syncLpCommitmentAsset(commitmentId);

  await logAudit({
    userId: ctx.id,
    action: id ? "UPDATE" : "CREATE",
    resource: "LpNavUpdate",
    resourceId: id || commitmentId,
    metadata: { commitmentId, nav },
  });

  revalidateLpCommitment(commitmentId);
}

export async function deleteLpNavUpdate(id: string) {
  const ctx = await requireModuleAccess("FUND_LP");
  if (!canWrite(ctx, "FUND_LP")) throw new Error("You do not have permission.");

  const nav = await db.lpNavUpdate.findFirst({
    where: { id, commitment: lpCommitmentEntityFilter(ctx) },
  });
  if (!nav) throw new Error("NAV update not found.");

  await db.lpNavUpdate.delete({ where: { id } });
  await syncLpCommitmentAsset(nav.commitmentId);

  await logAudit({
    userId: ctx.id,
    action: "DELETE",
    resource: "LpNavUpdate",
    resourceId: id,
    metadata: { commitmentId: nav.commitmentId },
  });

  revalidateLpCommitment(nav.commitmentId);
}

async function uploadLpFiles(
  params: { commitmentId?: string; fundId?: string },
  files: File[],
  documentType: LpDocumentType,
  uploadedById: string,
) {
  const ownerId = params.commitmentId ?? params.fundId;
  if (!ownerId) return;

  for (const file of files) {
    const uploaded = await uploadPrivateFile(
      ["lp-fund", ownerId, documentType.toLowerCase()],
      file,
    );
    try {
      await db.lpFundDocument.create({
        data: {
          commitmentId: params.commitmentId,
          fundId: params.fundId,
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

export async function uploadLpDocuments(formData: FormData) {
  const ctx = await requireModuleAccess("FUND_LP");
  if (!canWrite(ctx, "FUND_LP")) {
    throw new Error("You do not have permission to upload documents.");
  }

  const commitmentId = String(formData.get("commitmentId") ?? "").trim();
  const documentType = String(formData.get("documentType") ?? "") as LpDocumentType;
  if (!commitmentId) throw new Error("Commitment is required.");
  if (!documentType) throw new Error("Document type is required.");

  const commitment = await getLpCommitmentOrThrow(ctx, commitmentId);
  const files = getFilesFromFormData(formData, "files");
  if (files.length === 0) throw new Error("At least one file is required.");

  await uploadLpFiles({ commitmentId, fundId: commitment.fundId }, files, documentType, ctx.id);

  await logAudit({
    userId: ctx.id,
    action: "UPLOAD",
    resource: "LpFundDocument",
    resourceId: commitmentId,
    metadata: { documentType, count: files.length },
  });

  revalidateLpCommitment(commitmentId);
}

export async function deleteLpDocument(id: string) {
  const ctx = await requireModuleAccess("FUND_LP");
  if (!canWrite(ctx, "FUND_LP")) {
    throw new Error("You do not have permission to delete documents.");
  }

  const document = await db.lpFundDocument.findFirst({
    where: {
      id,
      OR: [
        { commitment: lpCommitmentEntityFilter(ctx) },
        { fund: { commitments: { some: lpCommitmentEntityFilter(ctx) } } },
      ],
    },
  });
  if (!document) throw new Error("Document not found.");

  await deleteBlobUrl(document.fileUrl);
  await db.lpFundDocument.delete({ where: { id } });

  await logAudit({
    userId: ctx.id,
    action: "DELETE",
    resource: "LpFundDocument",
    resourceId: id,
    metadata: { commitmentId: document.commitmentId },
  });

  if (document.commitmentId) {
    revalidateLpCommitment(document.commitmentId);
  }
}
