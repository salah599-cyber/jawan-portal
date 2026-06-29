"use server";

import { put } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit/log";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { documentFilter } from "@/lib/permissions/scoped-queries";
import type { DocumentCategory } from "@/lib/generated/prisma/client";

export type CreateDocumentInput = {
  name: string;
  category: DocumentCategory;
  expiryDate?: string;
  entityId?: string;
};

export async function createDocument(formData: FormData) {
  const ctx = await requireModuleAccess("DOCUMENTS");
  if (!canWrite(ctx, "DOCUMENTS")) {
    throw new Error("You do not have permission to upload documents.");
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error(
      "BLOB_READ_WRITE_TOKEN is not configured. Document uploads require Vercel Blob storage.",
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("A file is required.");
  }

  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "") as DocumentCategory;
  const expiryDateRaw = String(formData.get("expiryDate") ?? "").trim();
  const entityIdRaw = String(formData.get("entityId") ?? "").trim();

  if (!name) throw new Error("Document name is required.");
  if (!category) throw new Error("Category is required.");

  const pathname = "documents/" + Date.now() + "-" + file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const blob = await put(pathname, file, {
    access: "public",
    token,
    contentType: file.type || undefined,
  });

  const document = await db.document.create({
    data: {
      name,
      fileName: file.name,
      fileUrl: blob.url,
      mimeType: file.type || "application/octet-stream",
      fileSize: file.size,
      category,
      expiryDate: expiryDateRaw ? new Date(expiryDateRaw) : undefined,
      entityId: entityIdRaw || undefined,
    },
  });

  await logAudit({
    userId: ctx.id,
    action: "CREATE",
    resource: "Document",
    resourceId: document.id,
    metadata: { name: document.name, category: document.category },
  });

  revalidatePath("/documents");
  return document;
}

export async function listDocuments() {
  const ctx = await requireModuleAccess("DOCUMENTS");
  return db.document.findMany({
    where: documentFilter(ctx),
    include: { entity: true },
    orderBy: { updatedAt: "desc" },
  });
}
