"use client";

import { upload } from "@vercel/blob/client";
import {
  BLOB_UPLOAD_HANDLE_URL,
  PROPOSAL_DECK_PENDING_PREFIX,
  sanitizeUploadFileName,
} from "@/lib/blob/client-upload-shared";
import { validateUploadFile } from "@/lib/upload-limits";

export type ClientUploadedFile = {
  fileUrl: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
};

function buildPendingProposalDeckPath(userId: string, fileName: string) {
  const unique = Date.now().toString(36) + "-" + crypto.randomUUID().slice(0, 8);
  return `${PROPOSAL_DECK_PENDING_PREFIX}${userId}/${unique}-${sanitizeUploadFileName(fileName)}`;
}

/**
 * Uploads a proposal deck directly from the browser to private Vercel Blob.
 * Bypasses the 4.5 MB serverless request body limit that breaks Server Actions
 * when large PPTX/PDF decks are posted through FormData.
 */
export async function uploadProposalDeckClient(
  file: File,
  userId: string,
): Promise<ClientUploadedFile> {
  const validationError = validateUploadFile(file);
  if (validationError) throw new Error(validationError);

  const pathname = buildPendingProposalDeckPath(userId, file.name);
  const blob = await upload(pathname, file, {
    access: "private",
    handleUploadUrl: BLOB_UPLOAD_HANDLE_URL,
    multipart: true,
    contentType: file.type || undefined,
    clientPayload: JSON.stringify({ purpose: "proposal-deck" }),
  });

  return {
    fileUrl: blob.url,
    fileName: file.name,
    mimeType: blob.contentType || file.type || "application/octet-stream",
    fileSize: file.size,
  };
}
