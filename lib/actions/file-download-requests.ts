"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit/log";
import { ensureFileDownloadRequestSchema } from "@/lib/db/ensure-file-download-request-schema";
import { getLatestDownloadRequest } from "@/lib/files/download-access";
import { validateDownloadRequestReason } from "@/lib/files/download-types";
import type { FileKind } from "@/lib/files/href";
import { resolveFileResource } from "@/lib/files/registry";
import { getCurrentUserContext, isSuperAdmin, requireSuperAdmin, requireUserContext } from "@/lib/permissions/access";

const ADMIN_PATH = "/admin/download-requests";

function revalidateDownloadRequestPaths() {
  revalidatePath(ADMIN_PATH);
  revalidatePath("/documents");
  revalidatePath("/lands", "layout");
  revalidatePath("/cars", "layout");
  revalidatePath("/companies", "layout");
  revalidatePath("/loans", "layout");
  revalidatePath("/cheques", "layout");
  revalidatePath("/expenses", "layout");
  revalidatePath("/proposals", "layout");
  revalidatePath("/real-estate", "layout");
  revalidatePath("/portfolio", "layout");
  revalidatePath("/family", "layout");
}

export async function createFileDownloadRequest(input: {
  kind: FileKind;
  fileId: string;
  reason: string;
}) {
  const ctx = await requireUserContext();
  if (isSuperAdmin(ctx)) {
    throw new Error("Super admins can download files directly.");
  }

  const reason = validateDownloadRequestReason(input.reason);
  await ensureFileDownloadRequestSchema();
  const resource = await resolveFileResource(input.kind, input.fileId, ctx);
  if (!resource) {
    throw new Error("File not found.");
  }

  const latest = await getLatestDownloadRequest(ctx.id, input.kind, input.fileId);
  if (latest?.status === "PENDING") {
    throw new Error("A download request for this file is already pending approval.");
  }
  if (latest?.status === "APPROVED") {
    throw new Error("This file is already approved for download.");
  }

  const request = await db.fileDownloadRequest.create({
    data: {
      kind: input.kind,
      fileId: input.fileId,
      fileName: resource.fileName,
      reason,
      requestedById: ctx.id,
    },
  });

  await logAudit({
    userId: ctx.id,
    action: "DOWNLOAD_REQUEST_CREATED",
    resource: input.kind,
    resourceId: input.fileId,
    metadata: { requestId: request.id, fileName: resource.fileName },
  }).catch(() => {});

  revalidateDownloadRequestPaths();
  return { id: request.id };
}

export async function decideFileDownloadRequest(input: {
  requestId: string;
  decision: "APPROVED" | "REJECTED";
  reviewComment?: string;
}) {
  const ctx = await requireSuperAdmin();
  const reviewComment = input.reviewComment?.trim() || undefined;

  const existing = await db.fileDownloadRequest.findUnique({
    where: { id: input.requestId },
  });

  if (!existing || existing.status !== "PENDING") {
    throw new Error("This download request is no longer pending.");
  }

  await db.fileDownloadRequest.update({
    where: { id: input.requestId },
    data: {
      status: input.decision,
      reviewedById: ctx.id,
      reviewedAt: new Date(),
      reviewComment,
    },
  });

  await logAudit({
    userId: ctx.id,
    action:
      input.decision === "APPROVED"
        ? "DOWNLOAD_REQUEST_APPROVED"
        : "DOWNLOAD_REQUEST_REJECTED",
    resource: existing.kind,
    resourceId: existing.fileId,
    metadata: {
      requestId: existing.id,
      fileName: existing.fileName,
      requestedById: existing.requestedById,
      reviewComment,
    },
  }).catch(() => {});

  revalidateDownloadRequestPaths();
}

export async function getFileAccessForUser(files: Array<{ kind: FileKind; fileId: string }>) {
  const ctx = await getCurrentUserContext();
  if (!ctx) {
    return { isSuperAdmin: false, downloadRequestStatuses: {} };
  }

  const { buildFileAccessContext } = await import("@/lib/files/download-access");
  return buildFileAccessContext(ctx, files);
}
