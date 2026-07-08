export type FileKind =
  | "document"
  | "land"
  | "land-sale"
  | "vehicle"
  | "company"
  | "loan"
  | "loan-payment"
  | "cheque"
  | "expense"
  | "asset-exit"
  | "proposal";

/**
 * Builds the URL for the authenticated file download proxy. All stored documents are
 * private Vercel Blobs, so UI code must never link to `fileUrl` directly — it always
 * routes through this permission-checked endpoint instead.
 */
export function fileHref(kind: FileKind, id: string): string {
  return `/api/files/${kind}/${id}`;
}
