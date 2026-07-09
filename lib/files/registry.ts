import { db } from "@/lib/db";
import { canAccess, getModulePermission } from "@/lib/permissions/access";
import {
  assetEntityFilter,
  carEntityFilter,
  chequeEntityFilter,
  companyEntityFilter,
  documentFilter,
  expenseEntityFilter,
  familyMemberFilter,
  insurancePolicyEntityFilter,
  landEntityFilter,
  loanEntityFilter,
  lpCommitmentEntityFilter,
  peCompanyEntityFilter,
  rePropertyEntityFilter,
  successionPlanFilter,
} from "@/lib/permissions/scoped-queries";
import { assertCanViewProposal } from "@/lib/proposals/access";
import type { UserContext } from "@/lib/permissions/types";
import type { FileKind } from "@/lib/files/href";

export type ResolvedFile = {
  fileUrl: string;
  fileName: string;
  mimeType: string;
};

/**
 * Resolves a downloadable file for `kind`/`id`, re-applying the same module and
 * entity/category scoping used by the corresponding server actions. Returns null
 * (surfaced as 404 by the caller) if the record doesn't exist or isn't accessible —
 * never distinguish "not found" from "forbidden" to avoid leaking existence.
 */
export async function resolveFileResource(
  kind: string,
  id: string,
  ctx: UserContext,
): Promise<ResolvedFile | null> {
  switch (kind as FileKind) {
    case "document": {
      if (!canAccess(ctx, "DOCUMENTS")) return null;
      return db.document.findFirst({
        where: { id, ...documentFilter(ctx) },
        select: { fileUrl: true, fileName: true, mimeType: true },
      });
    }
    case "land": {
      if (!canAccess(ctx, "LANDS")) return null;
      return db.landDocument.findFirst({
        where: { id, landParcel: landEntityFilter(ctx) },
        select: { fileUrl: true, fileName: true, mimeType: true },
      });
    }
    case "land-sale": {
      if (!canAccess(ctx, "LANDS")) return null;
      return db.landSaleDocument.findFirst({
        where: { id, landSale: { landParcel: landEntityFilter(ctx) } },
        select: { fileUrl: true, fileName: true, mimeType: true },
      });
    }
    case "vehicle": {
      if (!canAccess(ctx, "CARS")) return null;
      return db.vehicleDocument.findFirst({
        where: { id, vehicle: carEntityFilter(ctx) },
        select: { fileUrl: true, fileName: true, mimeType: true },
      });
    }
    case "company": {
      if (!canAccess(ctx, "COMPANIES")) return null;
      return db.companyDocument.findFirst({
        where: { id, company: companyEntityFilter(ctx) },
        select: { fileUrl: true, fileName: true, mimeType: true },
      });
    }
    case "loan": {
      if (!canAccess(ctx, "LOANS")) return null;
      return db.loanDocument.findFirst({
        where: { id, liability: loanEntityFilter(ctx) },
        select: { fileUrl: true, fileName: true, mimeType: true },
      });
    }
    case "loan-payment": {
      if (!canAccess(ctx, "LOANS")) return null;
      return db.loanPaymentDocument.findFirst({
        where: { id, payment: { liability: loanEntityFilter(ctx) } },
        select: { fileUrl: true, fileName: true, mimeType: true },
      });
    }
    case "cheque": {
      if (!canAccess(ctx, "CHEQUES")) return null;
      return db.chequeDocument.findFirst({
        where: { id, cheque: chequeEntityFilter(ctx) },
        select: { fileUrl: true, fileName: true, mimeType: true },
      });
    }
    case "expense": {
      if (!canAccess(ctx, "EXPENSES")) return null;
      return db.expenseAttachment.findFirst({
        where: { id, expense: expenseEntityFilter(ctx) },
        select: { fileUrl: true, fileName: true, mimeType: true },
      });
    }
    case "asset-exit": {
      if (!canAccess(ctx, "ASSETS")) return null;
      return db.assetExitDocument.findFirst({
        where: { id, assetExit: { asset: assetEntityFilter(ctx) } },
        select: { fileUrl: true, fileName: true, mimeType: true },
      });
    }
    case "proposal": {
      const doc = await db.proposalDocument.findFirst({
        where: { id },
        include: { proposal: { include: { approvers: true } } },
      });
      if (!doc) return null;
      try {
        assertCanViewProposal(ctx, doc.proposal);
      } catch {
        return null;
      }
      return { fileUrl: doc.fileUrl, fileName: doc.fileName, mimeType: doc.mimeType };
    }
    case "insurance": {
      if (!canAccess(ctx, "INSURANCE")) return null;
      return db.insurancePolicyDocument.findFirst({
        where: { id, policy: insurancePolicyEntityFilter(ctx) },
        select: { fileUrl: true, fileName: true, mimeType: true },
      });
    }
    case "pe-company": {
      if (!canAccess(ctx, "PRIVATE_EQUITY")) return null;
      return db.peCompanyDocument.findFirst({
        where: { id, company: peCompanyEntityFilter(ctx) },
        select: { fileUrl: true, fileName: true, mimeType: true },
      });
    }
    case "re-property": {
      if (!canAccess(ctx, "REAL_ESTATE")) return null;
      return db.rePropertyDocument.findFirst({
        where: { id, property: rePropertyEntityFilter(ctx) },
        select: { fileUrl: true, fileName: true, mimeType: true },
      });
    }
    case "lp-fund": {
      if (!canAccess(ctx, "FUND_LP")) return null;
      const doc = await db.lpFundDocument.findFirst({
        where: { id },
        select: {
          fileUrl: true,
          fileName: true,
          mimeType: true,
          commitmentId: true,
          fundId: true,
        },
      });
      if (!doc) return null;
      if (doc.commitmentId) {
        const commitment = await db.lpCommitment.findFirst({
          where: { id: doc.commitmentId, ...lpCommitmentEntityFilter(ctx) },
          select: { id: true },
        });
        if (!commitment) return null;
      } else if (doc.fundId) {
        const level = getModulePermission(ctx, "FUND_LP");
        if (level !== "FULL" && level !== "READ") return null;
      } else {
        return null;
      }
      return { fileUrl: doc.fileUrl, fileName: doc.fileName, mimeType: doc.mimeType };
    }
    case "family-member": {
      if (!canAccess(ctx, "FAMILY_MEMBERS")) return null;
      return db.familyMemberDocument.findFirst({
        where: { id, familyMember: familyMemberFilter(ctx) },
        select: { fileUrl: true, fileName: true, mimeType: true },
      });
    }
    case "succession": {
      if (!canAccess(ctx, "SUCCESSION")) return null;
      const doc = await db.successionPlanDocument.findFirst({
        where: { id, fileUrl: { not: null }, successionPlan: successionPlanFilter(ctx) },
        select: { fileUrl: true, fileName: true, mimeType: true },
      });
      if (!doc?.fileUrl) return null;
      return {
        fileUrl: doc.fileUrl,
        fileName: doc.fileName ?? "document",
        mimeType: doc.mimeType ?? "application/octet-stream",
      };
    }
    default:
      return null;
  }
}
