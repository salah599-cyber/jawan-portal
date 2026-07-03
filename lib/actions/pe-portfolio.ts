"use server";

import { put } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { ensurePeSchema } from "@/lib/db/ensure-pe-schema";
import { deleteBlobUrl } from "@/lib/blob";
import { logAudit } from "@/lib/audit/log";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { peCompanyEntityFilter } from "@/lib/permissions/scoped-queries";
import { PE_PATH, peStatusToAssetStatus, syncPeCompanyAsset } from "@/lib/pe/asset-sync";
import { parseDate, parseDecimal, parseIntRating } from "@/lib/pe/helpers";
import type {
  PeAntiDilution,
  PeCompanyStatus,
  PeContactRole,
  PeDilutionEventType,
  PeDistributionType,
  PeDocumentType,
  PeExitType,
  PeInstrument,
  PeReportType,
  PeShareholderType,
  PeStage,
  PeValuationMethod,
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

async function getPeCompanyOrThrow(
  ctx: Awaited<ReturnType<typeof requireModuleAccess>>,
  companyId: string,
) {
  const company = await db.peCompany.findFirst({
    where: { id: companyId, ...peCompanyEntityFilter(ctx) },
  });
  if (!company) throw new Error("Company not found.");
  return company;
}

function revalidatePeCompany(companyId: string) {
  revalidatePath(PE_PATH);
  revalidatePath(`${PE_PATH}/${companyId}`);
  revalidatePath(`${PE_PATH}/${companyId}/edit`);
  revalidatePath("/assets");
  revalidatePath("/dashboard");
}

function readPeCompanyFormData(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const entityId = String(formData.get("entityId") ?? "").trim();
  const reportingCurrency = String(formData.get("reportingCurrency") ?? "USD").trim() || "USD";

  if (!name) throw new Error("Company name is required.");
  if (!entityId) throw new Error("Entity is required.");

  return {
    name,
    tradingName: String(formData.get("tradingName") ?? "").trim() || undefined,
    country: String(formData.get("country") ?? "").trim() || undefined,
    legalEntityType: String(formData.get("legalEntityType") ?? "").trim() || undefined,
    sector: String(formData.get("sector") ?? "").trim() || undefined,
    stage: String(formData.get("stage") ?? "SEED") as PeStage,
    status: String(formData.get("status") ?? "ACTIVE") as PeCompanyStatus,
    riskRating: parseIntRating(String(formData.get("riskRating") ?? "")),
    notes: String(formData.get("notes") ?? "").trim() || undefined,
    entityId,
    reportingCurrency,
  };
}

export async function createPeCompany(formData: FormData) {
  const ctx = await requireModuleAccess("PRIVATE_EQUITY");
  if (!canWrite(ctx, "PRIVATE_EQUITY")) {
    throw new Error("You do not have permission to add portfolio companies.");
  }

  await ensurePeSchema();

  const data = readPeCompanyFormData(formData);
  assertEntityAccess(ctx, data.entityId);

  const asset = await db.asset.create({
    data: {
      name: data.name,
      category: "PRIVATE_EQUITY",
      status: peStatusToAssetStatus(data.status),
      entityId: data.entityId,
      currency: data.reportingCurrency,
      description: data.sector ? `${data.sector} · ${data.stage}` : undefined,
    },
  });

  const company = await db.peCompany.create({
    data: {
      ...data,
      assetId: asset.id,
    },
  });

  await logAudit({
    userId: ctx.id,
    action: "CREATE",
    resource: "PeCompany",
    resourceId: company.id,
    metadata: { name: company.name, stage: company.stage },
  });

  revalidatePeCompany(company.id);
  return company;
}

export async function updatePeCompany(id: string, formData: FormData) {
  const ctx = await requireModuleAccess("PRIVATE_EQUITY");
  if (!canWrite(ctx, "PRIVATE_EQUITY")) {
    throw new Error("You do not have permission to update portfolio companies.");
  }

  const existing = await getPeCompanyOrThrow(ctx, id);
  const data = readPeCompanyFormData(formData);
  assertEntityAccess(ctx, data.entityId);

  const company = await db.peCompany.update({
    where: { id },
    data,
  });

  if (existing.assetId) {
    await db.asset.update({
      where: { id: existing.assetId },
      data: {
        name: data.name,
        status: peStatusToAssetStatus(data.status),
        entityId: data.entityId,
        currency: data.reportingCurrency,
        description: data.sector ? `${data.sector} · ${data.stage}` : undefined,
      },
    });
    await syncPeCompanyAsset(id);
  }

  await logAudit({
    userId: ctx.id,
    action: "UPDATE",
    resource: "PeCompany",
    resourceId: id,
    metadata: { name: company.name },
  });

  revalidatePeCompany(id);
  return company;
}

export async function deletePeCompany(id: string) {
  const ctx = await requireModuleAccess("PRIVATE_EQUITY");
  if (!canWrite(ctx, "PRIVATE_EQUITY")) {
    throw new Error("You do not have permission to delete portfolio companies.");
  }

  const company = await db.peCompany.findFirst({
    where: { id, ...peCompanyEntityFilter(ctx) },
    include: { documents: true },
  });
  if (!company) throw new Error("Company not found.");

  for (const doc of company.documents) {
    await deleteBlobUrl(doc.fileUrl);
  }

  const assetId = company.assetId;
  await db.peCompany.delete({ where: { id } });
  if (assetId) await db.asset.delete({ where: { id: assetId } });

  await logAudit({
    userId: ctx.id,
    action: "DELETE",
    resource: "PeCompany",
    resourceId: id,
    metadata: { name: company.name },
  });

  revalidatePath(PE_PATH);
  revalidatePath("/assets");
  revalidatePath("/dashboard");
}

export async function upsertPeInvestment(formData: FormData) {
  const ctx = await requireModuleAccess("PRIVATE_EQUITY");
  if (!canWrite(ctx, "PRIVATE_EQUITY")) {
    throw new Error("You do not have permission to manage investments.");
  }

  const companyId = String(formData.get("companyId") ?? "").trim();
  const id = String(formData.get("id") ?? "").trim();
  if (!companyId) throw new Error("Company is required.");

  await getPeCompanyOrThrow(ctx, companyId);

  const investmentDate = parseDate(String(formData.get("investmentDate") ?? ""));
  if (!investmentDate) throw new Error("Investment date is required.");

  const data = {
    companyId,
    investmentDate,
    roundName: String(formData.get("roundName") ?? "").trim() || undefined,
    instrument: String(formData.get("instrument") ?? "ORDINARY_SHARES") as PeInstrument,
    amountReporting: parseDecimal(String(formData.get("amountReporting") ?? "")),
    amountOriginal: parseDecimal(String(formData.get("amountOriginal") ?? "")),
    currencyOriginal: String(formData.get("currencyOriginal") ?? "").trim() || undefined,
    sharesAcquired: parseDecimal(String(formData.get("sharesAcquired") ?? "")),
    pricePerShare: parseDecimal(String(formData.get("pricePerShare") ?? "")),
    preMoneyValuation: parseDecimal(String(formData.get("preMoneyValuation") ?? "")),
    postMoneyValuation: parseDecimal(String(formData.get("postMoneyValuation") ?? "")),
    ownershipPctAtEntry: parseDecimal(String(formData.get("ownershipPctAtEntry") ?? "")),
    reservedAmount: parseDecimal(String(formData.get("reservedAmount") ?? "")),
    notes: String(formData.get("notes") ?? "").trim() || undefined,
  };

  const investment = id
    ? await db.peInvestment.update({ where: { id }, data })
    : await db.peInvestment.create({ data });

  await syncPeCompanyAsset(companyId);

  await logAudit({
    userId: ctx.id,
    action: id ? "UPDATE" : "CREATE",
    resource: "PeInvestment",
    resourceId: investment.id,
    metadata: { companyId },
  });

  revalidatePeCompany(companyId);
  return investment;
}

export async function deletePeInvestment(id: string) {
  const ctx = await requireModuleAccess("PRIVATE_EQUITY");
  if (!canWrite(ctx, "PRIVATE_EQUITY")) {
    throw new Error("You do not have permission to delete investments.");
  }

  const investment = await db.peInvestment.findFirst({
    where: { id, company: peCompanyEntityFilter(ctx) },
  });
  if (!investment) throw new Error("Investment not found.");

  await db.peInvestment.delete({ where: { id } });
  await syncPeCompanyAsset(investment.companyId);

  await logAudit({
    userId: ctx.id,
    action: "DELETE",
    resource: "PeInvestment",
    resourceId: id,
    metadata: { companyId: investment.companyId },
  });

  revalidatePeCompany(investment.companyId);
}

export async function upsertPeShareholder(formData: FormData) {
  const ctx = await requireModuleAccess("PRIVATE_EQUITY");
  if (!canWrite(ctx, "PRIVATE_EQUITY")) throw new Error("You do not have permission.");

  const companyId = String(formData.get("companyId") ?? "").trim();
  const id = String(formData.get("id") ?? "").trim();
  const shareholderName = String(formData.get("shareholderName") ?? "").trim();
  if (!companyId) throw new Error("Company is required.");
  if (!shareholderName) throw new Error("Shareholder name is required.");

  await getPeCompanyOrThrow(ctx, companyId);

  const data = {
    companyId,
    shareholderName,
    shareholderType: String(formData.get("shareholderType") ?? "OTHER") as PeShareholderType,
    isOurStake: formData.get("isOurStake") === "true" || formData.get("isOurStake") === "on",
    roundEntered: String(formData.get("roundEntered") ?? "").trim() || undefined,
    sharesHeld: parseDecimal(String(formData.get("sharesHeld") ?? "")),
    shareClass: String(formData.get("shareClass") ?? "").trim() || undefined,
    ownershipPct: parseDecimal(String(formData.get("ownershipPct") ?? "")),
    notes: String(formData.get("notes") ?? "").trim() || undefined,
  };

  const shareholder = id
    ? await db.peCapTableShareholder.update({ where: { id }, data })
    : await db.peCapTableShareholder.create({ data });

  await logAudit({
    userId: ctx.id,
    action: id ? "UPDATE" : "CREATE",
    resource: "PeCapTableShareholder",
    resourceId: shareholder.id,
    metadata: { companyId },
  });

  revalidatePeCompany(companyId);
  return shareholder;
}

export async function deletePeShareholder(id: string) {
  const ctx = await requireModuleAccess("PRIVATE_EQUITY");
  if (!canWrite(ctx, "PRIVATE_EQUITY")) throw new Error("You do not have permission.");

  const shareholder = await db.peCapTableShareholder.findFirst({
    where: { id, company: peCompanyEntityFilter(ctx) },
  });
  if (!shareholder) throw new Error("Shareholder not found.");

  await db.peCapTableShareholder.delete({ where: { id } });

  await logAudit({
    userId: ctx.id,
    action: "DELETE",
    resource: "PeCapTableShareholder",
    resourceId: id,
    metadata: { companyId: shareholder.companyId },
  });

  revalidatePeCompany(shareholder.companyId);
}

export async function upsertPeCapTableRound(formData: FormData) {
  const ctx = await requireModuleAccess("PRIVATE_EQUITY");
  if (!canWrite(ctx, "PRIVATE_EQUITY")) throw new Error("You do not have permission.");

  const companyId = String(formData.get("companyId") ?? "").trim();
  const id = String(formData.get("id") ?? "").trim();
  const roundName = String(formData.get("roundName") ?? "").trim();
  if (!companyId) throw new Error("Company is required.");
  if (!roundName) throw new Error("Round name is required.");

  await getPeCompanyOrThrow(ctx, companyId);

  const data = {
    companyId,
    roundName,
    roundDate: parseDate(String(formData.get("roundDate") ?? "")),
    instrument: String(formData.get("instrument") ?? "ORDINARY_SHARES") as PeInstrument,
    preMoneyValuation: parseDecimal(String(formData.get("preMoneyValuation") ?? "")),
    postMoneyValuation: parseDecimal(String(formData.get("postMoneyValuation") ?? "")),
    amountRaised: parseDecimal(String(formData.get("amountRaised") ?? "")),
    newSharesIssued: parseDecimal(String(formData.get("newSharesIssued") ?? "")),
    pricePerShare: parseDecimal(String(formData.get("pricePerShare") ?? "")),
    leadInvestor: String(formData.get("leadInvestor") ?? "").trim() || undefined,
    notes: String(formData.get("notes") ?? "").trim() || undefined,
  };

  const round = id
    ? await db.peCapTableRound.update({ where: { id }, data })
    : await db.peCapTableRound.create({ data });

  await logAudit({
    userId: ctx.id,
    action: id ? "UPDATE" : "CREATE",
    resource: "PeCapTableRound",
    resourceId: round.id,
    metadata: { companyId },
  });

  revalidatePeCompany(companyId);
  return round;
}

export async function deletePeCapTableRound(id: string) {
  const ctx = await requireModuleAccess("PRIVATE_EQUITY");
  if (!canWrite(ctx, "PRIVATE_EQUITY")) throw new Error("You do not have permission.");

  const round = await db.peCapTableRound.findFirst({
    where: { id, company: peCompanyEntityFilter(ctx) },
  });
  if (!round) throw new Error("Round not found.");

  await db.peCapTableRound.delete({ where: { id } });

  await logAudit({
    userId: ctx.id,
    action: "DELETE",
    resource: "PeCapTableRound",
    resourceId: id,
    metadata: { companyId: round.companyId },
  });

  revalidatePeCompany(round.companyId);
}

export async function upsertPeDilutionEvent(formData: FormData) {
  const ctx = await requireModuleAccess("PRIVATE_EQUITY");
  if (!canWrite(ctx, "PRIVATE_EQUITY")) throw new Error("You do not have permission.");

  const companyId = String(formData.get("companyId") ?? "").trim();
  const id = String(formData.get("id") ?? "").trim();
  if (!companyId) throw new Error("Company is required.");

  await getPeCompanyOrThrow(ctx, companyId);

  const data = {
    companyId,
    eventType: String(formData.get("eventType") ?? "OTHER") as PeDilutionEventType,
    eventDate: parseDate(String(formData.get("eventDate") ?? "")),
    sharesIssued: parseDecimal(String(formData.get("sharesIssued") ?? "")),
    description: String(formData.get("description") ?? "").trim() || undefined,
  };

  const event = id
    ? await db.peCapTableDilutionEvent.update({ where: { id }, data })
    : await db.peCapTableDilutionEvent.create({ data });

  await logAudit({
    userId: ctx.id,
    action: id ? "UPDATE" : "CREATE",
    resource: "PeCapTableDilutionEvent",
    resourceId: event.id,
    metadata: { companyId },
  });

  revalidatePeCompany(companyId);
  return event;
}

export async function deletePeDilutionEvent(id: string) {
  const ctx = await requireModuleAccess("PRIVATE_EQUITY");
  if (!canWrite(ctx, "PRIVATE_EQUITY")) throw new Error("You do not have permission.");

  const event = await db.peCapTableDilutionEvent.findFirst({
    where: { id, company: peCompanyEntityFilter(ctx) },
  });
  if (!event) throw new Error("Dilution event not found.");

  await db.peCapTableDilutionEvent.delete({ where: { id } });

  await logAudit({
    userId: ctx.id,
    action: "DELETE",
    resource: "PeCapTableDilutionEvent",
    resourceId: id,
    metadata: { companyId: event.companyId },
  });

  revalidatePeCompany(event.companyId);
}

export async function upsertPeValuation(formData: FormData) {
  const ctx = await requireModuleAccess("PRIVATE_EQUITY");
  if (!canWrite(ctx, "PRIVATE_EQUITY")) throw new Error("You do not have permission.");

  const companyId = String(formData.get("companyId") ?? "").trim();
  const id = String(formData.get("id") ?? "").trim();
  if (!companyId) throw new Error("Company is required.");

  const valuationDate = parseDate(String(formData.get("valuationDate") ?? ""));
  if (!valuationDate) throw new Error("Valuation date is required.");

  await getPeCompanyOrThrow(ctx, companyId);

  const data = {
    companyId,
    valuationDate,
    postMoneyReporting: parseDecimal(String(formData.get("postMoneyReporting") ?? "")),
    stakeFairValueReporting: parseDecimal(String(formData.get("stakeFairValueReporting") ?? "")),
    method: String(formData.get("method") ?? "LAST_ROUND") as PeValuationMethod,
    notes: String(formData.get("notes") ?? "").trim() || undefined,
  };

  const valuation = id
    ? await db.peValuation.update({ where: { id }, data })
    : await db.peValuation.create({ data });

  await syncPeCompanyAsset(companyId);

  await logAudit({
    userId: ctx.id,
    action: id ? "UPDATE" : "CREATE",
    resource: "PeValuation",
    resourceId: valuation.id,
    metadata: { companyId },
  });

  revalidatePeCompany(companyId);
  return valuation;
}

export async function deletePeValuation(id: string) {
  const ctx = await requireModuleAccess("PRIVATE_EQUITY");
  if (!canWrite(ctx, "PRIVATE_EQUITY")) throw new Error("You do not have permission.");

  const valuation = await db.peValuation.findFirst({
    where: { id, company: peCompanyEntityFilter(ctx) },
  });
  if (!valuation) throw new Error("Valuation not found.");

  await db.peValuation.delete({ where: { id } });
  await syncPeCompanyAsset(valuation.companyId);

  await logAudit({
    userId: ctx.id,
    action: "DELETE",
    resource: "PeValuation",
    resourceId: id,
    metadata: { companyId: valuation.companyId },
  });

  revalidatePeCompany(valuation.companyId);
}

export async function upsertPeDistribution(formData: FormData) {
  const ctx = await requireModuleAccess("PRIVATE_EQUITY");
  if (!canWrite(ctx, "PRIVATE_EQUITY")) throw new Error("You do not have permission.");

  const companyId = String(formData.get("companyId") ?? "").trim();
  const id = String(formData.get("id") ?? "").trim();
  if (!companyId) throw new Error("Company is required.");

  const distributionDate = parseDate(String(formData.get("distributionDate") ?? ""));
  const amountReporting = parseDecimal(String(formData.get("amountReporting") ?? ""));
  if (!distributionDate) throw new Error("Distribution date is required.");
  if (!amountReporting) throw new Error("Amount is required.");

  await getPeCompanyOrThrow(ctx, companyId);

  const data = {
    companyId,
    distributionDate,
    amountReporting,
    distributionType: String(formData.get("distributionType") ?? "DIVIDEND") as PeDistributionType,
    notes: String(formData.get("notes") ?? "").trim() || undefined,
  };

  const distribution = id
    ? await db.peDistribution.update({ where: { id }, data })
    : await db.peDistribution.create({ data });

  await logAudit({
    userId: ctx.id,
    action: id ? "UPDATE" : "CREATE",
    resource: "PeDistribution",
    resourceId: distribution.id,
    metadata: { companyId },
  });

  revalidatePeCompany(companyId);
  return distribution;
}

export async function deletePeDistribution(id: string) {
  const ctx = await requireModuleAccess("PRIVATE_EQUITY");
  if (!canWrite(ctx, "PRIVATE_EQUITY")) throw new Error("You do not have permission.");

  const distribution = await db.peDistribution.findFirst({
    where: { id, company: peCompanyEntityFilter(ctx) },
  });
  if (!distribution) throw new Error("Distribution not found.");

  await db.peDistribution.delete({ where: { id } });

  await logAudit({
    userId: ctx.id,
    action: "DELETE",
    resource: "PeDistribution",
    resourceId: id,
    metadata: { companyId: distribution.companyId },
  });

  revalidatePeCompany(distribution.companyId);
}

export async function upsertPeExit(formData: FormData) {
  const ctx = await requireModuleAccess("PRIVATE_EQUITY");
  if (!canWrite(ctx, "PRIVATE_EQUITY")) throw new Error("You do not have permission.");

  const companyId = String(formData.get("companyId") ?? "").trim();
  const id = String(formData.get("id") ?? "").trim();
  if (!companyId) throw new Error("Company is required.");

  const exitDate = parseDate(String(formData.get("exitDate") ?? ""));
  if (!exitDate) throw new Error("Exit date is required.");

  const company = await getPeCompanyOrThrow(ctx, companyId);

  const data = {
    companyId,
    exitDate,
    exitType: String(formData.get("exitType") ?? "TRADE_SALE") as PeExitType,
    exitProceedsReporting: parseDecimal(String(formData.get("exitProceedsReporting") ?? "")),
    realisedGainLossReporting: parseDecimal(String(formData.get("realisedGainLossReporting") ?? "")),
    notes: String(formData.get("notes") ?? "").trim() || undefined,
  };

  const exit = id
    ? await db.peExit.update({ where: { id }, data })
    : await db.peExit.create({ data });

  if (company.status !== "EXITED" && company.status !== "WRITTEN_OFF") {
    await db.peCompany.update({
      where: { id: companyId },
      data: { status: data.exitType === "WRITE_OFF" ? "WRITTEN_OFF" : "EXITED" },
    });
  }

  await syncPeCompanyAsset(companyId);

  await logAudit({
    userId: ctx.id,
    action: id ? "UPDATE" : "CREATE",
    resource: "PeExit",
    resourceId: exit.id,
    metadata: { companyId },
  });

  revalidatePeCompany(companyId);
  return exit;
}

export async function deletePeExit(id: string) {
  const ctx = await requireModuleAccess("PRIVATE_EQUITY");
  if (!canWrite(ctx, "PRIVATE_EQUITY")) throw new Error("You do not have permission.");

  const exit = await db.peExit.findFirst({
    where: { id, company: peCompanyEntityFilter(ctx) },
  });
  if (!exit) throw new Error("Exit not found.");

  await db.peExit.delete({ where: { id } });
  await syncPeCompanyAsset(exit.companyId);

  await logAudit({
    userId: ctx.id,
    action: "DELETE",
    resource: "PeExit",
    resourceId: id,
    metadata: { companyId: exit.companyId },
  });

  revalidatePeCompany(exit.companyId);
}

export async function upsertPeContact(formData: FormData) {
  const ctx = await requireModuleAccess("PRIVATE_EQUITY");
  if (!canWrite(ctx, "PRIVATE_EQUITY")) throw new Error("You do not have permission.");

  const companyId = String(formData.get("companyId") ?? "").trim();
  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  if (!companyId) throw new Error("Company is required.");
  if (!name) throw new Error("Contact name is required.");

  await getPeCompanyOrThrow(ctx, companyId);

  const data = {
    companyId,
    name,
    role: String(formData.get("role") ?? "OTHER") as PeContactRole,
    email: String(formData.get("email") ?? "").trim() || undefined,
    phone: String(formData.get("phone") ?? "").trim() || undefined,
    isBoardRep: formData.get("isBoardRep") === "true" || formData.get("isBoardRep") === "on",
    notes: String(formData.get("notes") ?? "").trim() || undefined,
  };

  const contact = id
    ? await db.peContact.update({ where: { id }, data })
    : await db.peContact.create({ data });

  await logAudit({
    userId: ctx.id,
    action: id ? "UPDATE" : "CREATE",
    resource: "PeContact",
    resourceId: contact.id,
    metadata: { companyId },
  });

  revalidatePeCompany(companyId);
  return contact;
}

export async function deletePeContact(id: string) {
  const ctx = await requireModuleAccess("PRIVATE_EQUITY");
  if (!canWrite(ctx, "PRIVATE_EQUITY")) throw new Error("You do not have permission.");

  const contact = await db.peContact.findFirst({
    where: { id, company: peCompanyEntityFilter(ctx) },
  });
  if (!contact) throw new Error("Contact not found.");

  await db.peContact.delete({ where: { id } });

  await logAudit({
    userId: ctx.id,
    action: "DELETE",
    resource: "PeContact",
    resourceId: id,
    metadata: { companyId: contact.companyId },
  });

  revalidatePeCompany(contact.companyId);
}

export async function upsertPeGovernance(formData: FormData) {
  const ctx = await requireModuleAccess("PRIVATE_EQUITY");
  if (!canWrite(ctx, "PRIVATE_EQUITY")) throw new Error("You do not have permission.");

  const companyId = String(formData.get("companyId") ?? "").trim();
  if (!companyId) throw new Error("Company is required.");

  await getPeCompanyOrThrow(ctx, companyId);

  const data = {
    boardSeat: formData.get("boardSeat") === "true" || formData.get("boardSeat") === "on",
    boardRepName: String(formData.get("boardRepName") ?? "").trim() || undefined,
    observerRights: formData.get("observerRights") === "true" || formData.get("observerRights") === "on",
    informationRights: formData.get("informationRights") === "true" || formData.get("informationRights") === "on",
    reportingFrequency: String(formData.get("reportingFrequency") ?? "").trim() || undefined,
    proRataRights: formData.get("proRataRights") === "true" || formData.get("proRataRights") === "on",
    dragAlong: formData.get("dragAlong") === "true" || formData.get("dragAlong") === "on",
    tagAlong: formData.get("tagAlong") === "true" || formData.get("tagAlong") === "on",
    antiDilution: String(formData.get("antiDilution") ?? "NONE") as PeAntiDilution,
    nextRoundTrigger: String(formData.get("nextRoundTrigger") ?? "").trim() || undefined,
  };

  const governance = await db.peGovernanceRights.upsert({
    where: { companyId },
    create: { companyId, ...data },
    update: data,
  });

  await logAudit({
    userId: ctx.id,
    action: "UPDATE",
    resource: "PeGovernanceRights",
    resourceId: governance.id,
    metadata: { companyId },
  });

  revalidatePeCompany(companyId);
  return governance;
}

async function uploadPeCompanyFiles(
  companyId: string,
  files: File[],
  documentType: PeDocumentType,
  uploadedById: string,
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
      "pe/" +
      companyId +
      "/" +
      documentType.toLowerCase() +
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

    await db.peCompanyDocument.create({
      data: {
        companyId,
        documentType,
        fileName: file.name,
        fileUrl: blob.url,
        mimeType: file.type || "application/octet-stream",
        fileSize: file.size,
        uploadedById,
      },
    });
  }
}

export async function uploadPeDocuments(formData: FormData) {
  const ctx = await requireModuleAccess("PRIVATE_EQUITY");
  if (!canWrite(ctx, "PRIVATE_EQUITY")) {
    throw new Error("You do not have permission to upload documents.");
  }

  const companyId = String(formData.get("companyId") ?? "").trim();
  const documentType = String(formData.get("documentType") ?? "") as PeDocumentType;
  if (!companyId) throw new Error("Company is required.");
  if (!documentType) throw new Error("Document type is required.");

  await getPeCompanyOrThrow(ctx, companyId);

  const files = getFilesFromFormData(formData, "files");
  if (files.length === 0) throw new Error("At least one file is required.");

  await uploadPeCompanyFiles(companyId, files, documentType, ctx.id);

  await logAudit({
    userId: ctx.id,
    action: "UPLOAD",
    resource: "PeCompanyDocument",
    resourceId: companyId,
    metadata: { documentType, count: files.length },
  });

  revalidatePeCompany(companyId);
}

export async function deletePeDocument(id: string) {
  const ctx = await requireModuleAccess("PRIVATE_EQUITY");
  if (!canWrite(ctx, "PRIVATE_EQUITY")) {
    throw new Error("You do not have permission to delete documents.");
  }

  const document = await db.peCompanyDocument.findFirst({
    where: { id, company: peCompanyEntityFilter(ctx) },
  });
  if (!document) throw new Error("Document not found.");

  await deleteBlobUrl(document.fileUrl);
  await db.peCompanyDocument.delete({ where: { id } });

  await logAudit({
    userId: ctx.id,
    action: "DELETE",
    resource: "PeCompanyDocument",
    resourceId: id,
    metadata: { companyId: document.companyId },
  });

  revalidatePeCompany(document.companyId);
}

export async function upsertPeMonitoringReport(formData: FormData) {
  const ctx = await requireModuleAccess("PRIVATE_EQUITY");
  if (!canWrite(ctx, "PRIVATE_EQUITY")) throw new Error("You do not have permission.");

  const companyId = String(formData.get("companyId") ?? "").trim();
  const id = String(formData.get("id") ?? "").trim();
  if (!companyId) throw new Error("Company is required.");

  const reportDate = parseDate(String(formData.get("reportDate") ?? ""));
  if (!reportDate) throw new Error("Report date is required.");

  await getPeCompanyOrThrow(ctx, companyId);

  const customKpisRaw = String(formData.get("customKpis") ?? "").trim();
  let customKpis: Prisma.InputJsonValue | undefined;
  if (customKpisRaw) {
    try {
      customKpis = JSON.parse(customKpisRaw) as Prisma.InputJsonValue;
    } catch {
      throw new Error("Custom KPIs must be valid JSON.");
    }
  }

  const data = {
    companyId,
    reportDate,
    reportType: String(formData.get("reportType") ?? "QUARTERLY") as PeReportType,
    revenueReporting: parseDecimal(String(formData.get("revenueReporting") ?? "")),
    burnRateReporting: parseDecimal(String(formData.get("burnRateReporting") ?? "")),
    runwayMonths: parseDecimal(String(formData.get("runwayMonths") ?? "")),
    customKpis: customKpis ?? undefined,
    notes: String(formData.get("notes") ?? "").trim() || undefined,
    documentId: (() => {
      const raw = String(formData.get("documentId") ?? "").trim();
      return raw && raw !== "none" ? raw : undefined;
    })(),
  };

  const report = id
    ? await db.peMonitoringReport.update({ where: { id }, data })
    : await db.peMonitoringReport.create({ data });

  await logAudit({
    userId: ctx.id,
    action: id ? "UPDATE" : "CREATE",
    resource: "PeMonitoringReport",
    resourceId: report.id,
    metadata: { companyId },
  });

  revalidatePeCompany(companyId);
  return report;
}

export async function deletePeMonitoringReport(id: string) {
  const ctx = await requireModuleAccess("PRIVATE_EQUITY");
  if (!canWrite(ctx, "PRIVATE_EQUITY")) throw new Error("You do not have permission.");

  const report = await db.peMonitoringReport.findFirst({
    where: { id, company: peCompanyEntityFilter(ctx) },
  });
  if (!report) throw new Error("Monitoring report not found.");

  await db.peMonitoringReport.delete({ where: { id } });

  await logAudit({
    userId: ctx.id,
    action: "DELETE",
    resource: "PeMonitoringReport",
    resourceId: id,
    metadata: { companyId: report.companyId },
  });

  revalidatePeCompany(report.companyId);
}
