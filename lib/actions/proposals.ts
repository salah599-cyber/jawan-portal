"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { deleteBlobUrl, uploadPrivateFile } from "@/lib/blob";
import { assertOwnedPendingProposalDeckUrl } from "@/lib/blob/client-upload-shared";
import { logAudit } from "@/lib/audit/log";
import { canWrite, getModulePermission, requireModuleAccess, requireUserContext } from "@/lib/permissions/access";
import { proposalEntityFilter } from "@/lib/permissions/scoped-queries";
import { assertCanViewProposal } from "@/lib/proposals/access";
import { evaluateMajorityOutcome } from "@/lib/proposals/approval";
import { canSubmitProposal } from "@/lib/proposals/submit-access";
import type { ProposalCommentKind, ProposalDecision, ProposalStatus } from "@/lib/generated/prisma/client";

type ClientUploadedDeck = {
  fileUrl: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
};

function parseDecimal(value?: string | null) {
  if (!value || value.trim() === "") return undefined;
  return value.trim();
}

function getFilesFromFormData(formData: FormData, field: string): File[] {
  return formData
    .getAll(field)
    .filter((item): item is File => item instanceof File && item.size > 0);
}

function parseApproverIds(formData: FormData) {
  return [...new Set(formData.getAll("approverIds").map((v) => String(v).trim()).filter(Boolean))];
}

function normalizeWebsiteUrl(value?: string | null) {
  const raw = value?.trim();
  if (!raw) return undefined;
  if (/^https?:\/\//i.test(raw)) return raw;
  return "https://" + raw;
}

function readProposalFields(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const suggestedAmount = parseDecimal(String(formData.get("suggestedAmount") ?? ""));
  const brief = String(formData.get("brief") ?? "").trim();
  const recommendation = String(formData.get("recommendation") ?? "").trim();
  const entityIdRaw = String(formData.get("entityId") ?? "").trim();
  const entityId = entityIdRaw && entityIdRaw !== "none" ? entityIdRaw : undefined;

  if (!name) throw new Error("Investment name is required.");
  if (!suggestedAmount) throw new Error("Suggested amount is required.");
  if (!brief) throw new Error("Brief is required.");
  if (!recommendation) throw new Error("Recommendation is required.");

  return {
    name,
    suggestedAmount,
    currency: String(formData.get("currency") ?? "OMR").trim() || "OMR",
    brief,
    recommendation,
    websiteUrl: normalizeWebsiteUrl(String(formData.get("websiteUrl") ?? "")),
    entityId,
  };
}

async function syncApprovers(proposalId: string, approverIds: string[], submitterId: string) {
  const uniqueIds = [...new Set(approverIds.filter((id) => id && id !== submitterId))];
  if (uniqueIds.length === 0) throw new Error("Select at least one approver (excluding yourself).");

  const users = await db.user.findMany({
    where: { id: { in: uniqueIds }, isActive: true },
    select: { id: true },
  });
  if (users.length !== uniqueIds.length) {
    throw new Error("One or more selected approvers are invalid.");
  }

  await db.proposalApprover.deleteMany({ where: { proposalId } });
  await db.proposalApprover.createMany({
    data: uniqueIds.map((userId) => ({ proposalId, userId })),
  });

  return uniqueIds.length;
}

function readClientUploadedDeck(formData: FormData): ClientUploadedDeck | null {
  const fileUrl = String(formData.get("deckFileUrl") ?? "").trim();
  if (!fileUrl) return null;

  const fileName = String(formData.get("deckFileName") ?? "").trim();
  const mimeType = String(formData.get("deckMimeType") ?? "").trim() || "application/octet-stream";
  const fileSize = Number.parseInt(String(formData.get("deckFileSize") ?? ""), 10);

  if (!fileName || !Number.isFinite(fileSize) || fileSize <= 0) {
    throw new Error("Invalid deck upload metadata.");
  }

  return { fileUrl, fileName, mimeType, fileSize };
}

async function clearExistingDecks(proposalId: string) {
  const existing = await db.proposalDocument.findMany({
    where: { proposalId, documentType: "DECK" },
  });
  for (const doc of existing) {
    await deleteBlobUrl(doc.fileUrl);
  }
  await db.proposalDocument.deleteMany({ where: { proposalId, documentType: "DECK" } });
}

async function attachClientUploadedDeck(
  proposalId: string,
  deck: ClientUploadedDeck,
  uploadedById: string,
  replaceExisting = false,
) {
  assertOwnedPendingProposalDeckUrl(deck.fileUrl, uploadedById);
  if (replaceExisting) await clearExistingDecks(proposalId);

  try {
    await db.proposalDocument.create({
      data: {
        proposalId,
        documentType: "DECK",
        fileName: deck.fileName,
        fileUrl: deck.fileUrl,
        mimeType: deck.mimeType,
        fileSize: deck.fileSize,
        uploadedById,
      },
    });
  } catch (error) {
    await deleteBlobUrl(deck.fileUrl);
    throw error;
  }
}

async function uploadDeckFiles(
  proposalId: string,
  files: File[],
  uploadedById: string,
  replaceExisting = false,
) {
  if (replaceExisting) await clearExistingDecks(proposalId);

  for (const file of files) {
    const uploaded = await uploadPrivateFile(["proposals", proposalId, "deck"], file);
    try {
      await db.proposalDocument.create({
        data: {
          proposalId,
          documentType: "DECK",
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

async function assertDeckPresent(proposalId: string) {
  const deckCount = await db.proposalDocument.count({
    where: { proposalId, documentType: "DECK" },
  });
  if (deckCount === 0) throw new Error("An investment deck is required before submitting.");
}

async function addComment(
  proposalId: string,
  authorId: string,
  body: string,
  kind: ProposalCommentKind,
) {
  await db.proposalComment.create({
    data: { proposalId, authorId, body, kind },
  });
}

export async function listActiveUsersForProposals() {
  await requireModuleAccess("PROPOSALS");
  return db.user.findMany({
    where: { isActive: true },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
    },
    orderBy: [{ firstName: "asc" }, { email: "asc" }],
  });
}

export async function listProposals(filter: "all" | "mine" | "pending-approval" | "approved" | "rejected" = "all") {
  const ctx = await requireModuleAccess("PROPOSALS");
  const baseWhere = proposalEntityFilter(ctx);

  if (filter === "mine") {
    return db.investmentProposal.findMany({
      where: { ...baseWhere, submittedById: ctx.id },
      include: {
        entity: true,
        submittedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        approvers: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } } },
        documents: { where: { documentType: "DECK" }, take: 1 },
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  if (filter === "pending-approval") {
    return db.investmentProposal.findMany({
      where: {
        ...baseWhere,
        status: "PENDING",
        approvers: { some: { userId: ctx.id, decision: null } },
      },
      include: {
        entity: true,
        submittedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        approvers: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } } },
        documents: { where: { documentType: "DECK" }, take: 1 },
      },
      orderBy: { submittedAt: "desc" },
    });
  }

  const statusFilter =
    filter === "approved"
      ? { status: "APPROVED" as ProposalStatus }
      : filter === "rejected"
        ? { status: "REJECTED" as ProposalStatus }
        : {};

  const proposals = await db.investmentProposal.findMany({
    where: { ...baseWhere, ...statusFilter },
    include: {
      entity: true,
      submittedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      approvers: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } } },
      documents: { where: { documentType: "DECK" }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
  });

  return proposals.filter((proposal) => {
    if (proposal.submittedById === ctx.id) return true;
    if (proposal.approvers.some((a) => a.userId === ctx.id)) return true;
    if (getModulePermission(ctx, "PROPOSALS") === "FULL" || getModulePermission(ctx, "PROPOSALS") === "READ") {
      return true;
    }
    return false;
  });
}

export async function getProposal(id: string) {
  const ctx = await requireModuleAccess("PROPOSALS");
  const proposal = await db.investmentProposal.findFirst({
    where: { id, ...proposalEntityFilter(ctx) },
    include: {
      entity: true,
      submittedBy: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
      approvers: {
        include: { user: { select: { id: true, firstName: true, lastName: true, email: true, role: true } } },
        orderBy: { createdAt: "asc" },
      },
      documents: { orderBy: { createdAt: "desc" } },
      comments: {
        include: { author: { select: { id: true, firstName: true, lastName: true, email: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!proposal) return null;

  await assertCanViewProposal(ctx, proposal);
  return proposal;
}

export async function createProposal(formData: FormData) {
  const ctx = await requireUserContext();
  if (!canSubmitProposal(ctx)) {
    throw new Error("Only Principal and Director roles can create investment proposals.");
  }

  const fields = readProposalFields(formData);
  const submitNow = String(formData.get("submitNow") ?? "") === "true";
  const approverIds = parseApproverIds(formData);
  const clientDeck = readClientUploadedDeck(formData);
  const deckFiles = getFilesFromFormData(formData, "deckFiles");

  if (submitNow && approverIds.length === 0) {
    throw new Error("Select at least one approver before submitting.");
  }
  if (submitNow && !clientDeck && deckFiles.length === 0) {
    throw new Error("An investment deck is required before submitting.");
  }

  const proposal = await db.investmentProposal.create({
    data: {
      ...fields,
      status: submitNow ? "PENDING" : "DRAFT",
      submittedById: ctx.id,
      submittedAt: submitNow ? new Date() : undefined,
    },
  });

  if (approverIds.length > 0) {
    await syncApprovers(proposal.id, approverIds, ctx.id);
  }

  if (clientDeck) {
    await attachClientUploadedDeck(proposal.id, clientDeck, ctx.id);
  } else if (deckFiles.length > 0) {
    await uploadDeckFiles(proposal.id, deckFiles, ctx.id);
  }

  if (submitNow) {
    await assertDeckPresent(proposal.id);
    await addComment(
      proposal.id,
      ctx.id,
      "Submitted for approval.",
      "RESUBMIT",
    );
  }

  await logAudit({
    userId: ctx.id,
    action: "CREATE",
    resource: "InvestmentProposal",
    resourceId: proposal.id,
    metadata: { name: proposal.name, status: proposal.status },
  });

  revalidatePath("/proposals");
  revalidatePath("/dashboard");
  return { id: proposal.id };
}

export async function updateProposal(id: string, formData: FormData) {
  const ctx = await requireUserContext();
  if (!canSubmitProposal(ctx)) {
    throw new Error("Only Principal and Director roles can edit investment proposals.");
  }

  const proposal = await db.investmentProposal.findUnique({ where: { id } });
  if (!proposal) throw new Error("Proposal not found.");
  if (proposal.submittedById !== ctx.id && !ctx.isSuperAdmin) {
    throw new Error("You can only edit your own proposals.");
  }
  if (proposal.status !== "DRAFT" && proposal.status !== "RETURNED") {
    throw new Error("Only draft or returned proposals can be edited.");
  }

  const fields = readProposalFields(formData);
  const submitNow = String(formData.get("submitNow") ?? "") === "true";
  const approverIds = parseApproverIds(formData);
  const clientDeck = readClientUploadedDeck(formData);
  const deckFiles = getFilesFromFormData(formData, "deckFiles");

  const updated = await db.investmentProposal.update({
    where: { id },
    data: {
      ...fields,
      status: submitNow ? "PENDING" : proposal.status === "RETURNED" && !submitNow ? "RETURNED" : "DRAFT",
      submittedAt: submitNow ? new Date() : proposal.submittedAt,
      decidedAt: submitNow ? null : proposal.decidedAt,
    },
  });

  if (approverIds.length > 0) {
    await syncApprovers(id, approverIds, ctx.id);
  }

  if (clientDeck) {
    await attachClientUploadedDeck(id, clientDeck, ctx.id, true);
  } else if (deckFiles.length > 0) {
    await uploadDeckFiles(id, deckFiles, ctx.id, true);
  }

  if (submitNow) {
    if (approverIds.length === 0) {
      const count = await db.proposalApprover.count({ where: { proposalId: id } });
      if (count === 0) throw new Error("Select at least one approver before submitting.");
    }
    await assertDeckPresent(id);
    await db.proposalApprover.updateMany({
      where: { proposalId: id },
      data: { decision: null, comment: null, decidedAt: null },
    });
    await addComment(id, ctx.id, "Resubmitted for approval.", "RESUBMIT");
  }

  await logAudit({
    userId: ctx.id,
    action: "UPDATE",
    resource: "InvestmentProposal",
    resourceId: id,
    metadata: { name: updated.name, status: updated.status },
  });

  revalidatePath("/proposals");
  revalidatePath("/proposals/" + id);
  revalidatePath("/dashboard");
  return updated;
}

export async function recordApproverDecision(formData: FormData) {
  const ctx = await requireUserContext();
  await requireModuleAccess("PROPOSALS");

  const proposalId = String(formData.get("proposalId") ?? "").trim();
  const decision = String(formData.get("decision") ?? "").trim() as ProposalDecision;
  const comment = String(formData.get("comment") ?? "").trim();

  if (!proposalId) throw new Error("Proposal is required.");
  if (!["APPROVED", "REJECTED", "RETURNED"].includes(decision)) {
    throw new Error("Invalid decision.");
  }
  if ((decision === "REJECTED" || decision === "RETURNED") && !comment) {
    throw new Error("A comment is required when rejecting or returning a proposal.");
  }

  const approver = await db.proposalApprover.findFirst({
    where: { proposalId, userId: ctx.id },
    include: { proposal: { include: { approvers: true } } },
  });
  if (!approver) throw new Error("You are not an approver on this proposal.");
  if (approver.proposal.status !== "PENDING") {
    throw new Error("This proposal is not awaiting approval.");
  }
  if (approver.decision) throw new Error("You have already recorded a decision.");

  await db.proposalApprover.update({
    where: { id: approver.id },
    data: { decision, comment: comment || null, decidedAt: new Date() },
  });

  const commentKind: ProposalCommentKind =
    decision === "APPROVED" ? "APPROVE" : decision === "REJECTED" ? "REJECT" : "RETURN";
  await addComment(
    proposalId,
    ctx.id,
    comment || PROPOSAL_DECISION_COMMENT[decision],
    commentKind,
  );

  let nextStatus: ProposalStatus = "PENDING";

  if (decision === "RETURNED") {
    nextStatus = "RETURNED";
  } else {
    const refreshed = await db.proposalApprover.findMany({ where: { proposalId } });
    const outcome = evaluateMajorityOutcome(refreshed);
    if (outcome === "APPROVED") nextStatus = "APPROVED";
    else if (outcome === "REJECTED") nextStatus = "REJECTED";
  }

  if (nextStatus !== "PENDING") {
    await db.investmentProposal.update({
      where: { id: proposalId },
      data: { status: nextStatus, decidedAt: new Date() },
    });
  }

  await logAudit({
    userId: ctx.id,
    action: "UPDATE",
    resource: "InvestmentProposal",
    resourceId: proposalId,
    metadata: { decision, nextStatus },
  });

  revalidatePath("/proposals");
  revalidatePath("/proposals/" + proposalId);
  revalidatePath("/dashboard");
}

const PROPOSAL_DECISION_COMMENT: Record<ProposalDecision, string> = {
  APPROVED: "Approved the proposal.",
  REJECTED: "Rejected the proposal.",
  RETURNED: "Returned the proposal for revision.",
};

export async function addProposalComment(proposalId: string, body: string) {
  const ctx = await requireUserContext();
  await requireModuleAccess("PROPOSALS");

  const trimmed = body.trim();
  if (!trimmed) throw new Error("Comment cannot be empty.");

  const proposal = await getProposal(proposalId);
  if (!proposal) throw new Error("Proposal not found.");

  const canComment =
    proposal.submittedById === ctx.id ||
    proposal.approvers.some((a) => a.userId === ctx.id) ||
    canWrite(ctx, "PROPOSALS");

  if (!canComment) throw new Error("You cannot comment on this proposal.");

  await addComment(proposalId, ctx.id, trimmed, "NOTE");

  revalidatePath("/proposals/" + proposalId);
}

export async function deleteProposal(id: string) {
  const ctx = await requireUserContext();
  if (!canSubmitProposal(ctx)) {
    throw new Error("You do not have permission to delete proposals.");
  }

  const proposal = await db.investmentProposal.findUnique({
    where: { id },
    include: { documents: true },
  });
  if (!proposal) throw new Error("Proposal not found.");
  if (proposal.status !== "DRAFT") throw new Error("Only draft proposals can be deleted.");
  if (proposal.submittedById !== ctx.id && !ctx.isSuperAdmin) {
    throw new Error("You can only delete your own draft proposals.");
  }

  for (const doc of proposal.documents) {
    await deleteBlobUrl(doc.fileUrl);
  }

  await db.investmentProposal.delete({ where: { id } });

  await logAudit({
    userId: ctx.id,
    action: "DELETE",
    resource: "InvestmentProposal",
    resourceId: id,
    metadata: { name: proposal.name },
  });

  revalidatePath("/proposals");
  revalidatePath("/dashboard");
}

export async function listPendingApprovalsForUser(limit = 5) {
  const ctx = await requireModuleAccess("PROPOSALS");
  return db.investmentProposal.findMany({
    where: {
      ...proposalEntityFilter(ctx),
      status: "PENDING",
      approvers: { some: { userId: ctx.id, decision: null } },
    },
    include: {
      submittedBy: { select: { firstName: true, lastName: true, email: true } },
      approvers: { select: { decision: true } },
    },
    orderBy: { submittedAt: "desc" },
    take: limit,
  });
}

