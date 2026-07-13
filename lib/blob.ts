import { del, get, put } from "@vercel/blob";
import {
  ALLOWED_UPLOAD_EXTENSIONS,
  MAX_UPLOAD_BYTES,
  MAX_UPLOAD_LABEL,
} from "@/lib/upload-limits";

export type UploadedFile = {
  fileUrl: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
};

function getBlobToken(): string {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error(
      "BLOB_READ_WRITE_TOKEN is not configured. Document uploads require Vercel Blob storage.",
    );
  }
  return token;
}

/**
 * Strips any directory components and unsafe characters from a user-supplied file name.
 * Never derive storage paths from unsanitized client input beyond this.
 */
export function sanitizeFileName(name: string): string {
  const base = name.split(/[/\\]/).pop() || "file";
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, "_");
  return cleaned.slice(-150) || "file";
}

function getExtension(fileName: string): string {
  const idx = fileName.lastIndexOf(".");
  if (idx === -1) return "";
  return fileName.slice(idx + 1).toLowerCase();
}

/**
 * Validates a file against the platform-wide size and type allowlist.
 * Throws a user-facing error message on failure. Always call this server-side —
 * client-side validation is only a UX convenience and must not be trusted.
 */
export function assertValidUploadFile(file: File): void {
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("A file is required.");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error(`File is too large. Maximum size is ${MAX_UPLOAD_LABEL}.`);
  }
  const extension = getExtension(file.name);
  if (!extension || !(ALLOWED_UPLOAD_EXTENSIONS as readonly string[]).includes(extension)) {
    throw new Error(
      `Unsupported file type. Allowed types: ${ALLOWED_UPLOAD_EXTENSIONS.join(", ").toUpperCase()}.`,
    );
  }
}

/**
 * Builds a storage pathname entirely from server-trusted segments (module + record ids)
 * plus a sanitized, uniquified version of the original file name. Never accept a
 * client-supplied pathname — this prevents path traversal and cross-tenant path collisions.
 */
export function buildUploadPathname(segments: (string | number)[], originalName: string): string {
  const safeSegments = segments
    .map((segment) => String(segment).replace(/[^a-zA-Z0-9_-]/g, "_"))
    .filter(Boolean);
  const unique = Date.now().toString(36) + "-" + crypto.randomUUID().slice(0, 8);
  return [...safeSegments, unique + "-" + sanitizeFileName(originalName)].join("/");
}

const PRIVATE_STORE_REQUIRED_MESSAGE =
  "Document uploads require a private Vercel Blob store. The current store is public — create a private Blob store in the Vercel dashboard (Storage → Blob → Private) and update BLOB_READ_WRITE_TOKEN.";

function isPrivateBlobUrl(url: string): boolean {
  return url.includes(".private.blob.vercel-storage.com");
}

function mapBlobUploadError(error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error);
  if (/Cannot use private access on a public store/i.test(message)) {
    return new Error(PRIVATE_STORE_REQUIRED_MESSAGE);
  }
  if (/BLOB_READ_WRITE_TOKEN/i.test(message) || /not configured/i.test(message)) {
    return error instanceof Error ? error : new Error(message);
  }
  return error instanceof Error ? error : new Error(message);
}

/**
 * Uploads a file to private Vercel Blob storage after validating it. Private blobs are
 * never directly reachable by URL — they must be fetched server-side via `fetchPrivateBlob`
 * behind an authenticated, permission-checked route (see app/api/files/[kind]/[id]/route.ts).
 */
export async function uploadPrivateFile(
  segments: (string | number)[],
  file: File,
): Promise<UploadedFile> {
  assertValidUploadFile(file);
  const token = getBlobToken();
  const pathname = buildUploadPathname(segments, file.name);

  let blob;
  try {
    blob = await put(pathname, file, {
      access: "private",
      token,
      contentType: file.type || undefined,
      addRandomSuffix: false,
    });
  } catch (error) {
    throw mapBlobUploadError(error);
  }

  return {
    fileUrl: blob.url,
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
    fileSize: file.size,
  };
}

/**
 * Fetches a blob's content stream. Prefer private SDK access; fall back to a direct
 * fetch for legacy public-store URLs created before the private-blob migration.
 * Callers must have already authorized the request against the owning resource.
 */
export async function fetchPrivateBlob(url: string) {
  const token = getBlobToken();

  if (isPrivateBlobUrl(url)) {
    return get(url, { access: "private", token });
  }

  try {
    return await get(url, { access: "private", token });
  } catch {
    // Legacy public blobs remain reachable without auth.
    const response = await fetch(url);
    if (!response.ok || !response.body) {
      return {
        statusCode: response.status,
        stream: null,
      };
    }
    return {
      statusCode: response.status,
      stream: response.body,
    };
  }
}

export async function deleteBlobUrl(url: string) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return;

  try {
    await del(url, { token });
  } catch {
    // Blob may already be removed; continue with DB delete.
  }
}
