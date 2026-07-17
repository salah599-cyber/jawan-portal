import { describe, expect, it } from "vitest";
import {
  flattenBankAccountPickOptions,
  formatBankAccountPickLabel,
} from "@/lib/transfer/bank-account-fields";
import type { TransferLetterBankOption } from "@/lib/transfer/types";

describe("flattenBankAccountPickOptions", () => {
  it("creates one picker option per registered account number", () => {
    const accounts: TransferLetterBankOption[] = [
      {
        id: "bank-1",
        accountName: "Salah Murtadha Sultan",
        bankName: "National Bank of Oman",
        accountNumber: "111",
        iban: null,
        sortCode: null,
        swiftCode: null,
        entityId: "entity-1",
        currency: "OMR",
        notes: "Private Banking",
        includeInTransferLetterSource: true,
        accountNumbers: [
          { id: "num-1", accountNumber: "111", iban: "OM11", currency: "OMR", label: "Current" },
          { id: "num-2", accountNumber: "222", iban: "OM22", currency: "OMR", label: "Savings" },
          { id: "num-3", accountNumber: "333", iban: "OM33", currency: "USD", label: "USD" },
        ],
      },
    ];

    const options = flattenBankAccountPickOptions(accounts);
    expect(options).toHaveLength(3);
    expect(options.map((option) => option.accountNumber)).toEqual(["111", "222", "333"]);
    expect(options.every((option) => option.includeInTransferLetterSource)).toBe(true);
    expect(formatBankAccountPickLabel(options[1]!)).toContain("Savings");
  });

  it("copies includeInTransferLetterSource onto flattened pick options", () => {
    const accounts: TransferLetterBankOption[] = [
      {
        id: "bank-1",
        accountName: "Beneficiary Only",
        bankName: "HSBC",
        accountNumber: "999",
        iban: null,
        sortCode: null,
        swiftCode: null,
        entityId: null,
        currency: "OMR",
        notes: null,
        includeInTransferLetterSource: false,
        accountNumbers: [],
      },
    ];

    const options = flattenBankAccountPickOptions(accounts);
    expect(options).toHaveLength(1);
    expect(options[0]?.includeInTransferLetterSource).toBe(false);
  });
});
