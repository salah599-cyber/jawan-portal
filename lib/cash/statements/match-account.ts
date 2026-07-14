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

function candidateAccountNumbers(account: StatementAccountCandidate): string[] {
  const numbers = (account.accountNumbers ?? []).map((row) => row.accountNumber);
  if (numbers.length > 0) return numbers;
  return account.accountNumber ? [account.accountNumber] : [];
}

function accountNumberMatches(parsedAccount: string, account: StatementAccountCandidate) {
  const numbers = candidateAccountNumbers(account).map((value) => normalizeToken(value));
  if (numbers.some((value) => value === parsedAccount)) {
    return { matched: true, confidence: "high" as const, reason: "Matched by account number." };
  }

  const suffix = lastDigits(parsedAccount);
  if (suffix.length >= 4) {
    const suffixMatches = numbers.filter((value) => lastDigits(value) === suffix);
    if (suffixMatches.length === 1) {
      return {
        matched: true,
        confidence: "medium" as const,
        reason: "Matched by account suffix.",
      };
    }
  }

  return { matched: false, confidence: "none" as const, reason: null };
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

    if (parsedIban && preferredIban && parsedIban === preferredIban) {
      return {
        accountId: preferred.id,
        accountName: preferred.accountName,
        confidence: "high",
        reason: "IBAN matches selected account.",
      };
    }

    if (parsedAccount) {
      const numberMatch = accountNumberMatches(parsedAccount, preferred);
      if (numberMatch.matched) {
        return {
          accountId: preferred.id,
          accountName: preferred.accountName,
          confidence: numberMatch.confidence,
          reason: "Account number matches selected account.",
        };
      }
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
    const exact = accounts.find((account) => accountNumberMatches(parsedAccount, account).matched);
    if (exact) {
      const numberMatch = accountNumberMatches(parsedAccount, exact);
      return {
        accountId: exact.id,
        accountName: exact.accountName,
        confidence: numberMatch.confidence === "medium" ? "medium" : "high",
        reason: numberMatch.reason ?? "Matched by account number.",
      };
    }

    const suffix = lastDigits(parsedAccount);
    if (suffix.length >= 4) {
      const suffixMatches = accounts.filter((account) => {
        const numbers = candidateAccountNumbers(account).map((value) => normalizeToken(value));
        return numbers.some((value) => lastDigits(value) === suffix);
      });
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
  const numbers = account.accountNumbers ?? [];
  const numberLabel =
    numbers.length > 0
      ? numbers.map((row) => `${row.accountNumber} (${row.currency})`).join(", ")
      : account.accountNumber;
  return `${account.accountName} · ${account.bankName} (${numberLabel})`;
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
