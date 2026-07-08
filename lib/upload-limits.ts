/** Keep below next.config serverActions.bodySizeLimit (15mb) to allow multipart overhead. */
export const MAX_UPLOAD_BYTES = 14 * 1024 * 1024;

export const MAX_UPLOAD_LABEL = "14 MB";

/**
 * Allowlist of file extensions accepted for any document upload across the platform.
 * Keep in sync with ALLOWED_UPLOAD_MIME_TYPES and the `accept` attribute on upload forms.
 */
export const ALLOWED_UPLOAD_EXTENSIONS = [
  "pdf",
  "jpg",
  "jpeg",
  "png",
  "webp",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
] as const;

export const ALLOWED_UPLOAD_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
] as const;

export const ALLOWED_UPLOAD_ACCEPT = ALLOWED_UPLOAD_EXTENSIONS.map((ext) => "." + ext).join(",");

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function getExtension(fileName: string): string {
  const idx = fileName.lastIndexOf(".");
  if (idx === -1) return "";
  return fileName.slice(idx + 1).toLowerCase();
}

/**
 * Validates file size only. Prefer `validateUploadFile` for full client-side validation
 * (size + type); this is kept for call sites that only need a quick size check.
 */
export function validateUploadFileSize(file: File): string | null {
  if (file.size > MAX_UPLOAD_BYTES) {
    return `File is too large (${formatBytes(file.size)}). Maximum size is ${MAX_UPLOAD_LABEL}.`;
  }
  return null;
}

/**
 * Full client-side (best-effort) validation of size and file type.
 * The server MUST re-validate independently — see lib/blob.ts `assertValidUploadFile`.
 */
export function validateUploadFile(file: File): string | null {
  const sizeError = validateUploadFileSize(file);
  if (sizeError) return sizeError;

  const extension = getExtension(file.name);
  if (!extension || !(ALLOWED_UPLOAD_EXTENSIONS as readonly string[]).includes(extension)) {
    return `Unsupported file type. Allowed types: ${ALLOWED_UPLOAD_EXTENSIONS.join(", ").toUpperCase()}.`;
  }

  return null;
}
