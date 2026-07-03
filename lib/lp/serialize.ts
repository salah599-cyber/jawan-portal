import { computeLpCommitmentMetrics } from "@/lib/lp/metrics";
import type { LpCommitmentDetail } from "@/lib/data/lp-fund";

function dec(value: { toString(): string } | number | null | undefined): string | null {
  if (value == null) return null;
  return value.toString();
}

export type SerializedLpCommitment = ReturnType<typeof serializeLpCommitment>;

export function serializeLpCommitment(commitment: LpCommitmentDetail) {
  const metrics = computeLpCommitmentMetrics({
    commitmentAmount: commitment.commitmentAmount,
    capitalCalls: commitment.capitalCalls,
    distributions: commitment.distributions,
    navUpdates: commitment.navUpdates,
  });

  return {
    id: commitment.id,
    fundId: commitment.fundId,
    entityId: commitment.entityId,
    entityName: commitment.entity.name,
    assetId: commitment.assetId,
    commitmentAmount: dec(commitment.commitmentAmount) ?? "0",
    commitmentDate: commitment.commitmentDate.toISOString(),
    commitmentCurrency: commitment.commitmentCurrency,
    status: commitment.status,
    sideLetterNotes: commitment.sideLetterNotes,
    ownershipPctOfFund: dec(commitment.ownershipPctOfFund),
    fund: {
      id: commitment.fund.id,
      name: commitment.fund.name,
      strategy: commitment.fund.strategy,
      vintageYear: commitment.fund.vintageYear,
      fundSize: dec(commitment.fund.fundSize),
      currency: commitment.fund.currency,
      fundTermYears: commitment.fund.fundTermYears,
      investmentPeriodEnd: commitment.fund.investmentPeriodEnd?.toISOString() ?? null,
      status: commitment.fund.status,
      notes: commitment.fund.notes,
      gpManager: commitment.fund.gpManager
        ? {
            id: commitment.fund.gpManager.id,
            name: commitment.fund.gpManager.name,
            country: commitment.fund.gpManager.country,
            website: commitment.fund.gpManager.website,
          }
        : null,
    },
    capitalCalls: commitment.capitalCalls.map((call) => ({
      id: call.id,
      callDate: call.callDate.toISOString(),
      dueDate: call.dueDate?.toISOString() ?? null,
      amount: dec(call.amount) ?? "0",
      currency: call.currency,
      status: call.status,
      paidDate: call.paidDate?.toISOString() ?? null,
      reference: call.reference,
      notes: call.notes,
    })),
    distributions: commitment.distributions.map((dist) => ({
      id: dist.id,
      distributionDate: dist.distributionDate.toISOString(),
      amount: dec(dist.amount) ?? "0",
      currency: dist.currency,
      distributionType: dist.distributionType,
      isRecallable: dist.isRecallable,
      recalledAmount: dec(dist.recalledAmount),
      notes: dist.notes,
    })),
    navUpdates: commitment.navUpdates.map((nav) => ({
      id: nav.id,
      asOfDate: nav.asOfDate.toISOString(),
      nav: dec(nav.nav) ?? "0",
      currency: nav.currency,
      source: nav.source,
      gpReportedTvpi: dec(nav.gpReportedTvpi),
      gpReportedIrr: dec(nav.gpReportedIrr),
      notes: nav.notes,
    })),
    documents: commitment.documents.map((doc) => ({
      id: doc.id,
      documentType: doc.documentType,
      fileName: doc.fileName,
      fileUrl: doc.fileUrl,
      mimeType: doc.mimeType,
      fileSize: doc.fileSize,
      notes: doc.notes,
      createdAt: doc.createdAt.toISOString(),
    })),
    metrics: {
      paidInCapital: metrics.paidInCapital,
      unfundedCommitment: metrics.unfundedCommitment,
      totalDistributions: metrics.totalDistributions,
      recallableOutstanding: metrics.recallableOutstanding,
      latestNav: metrics.latestNav,
      latestNavDate: metrics.latestNavDate?.toISOString() ?? null,
      carryingValue: metrics.carryingValue,
      dpi: metrics.dpi,
      rvpi: metrics.rvpi,
      tvpi: metrics.tvpi,
      netIrr: metrics.netIrr,
      gpReportedTvpi: metrics.gpReportedTvpi,
      gpReportedIrr: metrics.gpReportedIrr,
    },
    updatedAt: commitment.updatedAt.toISOString(),
  };
}
