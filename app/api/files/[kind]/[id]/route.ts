import { NextResponse } from "next/server";
import { fetchPrivateBlob } from "@/lib/blob";
import { logAudit } from "@/lib/audit/log";
import { getActiveApprovedDownloadRequest } from "@/lib/files/download-access";
import type { FileKind } from "@/lib/files/href";
import { getCurrentUserContext, isSuperAdmin } from "@/lib/permissions/access";
import { resolveFileResource } from "@/lib/files/registry";
import { db } from "@/lib/db";

export const runtime = "nodejs";

function contentDisposition(fileName: string, download: boolean): string {
  const fallback = fileName.replace(/[^\x20-\x7e]/g, "_");
  const encoded = encodeURIComponent(fileName);
  const disposition = download ? "attachment" : "inline";
  return `${disposition}; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ kind: string; id: string }> },
) {
  const { kind, id } = await params;
  const downloadRequested = new URL(request.url).searchParams.get("download") === "1";

  const ctx = await getCurrentUserContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resource = await resolveFileResource(kind, id, ctx);
  if (!resource) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const superAdmin = isSuperAdmin(ctx);

  if (downloadRequested) {
    let grantId: string | null = null;
    if (!superAdmin) {
      const grant = await getActiveApprovedDownloadRequest(ctx.id, kind as FileKind, id);
      if (!grant) {
        return NextResponse.json({ error: "Download not authorized" }, { status: 403 });
      }
      grantId = grant.id;
    }

    const result = await fetchPrivateBlob(resource.fileUrl).catch(() => null);
    if (!result || result.statusCode !== 200 || !result.stream) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    if (grantId) {
      const consumed = await db.fileDownloadRequest.updateMany({
        where: {
          id: grantId,
          status: "APPROVED",
          requestedById: ctx.id,
        },
        data: {
          status: "DOWNLOADED",
          downloadedAt: new Date(),
        },
      });

      if (consumed.count === 0) {
        return NextResponse.json({ error: "Download not authorized" }, { status: 403 });
      }
    }

    logAudit({
      userId: ctx.id,
      action: "FILE_DOWNLOAD",
      resource: kind,
      resourceId: id,
      metadata: { fileName: resource.fileName },
    }).catch(() => {});

    return new NextResponse(result.stream, {
      status: 200,
      headers: {
        "Content-Type": resource.mimeType || "application/octet-stream",
        "Content-Disposition": contentDisposition(resource.fileName, true),
        "Cache-Control": "private, max-age=0, no-store",
      },
    });
  }

  if (!superAdmin) {
    return NextResponse.json({ error: "Preview not authorized" }, { status: 403 });
  }

  const result = await fetchPrivateBlob(resource.fileUrl).catch(() => null);
  if (!result || result.statusCode !== 200 || !result.stream) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  logAudit({
    userId: ctx.id,
    action: "FILE_VIEW",
    resource: kind,
    resourceId: id,
    metadata: { fileName: resource.fileName },
  }).catch(() => {});

  return new NextResponse(result.stream, {
    status: 200,
    headers: {
      "Content-Type": resource.mimeType || "application/octet-stream",
      "Content-Disposition": contentDisposition(resource.fileName, false),
      "Cache-Control": "private, max-age=0, no-store",
    },
  });
}
