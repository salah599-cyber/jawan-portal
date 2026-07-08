"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { deleteBlobUrl } from "@/lib/blob";
import { logAudit } from "@/lib/audit/log";
import { resolveDocumentCategoryId } from "@/lib/data/document-categories";
import { canWrite, getModulePermission, requireModuleAccess } from "@/lib/permissions/access";
import { documentFilter } from "@/lib/permissions/scoped-queries";

export type SaveDocumentMetadataInput = {
  name: string;
  categoryId: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  fileSize: number;
  expiryDate?: string;
  entityId?: string;
};

export async function saveDocumentMetadata(input: SaveDocumentMetadataInput) {
  const ctx = await requireModuleAccess("DOCUMENTS");
  if (!canWrite(ctx, "DOCUMENTS")) {
    throw new Error("You do not have permission to upload documents.");
  }

  const name = input.name.trim();
  if (!name) throw new Error("Document name is required.");
  if (!input.categoryId) throw new Error("Category is required.");
  if (!input.fileUrl) throw new Error("File URL is required.");

  const category = await resolveDocumentCategoryId(input.categoryId);

  const level = getModulePermission(ctx, "DOCUMENTS");
  if (level === "FILTERED" && !ctx.documentCategories.includes(category.id)) {
    throw new Error("You do not have permission to upload documents in this category.");
  }

  const entityId = input.entityId?.trim() || undefined;
  if (
    entityId &&
    ctx.entityIds.length > 0 &&
    !ctx.entityIds.includes(entityId) &&
    ctx.role !== "PRINCIPAL" &&
    !ctx.isSuperAdmin
  ) {
    throw new Error("You do not have access to this entity.");
  }

  const document = await db.document.create({
    data: {
      name,
      fileName: input.fileName,
      fileUrl: input.fileUrl,
      mimeType: input.mimeType || "application/octet-stream",
      fileSize: input.fileSize,
      categoryId: category.id,
      expiryDate: input.expiryDate ? new Date(input.expiryDate) : undefined,
      entityId,
    },
  });

  try {
    await logAudit({
      userId: ctx.id,
      action: "CREATE",
      resource: "Document",
      resourceId: document.id,
      metadata: { name: document.name, categoryId: document.categoryId },
    });
  } catch {
    // Audit failure should not block a successful upload.
  }

  revalidatePath("/documents");
  return { id: document.id, name: document.name };
}

/**
 * Best-effort cleanup for a file that was uploaded to Blob storage but whose metadata
 * record failed to save (e.g. validation error). Only deletes blobs under the calling
 * user's own upload prefix so this cannot be used to delete arbitrary blobs.
 */
export async function cleanupFailedDocumentUpload(fileUrl: string) {
  const ctx = await requireModuleAccess("DOCUMENTS");
  if (!fileUrl.includes(`/documents/${ctx.id}/`)) return;
  await deleteBlobUrl(fileUrl);
}

export async function deleteDocument(id: string) {
  const ctx = await requireModuleAccess("DOCUMENTS");
  if (!canWrite(ctx, "DOCUMENTS")) {
    throw new Error("You do not have permission to delete documents.");
  }

  const document = await db.document.findFirst({
    where: { id, ...documentFilter(ctx) },
  });
  if (!document) throw new Error("Document not found.");

  await deleteBlobUrl(document.fileUrl);
  await db.document.delete({ where: { id } });

  await logAudit({
    userId: ctx.id,
    action: "DELETE",
    resource: "Document",
    resourceId: id,
    metadata: { name: document.name },
  });

  revalidatePath("/documents");
}

export type UpdateDocumentInput = {
  name: string;
  categoryId: string;
  expiryDate?: string;
  entityId?: string;
};

export async function updateDocument(id: string, input: UpdateDocumentInput) {
  const ctx = await requireModuleAccess("DOCUMENTS");
  if (!canWrite(ctx, "DOCUMENTS")) {
    throw new Error("You do not have permission to update documents.");
  }

  const document = await db.document.findFirst({
    where: { id, ...documentFilter(ctx) },
  });
  if (!document) throw new Error("Document not found.");

  const category = await resolveDocumentCategoryId(input.categoryId);

  const level = getModulePermission(ctx, "DOCUMENTS");
  if (level === "FILTERED" && !ctx.documentCategories.includes(category.id)) {
    throw new Error("You do not have permission to use this document category.");
  }

  const updated = await db.document.update({
    where: { id },
    data: {
      name: input.name.trim(),
      categoryId: category.id,
      expiryDate: input.expiryDate ? new Date(input.expiryDate) : null,
      entityId: input.entityId || null,
    },
  });

  await logAudit({
    userId: ctx.id,
    action: "UPDATE",
    resource: "Document",
    resourceId: id,
    metadata: { name: updated.name },
  });

  revalidatePath("/documents");
  revalidatePath("/documents/" + id + "/edit");
  return { id: updated.id, name: updated.name };
}
