import { db } from "@/lib/db";
import { accountLabel, matchBankAccount } from "@/lib/cash/statements/match-account";
import { parseBankStatementPdf } from "@/lib/cash/statements/parse-statement";
import type {
  ParsedBankStatement,
  StatementAccountCandidate,
  StatementParsePreview,
} from "@/lib/cash/statements/types";
import { cashPositionBankAccountFilter } from "@/lib/permissions/scoped-queries";
import type { UserContext } from "@/lib/permissions/types";

function serializeParsedForJson(parsed: ParsedBankStatement) {
  return {
    ...parsed,
    balanceDate: parsed.balanceDate?.toISOString() ?? null,
  };
}

function toPreview(
  importRow: {
    id: string;
    fileName: string;
    parserId: string | null;
    bankName: string | null;
    accountNumber: string | null;
    iban: string | null;
    currency: string | null;
    balance: { toString(): string } | null;
    balanceDate: Date | null;
    bankAccountId: string | null;
    warnings: unknown;
    status: string;
  },
  match: ReturnType<typeof matchBankAccount>,
  accountMap: Map<string, StatementAccountCandidate>,
  accountName?: string | null,
  error?: string,
): StatementParsePreview {
  const matched = match.accountId ? accountMap.get(match.accountId) : null;
  const warnings = Array.isArray(importRow.warnings)
    ? (importRow.warnings as string[])
    : [];

  return {
    importId: importRow.id,
    fileName: importRow.fileName,
    status: importRow.status === "FAILED" ? "failed" : "ok",
    parserId: importRow.parserId,
    bankName: importRow.bankName,
    accountName: accountName ?? null,
    accountNumber: importRow.accountNumber,
    iban: importRow.iban,
    currency: importRow.currency,
    balance: importRow.balance ? parseFloat(importRow.balance.toString()) : null,
    balanceDate: importRow.balanceDate?.toISOString().slice(0, 10) ?? null,
    matchedAccountId: match.accountId,
    matchedAccountLabel: matched ? accountLabel(matched) : match.accountName,
    matchConfidence: match.confidence,
    matchReason: match.reason,
    warnings,
    error,
  };
}

export async function listStatementAccountCandidates(
  ctx: UserContext,
): Promise<StatementAccountCandidate[]> {
  const accounts = await db.bankAccount.findMany({
    where: cashPositionBankAccountFilter(ctx),
    select: {
      id: true,
      accountName: true,
      bankName: true,
      accountNumber: true,
      iban: true,
      currency: true,
      entityId: true,
      accountNumbers: {
        orderBy: { sortOrder: "asc" },
        select: { accountNumber: true, currency: true },
      },
    },
    orderBy: [{ bankName: "asc" }, { accountName: "asc" }],
  });

  return accounts;
}

export async function parseCashStatementFiles(
  ctx: UserContext,
  files: { fileName: string; buffer: Buffer }[],
  options: { preferredAccountId?: string } = {},
): Promise<StatementParsePreview[]> {
  const accounts = await listStatementAccountCandidates(ctx);
  const accountMap = new Map(accounts.map((account) => [account.id, account]));
  const results: StatementParsePreview[] = [];

  for (const file of files) {
    if (!file.fileName.toLowerCase().endsWith(".pdf")) {
      const failed = await db.cashStatementImport.create({
        data: {
          fileName: file.fileName,
          uploadedBy: ctx.id,
          status: "FAILED",
          warnings: ["Only PDF bank statements are supported."],
        },
      });
      results.push(
        toPreview(
          failed,
          { accountId: null, accountName: null, confidence: "none", reason: null },
          accountMap,
          "Only PDF bank statements are supported.",
        ),
      );
      continue;
    }

    const parsed = await parseBankStatementPdf(file.buffer, file.fileName);
    const failedParse = parsed.warnings.some((warning) =>
      warning.toLowerCase().includes("pdf parsing failed"),
    );

    if (failedParse || (!parsed.balance && parsed.warnings.some((w) => w.includes("No readable text")))) {
      const failed = await db.cashStatementImport.create({
        data: {
          fileName: file.fileName,
          uploadedBy: ctx.id,
          parserId: parsed.parserId,
          extractedJson: serializeParsedForJson(parsed),
          bankName: parsed.bankName,
          accountNumber: parsed.accountNumber,
          iban: parsed.iban,
          currency: parsed.currency,
          balance: parsed.balance?.toFixed(3),
          balanceDate: parsed.balanceDate,
          warnings: parsed.warnings,
          status: "FAILED",
        },
      });
      results.push(
        toPreview(
          failed,
          { accountId: null, accountName: null, confidence: "none", reason: null },
          accountMap,
          parsed.warnings[0],
        ),
      );
      continue;
    }

    const match = matchBankAccount(parsed, accounts, options.preferredAccountId);
    const importRow = await db.cashStatementImport.create({
      data: {
        fileName: file.fileName,
        uploadedBy: ctx.id,
        bankAccountId: match.accountId,
        parserId: parsed.parserId,
        extractedJson: serializeParsedForJson(parsed),
        bankName: parsed.bankName,
        accountNumber: parsed.accountNumber,
        iban: parsed.iban,
        currency: parsed.currency,
        balance: parsed.balance?.toFixed(3),
        balanceDate: parsed.balanceDate,
        warnings: parsed.warnings,
        status: "PARSED",
      },
    });

    results.push(toPreview(importRow, match, accountMap, parsed.accountName));
  }

  return results;
}
