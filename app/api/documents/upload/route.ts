import { NextResponse } from "next/server";
import { uploadPrivateFile } from "@/lib/blob";
import { canWrite, getCurrentUserContext } from "@/lib/permissions/access";

export async function POST(request: Request): Promise<NextResponse> {
  const ctx = await getCurrentUserContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canWrite(ctx, "DOCUMENTS")) {
    return NextResponse.json(
      { error: "You do not have permission to upload documents." },
      { status: 403 },
    );
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      {
        error:
          "BLOB_READ_WRITE_TOKEN is not configured. Add it in Vercel → Project → Settings → Environment Variables (Storage → Blob).",
      },
      { status: 503 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload request." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "A file is required." }, { status: 400 });
  }

  try {
    // Pathname is generated entirely server-side from trusted context (uploader id) —
    // any client-supplied path/name is ignored to prevent path traversal or collisions.
    const uploaded = await uploadPrivateFile(["documents", ctx.id], file);
    return NextResponse.json({
      url: uploaded.fileUrl,
      fileName: uploaded.fileName,
      mimeType: uploaded.mimeType,
      fileSize: uploaded.fileSize,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    const status = message.includes("too large") || message.includes("Unsupported") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
