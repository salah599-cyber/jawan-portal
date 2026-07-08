import { NextResponse } from "next/server";
import { fetchPrivateBlob } from "@/lib/blob";
import { logAudit } from "@/lib/audit/log";
import { getCurrentUserContext } from "@/lib/permissions/access";
import { resolveFileResource } from "@/lib/files/registry";

export const runtime = "nodejs";

function contentDisposition(fileName: string): string {
  const fallback = fileName.replace(/[^\x20-\x7e]/g, "_");
  const encoded = encodeURIComponent(fileName);
  return `inline; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ kind: string; id: string }> },
) {
  const { kind, id } = await params;

  const ctx = await getCurrentUserContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resource = await resolveFileResource(kind, id, ctx);
  if (!resource) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const result = await fetchPrivateBlob(resource.fileUrl).catch(() => null);
  if (!result || result.statusCode !== 200 || !result.stream) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  logAudit({
    userId: ctx.id,
    action: "DOWNLOAD",
    resource: kind,
    resourceId: id,
    metadata: { fileName: resource.fileName },
  }).catch(() => {
    // Audit failures must never block a successful, already-authorized download.
  });

  return new NextResponse(result.stream, {
    status: 200,
    headers: {
      "Content-Type": resource.mimeType || "application/octet-stream",
      "Content-Disposition": contentDisposition(resource.fileName),
      "Cache-Control": "private, max-age=0, no-store",
    },
  });
}
