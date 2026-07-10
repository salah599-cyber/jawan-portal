import { toNumber } from "@/lib/pe/helpers";
import type { PeCompanyDetail } from "@/lib/data/pe-portfolio";

function dec(value: { toString(): string } | number | null | undefined): string | null {
  if (value == null) return null;
  return value.toString();
}

export type SerializedPeCompany = ReturnType<typeof serializePeCompany>;

export function serializePeCompany(company: PeCompanyDetail) {
  return {
    id: company.id,
    name: company.name,
    tradingName: company.tradingName,
    country: company.country,
    legalEntityType: company.legalEntityType,
    sector: company.sector,
    stage: company.stage,
    status: company.status,
    riskRating: company.riskRating,
    notes: company.notes,
    entityId: company.entityId,
    entityName: company.entity.name,
    assetId: company.assetId,
    reportingCurrency: company.reportingCurrency,
    investments: company.investments.map((i) => ({
      id: i.id,
      investmentDate: i.investmentDate.toISOString(),
      roundName: i.roundName,
      instrument: i.instrument,
      amountReporting: dec(i.amountReporting),
      amountOriginal: dec(i.amountOriginal),
      currencyOriginal: i.currencyOriginal,
      sharesAcquired: dec(i.sharesAcquired),
      pricePerShare: dec(i.pricePerShare),
      preMoneyValuation: dec(i.preMoneyValuation),
      postMoneyValuation: dec(i.postMoneyValuation),
      ownershipPctAtEntry: dec(i.ownershipPctAtEntry),
      reservedAmount: dec(i.reservedAmount),
      notes: i.notes,
    })),
    shareholders: company.shareholders.map((s) => ({
      id: s.id,
      shareholderName: s.shareholderName,
      shareholderType: s.shareholderType,
      isOurStake: s.isOurStake,
      roundEntered: s.roundEntered,
      sharesHeld: dec(s.sharesHeld),
      shareClass: s.shareClass,
      ownershipPct: dec(s.ownershipPct),
      notes: s.notes,
    })),
    capTableRounds: company.capTableRounds.map((r) => ({
      id: r.id,
      roundName: r.roundName,
      roundDate: r.roundDate?.toISOString() ?? null,
      instrument: r.instrument,
      preMoneyValuation: dec(r.preMoneyValuation),
      postMoneyValuation: dec(r.postMoneyValuation),
      amountRaised: dec(r.amountRaised),
      newSharesIssued: dec(r.newSharesIssued),
      pricePerShare: dec(r.pricePerShare),
      leadInvestor: r.leadInvestor,
      notes: r.notes,
    })),
    dilutionEvents: company.dilutionEvents.map((e) => ({
      id: e.id,
      eventType: e.eventType,
      eventDate: e.eventDate?.toISOString() ?? null,
      sharesIssued: dec(e.sharesIssued),
      description: e.description,
    })),
    valuations: company.valuations.map((v) => ({
      id: v.id,
      valuationDate: v.valuationDate.toISOString(),
      postMoneyReporting: dec(v.postMoneyReporting),
      stakeFairValueReporting: dec(v.stakeFairValueReporting),
      method: v.method,
      notes: v.notes,
    })),
    distributions: company.distributions.map((d) => ({
      id: d.id,
      distributionDate: d.distributionDate.toISOString(),
      amountReporting: dec(d.amountReporting) ?? "0",
      distributionType: d.distributionType,
      notes: d.notes,
    })),
    exit: company.exit
      ? {
          id: company.exit.id,
          exitDate: company.exit.exitDate.toISOString(),
          exitType: company.exit.exitType,
          exitProceedsReporting: dec(company.exit.exitProceedsReporting),
          realisedGainLossReporting: dec(company.exit.realisedGainLossReporting),
          totalInvestedSnapshot: dec(company.exit.totalInvestedSnapshot),
          realizedGainPct: dec(company.exit.realizedGainPct),
          notes: company.exit.notes,
        }
      : null,
    contacts: company.contacts.map((c) => ({
      id: c.id,
      name: c.name,
      role: c.role,
      email: c.email,
      phone: c.phone,
      isBoardRep: c.isBoardRep,
      notes: c.notes,
    })),
    governance: company.governance
      ? {
          id: company.governance.id,
          boardSeat: company.governance.boardSeat,
          boardRepName: company.governance.boardRepName,
          observerRights: company.governance.observerRights,
          informationRights: company.governance.informationRights,
          reportingFrequency: company.governance.reportingFrequency,
          proRataRights: company.governance.proRataRights,
          dragAlong: company.governance.dragAlong,
          tagAlong: company.governance.tagAlong,
          antiDilution: company.governance.antiDilution,
          nextRoundTrigger: company.governance.nextRoundTrigger,
        }
      : null,
    monitoringReports: company.monitoringReports.map((r) => ({
      id: r.id,
      reportDate: r.reportDate.toISOString(),
      reportType: r.reportType,
      revenueReporting: dec(r.revenueReporting),
      burnRateReporting: dec(r.burnRateReporting),
      runwayMonths: dec(r.runwayMonths),
      customKpis: r.customKpis,
      notes: r.notes,
      documentId: r.documentId,
      documentName: r.document?.fileName ?? null,
    })),
    documents: company.documents.map((d) => ({
      id: d.id,
      documentType: d.documentType,
      fileName: d.fileName,
      fileUrl: d.fileUrl,
      mimeType: d.mimeType,
      fileSize: d.fileSize,
      notes: d.notes,
      createdAt: d.createdAt.toISOString(),
    })),
    totals: {
      totalInvested: company.investments.reduce((sum, i) => sum + toNumber(i.amountReporting), 0),
      totalDistributed: company.distributions.reduce((sum, d) => sum + toNumber(d.amountReporting), 0),
      latestFairValue: company.valuations[0]
        ? toNumber(company.valuations[0].stakeFairValueReporting)
        : null,
    },
  };
}
