import type { PrivatePropertyDetail } from "@/lib/data/private-real-estate";

function dec(value: { toString(): string } | number | null | undefined): string | null {
  if (value == null) return null;
  return value.toString();
}

function dateIso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

export type SerializedPrivateProperty = ReturnType<typeof serializePrivateProperty>;

export function serializePrivateProperty(property: PrivatePropertyDetail) {
  const detail = property.privateDetail;
  return {
    id: property.id,
    name: property.name,
    status: property.status,
    ownershipStatus: property.ownershipStatus,
    entityId: property.entityId,
    entityName: property.entity.name,
    assetId: property.assetId,
    liabilityId: property.liabilityId,
    purchaseDate: dateIso(property.purchaseDate),
    purchasePriceOmr: dec(property.purchasePriceOmr),
    currentValuationOmr: dec(property.currentValuationOmr),
    lastValuationDate: dateIso(property.lastValuationDate),
    valuationMethod: property.valuationMethod,
    governorate: property.governorate,
    wilayat: property.wilayat,
    area: property.area,
    streetAddress: property.streetAddress,
    plotNumber: property.plotNumber,
    parcelNumber: property.parcelNumber,
    gpsLat: dec(property.gpsLat),
    gpsLng: dec(property.gpsLng),
    googleMapsUrl: property.googleMapsUrl,
    landAreaSqm: dec(property.landAreaSqm),
    builtUpAreaSqm: dec(property.builtUpAreaSqm),
    numFloors: property.numFloors,
    yearBuilt: property.yearBuilt,
    mortgageBank: property.mortgageBank,
    mortgageOutstandingOmr: dec(property.mortgageOutstandingOmr),
    mortgageMonthlyPaymentOmr: dec(property.mortgageMonthlyPaymentOmr),
    mortgageEndDate: dateIso(property.mortgageEndDate),
    notes: property.notes,
    ownerDiscrepancy: property.ownerDiscrepancy,
    monthlyRunningCostOmr: property.monthlyRunningCostOmr,
    detail: detail
      ? {
          titleDeedNumber: detail.titleDeedNumber,
          registeredOwner: detail.registeredOwner,
          beneficialOwner: detail.beneficialOwner,
          numBedrooms: detail.numBedrooms,
          numBathrooms: detail.numBathrooms,
          numParkingSpaces: detail.numParkingSpaces,
          constructionType: detail.constructionType,
          finishingQuality: detail.finishingQuality,
          furnishingStatus: detail.furnishingStatus,
          hasPool: detail.hasPool,
          hasGardenLandscaping: detail.hasGardenLandscaping,
          hasSmartHome: detail.hasSmartHome,
          condition: detail.condition,
          lastRenovationDate: dateIso(detail.lastRenovationDate),
          lastRenovationCostOmr: dec(detail.lastRenovationCostOmr),
          wasiyyaConditions: detail.wasiyyaConditions,
        }
      : null,
    runningCosts: property.privateRunningCosts.map((cost) => ({
      id: cost.id,
      category: cost.category,
      provider: cost.provider,
      meterNumber: cost.meterNumber,
      accountNumber: cost.accountNumber,
      frequency: cost.frequency,
      monthlyCostOmr: dec(cost.monthlyCostOmr),
      annualCostOmr: dec(cost.annualCostOmr),
      paymentStatus: cost.paymentStatus,
      notes: cost.notes,
    })),
    staff: property.privateStaff.map((member) => ({
      id: member.id,
      fullName: member.fullName,
      nationality: member.nationality,
      idNumber: member.idNumber,
      role: member.role,
      arrangement: member.arrangement,
      contractExpiry: dateIso(member.contractExpiry),
      visaExpiry: dateIso(member.visaExpiry),
      monthlySalaryOmr: dec(member.monthlySalaryOmr),
      notes: member.notes,
    })),
    documents: property.documents.map((doc) => ({
      id: doc.id,
      documentType: doc.documentType,
      fileName: doc.fileName,
      fileUrl: doc.fileUrl,
      mimeType: doc.mimeType,
      expiryDate: dateIso(doc.expiryDate),
      notes: doc.notes,
      createdAt: dateIso(doc.createdAt),
    })),
    valuations: property.valuations.map((valuation) => ({
      id: valuation.id,
      valuationDate: dateIso(valuation.valuationDate),
      valueOmr: dec(valuation.valuationOmr),
      method: valuation.method,
      notes: valuation.notes,
    })),
    liability: property.liability
      ? {
          id: property.liability.id,
          name: property.liability.name,
          lender: property.liability.lender,
          outstandingBalance: dec(property.liability.outstandingBalance ?? property.liability.amount),
          currency: property.liability.currency,
          maturityDate: dateIso(property.liability.maturityDate),
        }
      : null,
    beneficiaryDesignations: property.beneficiaryDesignations.map((designation) => ({
      id: designation.id,
      familyMemberId: designation.familyMemberId,
      familyMemberName:
        designation.familyMember.preferredName ?? designation.familyMember.fullName,
      allocationPct: dec(designation.allocationPct),
      notes: designation.notes,
    })),
    successionLinks: property.successionDistributionInstructions.map((instruction) => ({
      id: instruction.id,
      planId: instruction.successionPlan?.id ?? null,
      planTitle: instruction.successionPlan?.title ?? null,
      planStatus: instruction.successionPlan?.status ?? null,
      beneficiaryName:
        instruction.beneficiaryMember?.preferredName ??
        instruction.beneficiaryMember?.fullName ??
        null,
      instructions: instruction.instructions,
      allocationPct: dec(instruction.allocationPct),
    })),
    insurancePolicies: property.insurancePolicies.map((policy) => ({
      id: policy.id,
      policyNumber: policy.policyNumber,
      insurer: policy.insurer,
      expiryDate: dateIso(policy.expiryDate),
      status: policy.status,
    })),
  };
}
