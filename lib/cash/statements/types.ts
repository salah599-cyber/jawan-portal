export type StatementMatchConfidence = "high" | "medium" | "low" | "none";

export type ParsedBankStatement = {
  parserId: string;
  bankName: string | null;
  accountName: string | null;
  accountNumber: string | null;
  iban: string | null;
  currency: string | null;
  balance: number | null;
  balanceDate: Date | null;
  warnings: string[];
};

export type StatementAccountCandidate = {
  id: string;
  accountName: string;
  bankName: string;
  accountNumber: string;
  iban: string | null;
  currency: string;
  entityId: string | null;
};

export type StatementMatchResult = {
  accountId: string | null;
  accountName: string | null;
  confidence: StatementMatchConfidence;
  reason: string | null;
};

export type StatementParsePreview = {
  importId: string;
  fileName: string;
  status: "ok" | "failed";
  parserId: string | null;
  bankName: string | null;
  accountName: string | null;
  accountNumber: string | null;
  iban: string | null;
  currency: string | null;
  balance: number | null;
  balanceDate: string | null;
  matchedAccountId: string | null;
  matchedAccountLabel: string | null;
  matchConfidence: StatementMatchConfidence;
  matchReason: string | null;
  warnings: string[];
  error?: string;
};

export type StatementImportRow = {
  id: string;
  fileName: string;
  uploadedBy: string;
  bankAccountId: string | null;
  bankAccountLabel: string | null;
  parserId: string | null;
  balance: number | null;
  balanceDate: Date | null;
  currency: string | null;
  status: string;
  warnings: string[];
  createdAt: Date;
};
