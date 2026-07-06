import type {
  ParsedBankStatement,
  StatementAccountCandidate,
  StatementMatchConfidence,
  StatementMatchResult,
} from "@/lib/cash/statements/types";

function normalizeToken(value: string | null | undefined) {
  return value?.replace(/\s+/g, "").toUpperCase() ?? "";
}

function lastDigits(value: string, count = 4) {
  const digits = value.replace(/\D/g, "");
  return digits.slice(-count);
}

export function matchBankAccount(
  parsed: ParsedBankStatement,
  accounts: StatementAccountCandidate[],
  preferredAccountId?: string,
): StatementMatchResult {
  if (preferredAccountId) {
    const preferred = accounts.find((account) => account.id === preferredAccountId);
    if (!preferred) {
      return {
        accountId: null,
        accountName: null,
        confidence: "none",
        reason: "Selected account not found.",
      };
    }

    const parsedIban = normalizeToken(parsed.iban);
    const parsedAccount = normalizeToken(parsed.accountNumber);
    const preferredIban = normalizeToken(preferred.iban);
    const preferredAccount = normalizeToken(preferred.accountNumber);

    if (parsedIban && preferredIban && parsedIban === preferredIban) {
      return {
        accountId: preferred.id,
        accountName: preferred.accountName,
        confidence: "high",
        reason: "IBAN matches selected account.",
      };
    }

    if (
      parsedAccount &&
      preferredAccount &&
      (parsedAccount === preferredAccount ||
        lastDigits(parsedAccount) === lastDigits(preferredAccount))
    ) {
      return {
        accountId: preferred.id,
        accountName: preferred.accountName,
        confidence: parsedAccount === preferredAccount ? "high" : "medium",
        reason: "Account number matches selected account.",
      };
    }

    return {
      accountId: preferred.id,
      accountName: preferred.accountName,
      confidence: "low",
      reason: "Using selected account — verify extracted details before applying.",
    };
  }

  const parsedIban = normalizeToken(parsed.iban);
  if (parsedIban) {
    const ibanMatch = accounts.find((account) => normalizeToken(account.iban) === parsedIban);
    if (ibanMatch) {
      return {
        accountId: ibanMatch.id,
        accountName: ibanMatch.accountName,
        confidence: "high",
        reason: "Matched by IBAN.",
      };
    }
  }

  const parsedAccount = normalizeToken(parsed.accountNumber);
  if (parsedAccount) {
    const exact = accounts.find(
      (account) => normalizeToken(account.accountNumber) === parsedAccount,
    );
    if (exact) {
      return {
        accountId: exact.id,
        accountName: exact.accountName,
        confidence: "high",
        reason: "Matched by account number.",
      };
    }

    const suffix = lastDigits(parsedAccount);
    if (suffix.length >= 4) {
      const suffixMatches = accounts.filter(
        (account) => lastDigits(account.accountNumber) === suffix,
      );
      if (suffixMatches.length === 1) {
        const match = suffixMatches[0]!;
        const bankMatches =
          !parsed.bankName ||
          match.bankName.toLowerCase().includes(parsed.bankName.toLowerCase()) ||
          parsed.bankName.toLowerCase().includes(match.bankName.toLowerCase());
        return {
          accountId: match.id,
          accountName: match.accountName,
          confidence: bankMatches ? "medium" : "low",
          reason: bankMatches
            ? "Matched by account suffix and bank name."
            : "Matched by account suffix only.",
        };
      }
    }
  }

  return {
    accountId: null,
    accountName: null,
    confidence: "none",
    reason: null,
  };
}

export function accountLabel(account: StatementAccountCandidate) {
  return `${account.accountName} · ${account.bankName} (${account.accountNumber})`;
}

export function confidenceLabel(confidence: StatementMatchConfidence) {
  switch (confidence) {
    case "high":
      return "High confidence";
    case "medium":
      return "Medium confidence";
    case "low":
      return "Low confidence";
    default:
      return "No match";
  }
}
