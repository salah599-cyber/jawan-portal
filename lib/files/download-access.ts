import "server-only";

import { db } from "@/lib/db";
import { ensureFileDownloadRequestSchema } from "@/lib/db/ensure-file-download-request-schema";
import { isSuperAdmin } from "@/lib/permissions/access";
import type { UserContext } from "@/lib/permissions/types";
import type { FileKind } from "@/lib/files/href";
import {
  fileRequestKey,
  type FileAccessContext,
  type FileDownloadRequestStatus,
  type FileRef,
} from "@/lib/files/download-types";

export type { FileRef };

export async function getLatestDownloadRequest(
  userId: string,
  kind: FileKind,
  fileId: string,
) {
  return db.fileDownloadRequest.findFirst({
    where: { requestedById: userId, kind, fileId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getActiveApprovedDownloadRequest(
  userId: string,
  kind: FileKind,
  fileId: string,
) {
  return db.fileDownloadRequest.findFirst({
    where: {
      requestedById: userId,
      kind,
      fileId,
      status: "APPROVED",
    },
    orderBy: { reviewedAt: "desc" },
  });
}

export async function getDownloadRequestStatusMap(
  userId: string,
  files: FileRef[],
): Promise<Record<string, FileDownloadRequestStatus>> {
  if (files.length === 0) return {};

  try {
    await ensureFileDownloadRequestSchema();
    const uniqueKeys = new Set(files.map((file) => fileRequestKey(file.kind, file.fileId)));
    const requests = await db.fileDownloadRequest.findMany({
      where: {
        requestedById: userId,
        OR: files.map((file) => ({ kind: file.kind, fileId: file.fileId })),
      },
      orderBy: { createdAt: "desc" },
      select: { kind: true, fileId: true, status: true },
    });

    const statuses: Record<string, FileDownloadRequestStatus> = {};
    for (const request of requests) {
      const key = fileRequestKey(request.kind as FileKind, request.fileId);
      if (!uniqueKeys.has(key) || statuses[key]) continue;
      statuses[key] = request.status as FileDownloadRequestStatus;
    }

    return statuses;
  } catch (error) {
    console.error("Failed to load download request statuses:", error);
    return {};
  }
}

export async function buildFileAccessContext(
  ctx: UserContext,
  files: FileRef[],
): Promise<FileAccessContext> {
  if (isSuperAdmin(ctx)) {
    return { isSuperAdmin: true, downloadRequestStatuses: {} };
  }

  const downloadRequestStatuses = await getDownloadRequestStatusMap(ctx.id, files);
  return { isSuperAdmin: false, downloadRequestStatuses };
}

export async function countPendingDownloadRequests(): Promise<number> {
  try {
    await ensureFileDownloadRequestSchema();
    return await db.fileDownloadRequest.count({ where: { status: "PENDING" } });
  } catch (error) {
    console.error("Failed to count pending download requests:", error);
    return 0;
  }
}

export async function listPendingDownloadRequests() {
  await ensureFileDownloadRequestSchema();
  return db.fileDownloadRequest.findMany({
    where: { status: "PENDING" },
    include: {
      requestedBy: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function listRecentDownloadRequests(limit = 50) {
  await ensureFileDownloadRequestSchema();
  return db.fileDownloadRequest.findMany({
    include: {
      requestedBy: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      reviewedBy: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
