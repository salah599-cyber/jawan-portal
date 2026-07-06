import { NextResponse } from "next/server";
import { parseCashStatementFiles } from "@/lib/cash/statements/import-statement";
import { ensureCashManagementSchema } from "@/lib/db/ensure-cash-management-schema";
import { canWrite, getCurrentUserContext } from "@/lib/permissions/access";
import { MAX_UPLOAD_BYTES } from "@/lib/upload-limits";

export const maxDuration = 60;

function getFilesFromFormData(formData: FormData): File[] {
  return formData
    .getAll("files")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);
}

export async function POST(request: Request): Promise<NextResponse> {
  const ctx = await getCurrentUserContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canWrite(ctx, "CASH_MANAGEMENT")) {
    return NextResponse.json(
      { error: "You do not have permission to import bank statements." },
      { status: 403 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload request." }, { status: 400 });
  }

  const preferredAccountId = String(formData.get("bankAccountId") ?? "").trim() || undefined;
  const files = getFilesFromFormData(formData);

  if (files.length === 0) {
    return NextResponse.json(
      { error: "Select at least one bank statement PDF to upload." },
      { status: 400 },
    );
  }

  for (const file of files) {
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: `${file.name} exceeds the maximum upload size.` },
        { status: 413 },
      );
    }
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json(
        { error: `${file.name} is not a PDF. Only bank statement PDFs are supported.` },
        { status: 400 },
      );
    }
  }

  try {
    await ensureCashManagementSchema();

    const statementFiles = await Promise.all(
      files.map(async (file) => ({
        fileName: file.name,
        buffer: Buffer.from(await file.arrayBuffer()),
      })),
    );

    const results = await parseCashStatementFiles(ctx, statementFiles, { preferredAccountId });
    return NextResponse.json({ results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to parse bank statements.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
