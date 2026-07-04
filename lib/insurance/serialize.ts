import { resolvePolicyStatus } from "@/lib/insurance/helpers";
import type { InsurancePolicyDetail } from "@/lib/actions/insurance";

function dec(value: { toString(): string } | number | null | undefined): string | null {
  if (value == null) return null;
  return value.toString();
}

export type SerializedInsurancePolicy = ReturnType<typeof serializeInsurancePolicy>;

export function serializeInsurancePolicy(policy: InsurancePolicyDetail) {
  const effectiveStatus = resolvePolicyStatus(policy.status, policy.expiryDate);

  return {
    id: policy.id,
    entityId: policy.entityId,
    entityName: policy.entity.name,
    policyType: policy.policyType,
    insurer: policy.insurer,
    policyNumber: policy.policyNumber,
    policyHolder: policy.policyHolder,
    description: policy.description,
    premium: dec(policy.premium),
    premiumFrequency: policy.premiumFrequency,
    coverageAmount: dec(policy.coverageAmount),
    currency: policy.currency,
    startDate: policy.startDate?.toISOString() ?? null,
    expiryDate: policy.expiryDate?.toISOString() ?? null,
    renewalDate: policy.renewalDate?.toISOString() ?? null,
    status: policy.status,
    effectiveStatus,
    vehicleId: policy.vehicleId,
    rePropertyId: policy.rePropertyId,
    landParcelId: policy.landParcelId,
    registeredCompanyId: policy.registeredCompanyId,
    linkedAssetLabel:
      policy.vehicle?.name ??
      policy.reProperty?.name ??
      policy.landParcel?.name ??
      policy.registeredCompany?.name ??
      null,
    notes: policy.notes,
    documents: policy.documents.map((doc) => ({
      id: doc.id,
      documentType: doc.documentType,
      fileName: doc.fileName,
      fileUrl: doc.fileUrl,
      mimeType: doc.mimeType,
      fileSize: doc.fileSize,
      notes: doc.notes,
      createdAt: doc.createdAt.toISOString(),
    })),
    updatedAt: policy.updatedAt.toISOString(),
  };
}
