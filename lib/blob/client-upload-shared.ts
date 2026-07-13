/** Shared helpers for client→Blob uploads (safe for client and server imports). */

export const PROPOSAL_DECK_PENDING_PREFIX = "proposals/pending/";

export const BLOB_UPLOAD_HANDLE_URL = "/api/blob/upload";

export function sanitizeUploadFileName(name: string): string {
  const base = name.split(/[/\\]/).pop() || "file";
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, "_");
  return cleaned.slice(-150) || "file";
}

/** Rejects client-supplied URLs that are not private Blob uploads owned by this user. */
export function assertOwnedPendingProposalDeckUrl(url: string, userId: string) {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Invalid deck file.");
  }

  if (
    !parsed.hostname.endsWith(".private.blob.vercel-storage.com") &&
    !parsed.hostname.endsWith(".blob.vercel-storage.com")
  ) {
    throw new Error("Invalid deck file.");
  }

  const marker = `${PROPOSAL_DECK_PENDING_PREFIX}${userId}/`;
  const path = decodeURIComponent(parsed.pathname).replace(/^\/+/, "");
  if (!path.startsWith(marker)) {
    throw new Error("Invalid deck file.");
  }
}