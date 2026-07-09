"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { ensureFamilySchema } from "@/lib/db/ensure-family-schema";
import { deleteBlobUrl, uploadPrivateFile } from "@/lib/blob";
import { logAudit } from "@/lib/audit/log";
import { SUCCESSION_PATH } from "@/lib/family/constants";
import { parseDate, parseDecimal } from "@/lib/succession/helpers";
import { DEFAULT_SUCCESSION_CHECKLIST } from "@/lib/succession/helpers";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { familyMemberFilter, successionPlanFilter } from "@/lib/permissions/scoped-queries";
import type {
  SuccessionAppointmentRole,
  SuccessionDocumentStatus,
  SuccessionDocumentType,
  SuccessionPlanStatus,
} from "@/lib/generated/prisma/client";

const planInclude = {
  entity: { select: { name: true } },
  distributionInstructions: {
    orderBy: { sortOrder: "asc" as const },
    include: {
      beneficiaryMember: { select: { fullName: true } },
      entity: { select: { name: true } },
      asset: { select: { name: true } },
      landParcel: { select: { name: true } },
      registeredCompany: { select: { name: true } },
      reProperty: { select: { name: true } },
      vehicle: { select: { name: true } },
    },
  },
  appointments: {
    orderBy: { sortOrder: "asc" as const },
    include: { familyMember: { select: { fullName: true } } },
  },
  documents: { orderBy: { documentType: "asc" as const } },
  checklistItems: { orderBy: { sortOrder: "asc" as const } },
} as const;

export type SuccessionPlanDetail = NonNullable<Awaited<ReturnType<typeof getSuccessionPlan>>>;

export type SuccessionPlanListRow = {
  id: string;
  title: string;
  status: string;
  effectiveStatus: string;
  entityName: string | null;
  nextReviewDate: Date | null;
  checklistCompletionPct: number;
  missingDocsCount: number;
  updatedAt: Date;
};

export type DistributionInstructionInput = {
  beneficiaryMemberId?: string;
  entityId?: string;
  assetId?: string;
  landParcelId?: string;
  registeredCompanyId?: string;
  rePropertyId?: string;
  vehicleId?: string;
  allocationPct?: string;
  allocationAmount?: string;
  currency?: string;
  instructions?: string;
};

export type SuccessionAppointmentInput = {
  familyMemberId: string;
  role: string;
  isPrimary?: boolean;
  notes?: string;
};

export type ChecklistItemInput = {
  label: string;
  category?: string;
  isComplete?: boolean;
  dueDate?: string;
};

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function getFilesFromFormData(formData: FormData, field: string): File[] {
  return formData
    .getAll(field)
    .filter((item): item is File => item instanceof File && item.size > 0);
}

function revalidateSuccession(planId?: string) {
  revalidatePath(SUCCESSION_PATH);
  if (planId) {
    revalidatePath(`${SUCCESSION_PATH}/${planId}`);
    revalidatePath(`${SUCCESSION_PATH}/${planId}/edit`);
  }
  revalidatePath("/dashboard");
  revalidatePath("/calendar");
  revalidatePath("/reports");
}

function parseJsonArray<T>(raw: string | null, label: string): T[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    throw new Error(`Invalid ${label} data.`);
  }
}

function readPlanFormData(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) throw new Error("Plan title is required.");

  const entityId = String(formData.get("entityId") ?? "").trim();

  return {
    title,
    status: String(formData.get("status") ?? "DRAFT") as SuccessionPlanStatus,
    entityId: entityId || null,
    generalInstructions: String(formData.get("generalInstructions") ?? "").trim() || null,
    incapacitationNotes: String(formData.get("incapacitationNotes") ?? "").trim() || null,
    lastReviewDate: parseDate(String(formData.get("lastReviewDate") ?? "")),
    nextReviewDate: parseDate(String(formData.get("nextReviewDate") ?? "")),
    notes: String(formData.get("notes") ?? "").trim() || null,
  };
}

export async function listSuccessionPlans(filters?: { status?: string }): Promise<SuccessionPlanListRow[]> {
  const ctx = await requireModuleAccess("SUCCESSION");
  await ensureFamilySchema();

  const plans = await db.successionPlan.findMany({
    where: {
      ...successionPlanFilter(ctx),
      ...(filters?.status ? { status: filters.status as SuccessionPlanStatus } : {}),
    },
    include: {
      entity: { select: { name: true } },
      documents: { select: { status: true } },
      checklistItems: { select: { isComplete: true } },
    },
    orderBy: [{ nextReviewDate: "asc" }, { updatedAt: "desc" }],
  });

  return plans.map((plan) => {
    const effectiveStatus =
      plan.status !== "COMPLETE" && plan.nextReviewDate && plan.nextReviewDate <= new Date()
        ? "REVIEW_DUE"
        : plan.status;
    const complete = plan.checklistItems.filter((item) => item.isComplete).length;
    const checklistCompletionPct =
      plan.checklistItems.length === 0 ? 0 : Math.round((complete / plan.checklistItems.length) * 100);

    return {
      id: plan.id,
      title: plan.title,
      status: plan.status,
      effectiveStatus,
      entityName: plan.entity?.name ?? null,
      nextReviewDate: plan.nextReviewDate,
      checklistCompletionPct,
      missingDocsCount: plan.documents.filter((doc) => doc.status === "MISSING").length,
      updatedAt: plan.updatedAt,
    };
  });
}

export async function getSuccessionPlan(id: string) {
  const ctx = await requireModuleAccess("SUCCESSION");
  await ensureFamilySchema();

  return db.successionPlan.findFirst({
    where: { id, ...successionPlanFilter(ctx) },
    include: planInclude,
  });
}

async function replaceDistributionInstructions(planId: string, items: DistributionInstructionInput[]) {
  await db.successionDistributionInstruction.deleteMany({ where: { successionPlanId: planId } });
  if (items.length === 0) return;

  await db.successionDistributionInstruction.createMany({
    data: items.map((item, index) => ({
      successionPlanId: planId,
      beneficiaryMemberId: item.beneficiaryMemberId || null,
      entityId: item.entityId || null,
      assetId: item.assetId || null,
      landParcelId: item.landParcelId || null,
      registeredCompanyId: item.registeredCompanyId || null,
      rePropertyId: item.rePropertyId || null,
      vehicleId: item.vehicleId || null,
      allocationPct: parseDecimal(item.allocationPct ?? "")?.toString() ?? null,
      allocationAmount: parseDecimal(item.allocationAmount ?? "")?.toString() ?? null,
      currency: item.currency?.trim() || "OMR",
      instructions: item.instructions?.trim() || null,
      sortOrder: index,
    })),
  });
}

async function replaceAppointments(planId: string, items: SuccessionAppointmentInput[]) {
  await db.successionAppointment.deleteMany({ where: { successionPlanId: planId } });
  const valid = items.filter((item) => item.familyMemberId?.trim());
  if (valid.length === 0) return;

  await db.successionAppointment.createMany({
    data: valid.map((item, index) => ({
      successionPlanId: planId,
      familyMemberId: item.familyMemberId,
      role: item.role as SuccessionAppointmentRole,
      isPrimary: item.isPrimary === true,
      notes: item.notes?.trim() || null,
      sortOrder: index,
    })),
  });
}

async function replaceChecklistItems(planId: string, items: ChecklistItemInput[]) {
  await db.successionChecklistItem.deleteMany({ where: { successionPlanId: planId } });
  if (items.length === 0) return;

  await db.successionChecklistItem.createMany({
    data: items.map((item, index) => ({
      successionPlanId: planId,
      label: item.label.trim(),
      category: item.category?.trim() || null,
      isComplete: item.isComplete === true,
      dueDate: parseDate(item.dueDate ?? ""),
      sortOrder: index,
    })),
  });
}

export async function createSuccessionPlan(formData: FormData) {
  const ctx = await requireModuleAccess("SUCCESSION");
  if (!canWrite(ctx, "SUCCESSION")) {
    throw new Error("You do not have permission to create succession plans.");
  }

  await ensureFamilySchema();
  const data = readPlanFormData(formData);

  const plan = await db.successionPlan.create({ data });

  await db.successionChecklistItem.createMany({
    data: DEFAULT_SUCCESSION_CHECKLIST.map((item, index) => ({
      successionPlanId: plan.id,
      label: item.label,
      category: item.category,
      sortOrder: index,
    })),
  });

  const docTypes: SuccessionDocumentType[] = ["WILL", "TRUST_DEED", "LETTER_OF_WISHES", "POA", "LIVING_WILL"];
  await db.successionPlanDocument.createMany({
    data: docTypes.map((documentType) => ({
      successionPlanId: plan.id,
      documentType,
      status: "MISSING" as SuccessionDocumentStatus,
    })),
  });

  await logAudit({
    userId: ctx.id,
    action: "CREATE",
    resource: "SuccessionPlan",
    resourceId: plan.id,
    metadata: { title: plan.title },
  });

  revalidateSuccession(plan.id);
  redirect(`${SUCCESSION_PATH}/${plan.id}`);
}

export async function updateSuccessionPlan(planId: string, formData: FormData) {
  const ctx = await requireModuleAccess("SUCCESSION");
  if (!canWrite(ctx, "SUCCESSION")) {
    throw new Error("You do not have permission to edit succession plans.");
  }

  await ensureFamilySchema();
  const existing = await getSuccessionPlan(planId);
  if (!existing) throw new Error("Succession plan not found.");

  const data = readPlanFormData(formData);
  await db.successionPlan.update({ where: { id: planId }, data });

  if (formData.has("distributionJson")) {
    await replaceDistributionInstructions(
      planId,
      parseJsonArray<DistributionInstructionInput>(String(formData.get("distributionJson")), "distribution"),
    );
  }
  if (formData.has("appointmentsJson")) {
    await replaceAppointments(
      planId,
      parseJsonArray<SuccessionAppointmentInput>(String(formData.get("appointmentsJson")), "appointments"),
    );
  }
  if (formData.has("checklistJson")) {
    await replaceChecklistItems(
      planId,
      parseJsonArray<ChecklistItemInput>(String(formData.get("checklistJson")), "checklist"),
    );
  }

  await logAudit({
    userId: ctx.id,
    action: "UPDATE",
    resource: "SuccessionPlan",
    resourceId: planId,
    metadata: { title: data.title },
  });

  revalidateSuccession(planId);
  redirect(`${SUCCESSION_PATH}/${planId}`);
}

export async function saveSuccessionPlanRelations(planId: string, formData: FormData) {
  const ctx = await requireModuleAccess("SUCCESSION");
  if (!canWrite(ctx, "SUCCESSION")) {
    throw new Error("You do not have permission to edit succession plans.");
  }

  await ensureFamilySchema();
  const existing = await getSuccessionPlan(planId);
  if (!existing) throw new Error("Succession plan not found.");

  if (formData.has("distributionJson")) {
    await replaceDistributionInstructions(
      planId,
      parseJsonArray<DistributionInstructionInput>(String(formData.get("distributionJson")), "distribution"),
    );
  }
  if (formData.has("appointmentsJson")) {
    await replaceAppointments(
      planId,
      parseJsonArray<SuccessionAppointmentInput>(String(formData.get("appointmentsJson")), "appointments"),
    );
  }
  if (formData.has("checklistJson")) {
    await replaceChecklistItems(
      planId,
      parseJsonArray<ChecklistItemInput>(String(formData.get("checklistJson")), "checklist"),
    );
  }

  revalidateSuccession(planId);
}

export async function toggleSuccessionChecklistItem(itemId: string, isComplete: boolean) {
  const ctx = await requireModuleAccess("SUCCESSION");
  if (!canWrite(ctx, "SUCCESSION")) {
    throw new Error("You do not have permission to update checklist items.");
  }

  await ensureFamilySchema();
  const item = await db.successionChecklistItem.findFirst({
    where: {
      id: itemId,
      successionPlan: successionPlanFilter(ctx),
    },
  });
  if (!item) throw new Error("Checklist item not found.");

  await db.successionChecklistItem.update({
    where: { id: itemId },
    data: { isComplete },
  });

  revalidateSuccession(item.successionPlanId);
}

export async function updateSuccessionDocumentStatus(
  documentId: string,
  status: SuccessionDocumentStatus,
  signedDate?: string | null,
  jurisdiction?: string | null,
) {
  const ctx = await requireModuleAccess("SUCCESSION");
  if (!canWrite(ctx, "SUCCESSION")) {
    throw new Error("You do not have permission to update documents.");
  }

  await ensureFamilySchema();
  const doc = await db.successionPlanDocument.findFirst({
    where: {
      id: documentId,
      successionPlan: successionPlanFilter(ctx),
    },
  });
  if (!doc) throw new Error("Document not found.");

  await db.successionPlanDocument.update({
    where: { id: documentId },
    data: {
      status,
      signedDate: parseDate(signedDate ?? ""),
      jurisdiction: jurisdiction?.trim() || null,
    },
  });

  revalidateSuccession(doc.successionPlanId);
}

export async function deleteSuccessionPlan(planId: string) {
  const ctx = await requireModuleAccess("SUCCESSION");
  if (!canWrite(ctx, "SUCCESSION")) {
    throw new Error("You do not have permission to delete succession plans.");
  }

  await ensureFamilySchema();
  const plan = await getSuccessionPlan(planId);
  if (!plan) throw new Error("Succession plan not found.");

  for (const doc of plan.documents) {
    if (doc.fileUrl) await deleteBlobUrl(doc.fileUrl);
  }

  await db.successionPlan.delete({ where: { id: planId } });

  await logAudit({
    userId: ctx.id,
    action: "DELETE",
    resource: "SuccessionPlan",
    resourceId: planId,
    metadata: { title: plan.title },
  });

  revalidateSuccession();
  redirect(SUCCESSION_PATH);
}

export async function uploadSuccessionDocuments(formData: FormData) {
  const ctx = await requireModuleAccess("SUCCESSION");
  if (!canWrite(ctx, "SUCCESSION")) {
    throw new Error("You do not have permission to upload documents.");
  }

  await ensureFamilySchema();
  const planId = String(formData.get("planId") ?? "").trim();
  const documentId = String(formData.get("documentId") ?? "").trim();
  if (!planId || !documentId) throw new Error("Plan and document are required.");

  const plan = await getSuccessionPlan(planId);
  if (!plan) throw new Error("Succession plan not found.");

  const doc = plan.documents.find((d) => d.id === documentId);
  if (!doc) throw new Error("Document slot not found.");

  const files = getFilesFromFormData(formData, "files");
  if (files.length === 0) throw new Error("Select at least one file.");

  const file = files[0];
  const uploaded = await uploadPrivateFile(
    ["succession", planId, doc.documentType.toLowerCase()],
    file,
  );

  if (doc.fileUrl) await deleteBlobUrl(doc.fileUrl);

  const status = String(formData.get("status") ?? "SIGNED") as SuccessionDocumentStatus;

  try {
    await db.successionPlanDocument.update({
      where: { id: documentId },
      data: {
        fileName: uploaded.fileName,
        fileUrl: uploaded.fileUrl,
        mimeType: uploaded.mimeType,
        fileSize: uploaded.fileSize,
        status,
        signedDate: parseDate(String(formData.get("signedDate") ?? "")),
        jurisdiction: String(formData.get("jurisdiction") ?? "").trim() || null,
        uploadedById: ctx.id,
      },
    });
  } catch (error) {
    await deleteBlobUrl(uploaded.fileUrl);
    throw error;
  }

  revalidateSuccession(planId);
}

export async function deleteSuccessionDocument(documentId: string) {
  const ctx = await requireModuleAccess("SUCCESSION");
  if (!canWrite(ctx, "SUCCESSION")) {
    throw new Error("You do not have permission to delete documents.");
  }

  await ensureFamilySchema();
  const doc = await db.successionPlanDocument.findFirst({
    where: {
      id: documentId,
      successionPlan: successionPlanFilter(ctx),
    },
  });
  if (!doc) throw new Error("Document not found.");

  if (doc.fileUrl) await deleteBlobUrl(doc.fileUrl);

  await db.successionPlanDocument.update({
    where: { id: documentId },
    data: {
      fileName: null,
      fileUrl: null,
      mimeType: null,
      fileSize: null,
      status: "MISSING",
      signedDate: null,
    },
  });

  revalidateSuccession(doc.successionPlanId);
}
