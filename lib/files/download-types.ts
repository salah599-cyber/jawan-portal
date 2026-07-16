import type { FileKind } from "@/lib/files/href";

export const MIN_DOWNLOAD_REQUEST_REASON_LENGTH = 10;

export type FileDownloadRequestStatus = "PENDING" | "APPROVED" | "REJECTED" | "DOWNLOADED";

export type FileAccessContext = {
  isSuperAdmin: boolean;
  downloadRequestStatuses: Record<string, FileDownloadRequestStatus>;
};

export function fileRequestKey(kind: FileKind, fileId: string): string {
  return `${kind}:${fileId}`;
}

export function validateDownloadRequestReason(reason: string): string {
  const trimmed = reason.trim();
  if (trimmed.length < MIN_DOWNLOAD_REQUEST_REASON_LENGTH) {
    throw new Error(`Please provide a reason of at least ${MIN_DOWNLOAD_REQUEST_REASON_LENGTH} characters.`);
  }
  return trimmed;
}

export const FILE_KIND_LABELS: Record<FileKind, string> = {
  document: "Document Vault",
  land: "Land",
  "land-sale": "Land Sale",
  vehicle: "Vehicle",
  company: "Company",
  loan: "Loan",
  "loan-payment": "Loan Payment",
  cheque: "Cheque",
  expense: "Expense",
  "asset-exit": "Asset Exit",
  proposal: "Proposal",
  insurance: "Insurance",
  "pe-company": "PE / VC",
  "re-property": "Real Estate",
  "lp-fund": "Fund LP",
  "family-member": "Family Member",
  succession: "Succession",
};

export const FILE_DOWNLOAD_REQUEST_STATUS_LABELS: Record<FileDownloadRequestStatus, string> = {
  PENDING: "Pending approval",
  APPROVED: "Approved — download once",
  REJECTED: "Rejected",
  DOWNLOADED: "Downloaded",
};
