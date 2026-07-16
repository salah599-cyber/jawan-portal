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
  | "proposal"
  | "insurance"
  | "pe-company"
  | "re-property"
  | "lp-fund"
  | "family-member"
  | "succession";

export type FileHrefOptions = {
  download?: boolean;
};

/**
 * Builds the URL for the authenticated file proxy. All stored documents are
 * private Vercel Blobs, so UI code must never link to `fileUrl` directly — it always
 * routes through this permission-checked endpoint instead.
 */
export function fileHref(kind: FileKind, id: string, options?: FileHrefOptions): string {
  const base = `/api/files/${kind}/${id}`;
  if (options?.download) {
    return `${base}?download=1`;
  }
  return base;
}
