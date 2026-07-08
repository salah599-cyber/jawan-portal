import { getChecklistCompletionPct, resolvePlanStatus } from "@/lib/succession/helpers";
import type { SuccessionPlanDetail } from "@/lib/actions/succession";

function dec(value: { toString(): string } | number | null | undefined): string | null {
  if (value == null) return null;
  return value.toString();
}

export type SerializedSuccessionPlan = ReturnType<typeof serializeSuccessionPlan>;

export function serializeSuccessionPlan(plan: SuccessionPlanDetail) {
  const effectiveStatus = resolvePlanStatus(plan.status, plan.nextReviewDate);
  const checklistCompletionPct = getChecklistCompletionPct(plan.checklistItems);
  const missingDocsCount = plan.documents.filter((doc) => doc.status === "MISSING").length;

  return {
    id: plan.id,
    title: plan.title,
    status: plan.status,
    effectiveStatus,
    entityId: plan.entityId,
    entityName: plan.entity?.name ?? null,
    generalInstructions: plan.generalInstructions,
    incapacitationNotes: plan.incapacitationNotes,
    lastReviewDate: plan.lastReviewDate?.toISOString() ?? null,
    nextReviewDate: plan.nextReviewDate?.toISOString() ?? null,
    notes: plan.notes,
    checklistCompletionPct,
    missingDocsCount,
    distributionInstructions: plan.distributionInstructions.map((item) => ({
      id: item.id,
      beneficiaryMemberId: item.beneficiaryMemberId,
      beneficiaryName: item.beneficiaryMember?.fullName ?? null,
      entityId: item.entityId,
      entityName: item.entity?.name ?? null,
      assetId: item.assetId,
      assetName: item.asset?.name ?? null,
      landParcelId: item.landParcelId,
      landParcelName: item.landParcel?.name ?? null,
      registeredCompanyId: item.registeredCompanyId,
      registeredCompanyName: item.registeredCompany?.name ?? null,
      rePropertyId: item.rePropertyId,
      rePropertyName: item.reProperty?.name ?? null,
      vehicleId: item.vehicleId,
      vehicleName: item.vehicle?.name ?? null,
      allocationPct: dec(item.allocationPct),
      allocationAmount: dec(item.allocationAmount),
      currency: item.currency,
      instructions: item.instructions,
      sortOrder: item.sortOrder,
    })),
    appointments: plan.appointments.map((item) => ({
      id: item.id,
      familyMemberId: item.familyMemberId,
      memberName: item.familyMember.fullName,
      role: item.role,
      isPrimary: item.isPrimary,
      notes: item.notes,
      sortOrder: item.sortOrder,
    })),
    documents: plan.documents.map((doc) => ({
      id: doc.id,
      documentType: doc.documentType,
      status: doc.status,
      fileName: doc.fileName,
      fileUrl: doc.fileUrl,
      mimeType: doc.mimeType,
      fileSize: doc.fileSize,
      signedDate: doc.signedDate?.toISOString() ?? null,
      jurisdiction: doc.jurisdiction,
      notes: doc.notes,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    })),
    checklistItems: plan.checklistItems.map((item) => ({
      id: item.id,
      label: item.label,
      category: item.category,
      isComplete: item.isComplete,
      dueDate: item.dueDate?.toISOString() ?? null,
      sortOrder: item.sortOrder,
    })),
    updatedAt: plan.updatedAt.toISOString(),
  };
}
