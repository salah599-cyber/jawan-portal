import { describe, expect, it } from "vitest";
import {
  bankAccountPickToBeneficiaryFields,
  flattenBankAccountPickOptions,
  formatBankAccountPickLabel,
} from "@/lib/transfer/bank-account-fields";
import type { TransferLetterBankOption } from "@/lib/transfer/types";

const usaBankFields = {
  routingNumber: "021000021",
  correspondentBankName: "JPMorgan Chase Bank, N.A.",
  correspondentSwiftCode: "CHASUS33",
  correspondentRoutingNumber: "021000021",
  correspondentFfcInstructions: "FFC Account #1234567890",
};

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
        ...usaBankFields,
        routingNumber: null,
        correspondentBankName: null,
        correspondentSwiftCode: null,
        correspondentRoutingNumber: null,
        correspondentFfcInstructions: null,
        entityId: "entity-1",
        currency: "OMR",
        notes: "Private Banking",
        includeInTransferLetterSource: true,
        accountNumbers: [
          {
            id: "num-1",
            accountNumber: "111",
            iban: "OM11",
            currency: "OMR",
            label: "Current",
            includeInTransferLetterSource: true,
          },
          {
            id: "num-2",
            accountNumber: "222",
            iban: "OM22",
            currency: "OMR",
            label: "Savings",
            includeInTransferLetterSource: false,
          },
          {
            id: "num-3",
            accountNumber: "333",
            iban: "OM33",
            currency: "USD",
            label: "USD",
            includeInTransferLetterSource: true,
          },
        ],
      },
    ];

    const options = flattenBankAccountPickOptions(accounts);
    expect(options).toHaveLength(3);
    expect(options.map((option) => option.accountNumber)).toEqual(["111", "222", "333"]);
    expect(options.map((option) => option.includeInTransferLetterSource)).toEqual([true, false, true]);
    expect(formatBankAccountPickLabel(options[1]!)).toContain("Savings");
  });

  it("uses the parent flag for legacy single-account bank records", () => {
    const accounts: TransferLetterBankOption[] = [
      {
        id: "bank-1",
        accountName: "Beneficiary Only",
        bankName: "HSBC",
        accountNumber: "999",
        iban: null,
        sortCode: null,
        swiftCode: null,
        routingNumber: null,
        correspondentBankName: null,
        correspondentSwiftCode: null,
        correspondentRoutingNumber: null,
        correspondentFfcInstructions: null,
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

  it("passes USA routing and correspondent fields through pick options", () => {
    const accounts: TransferLetterBankOption[] = [
      {
        id: "bank-usa",
        accountName: "Salah - Chase",
        bankName: "JPMorgan Chase",
        accountNumber: "1234567890",
        iban: null,
        sortCode: null,
        swiftCode: "CHASUS33",
        ...usaBankFields,
        entityId: null,
        currency: "USD",
        notes: null,
        includeInTransferLetterSource: true,
        accountNumbers: [],
      },
    ];

    const options = flattenBankAccountPickOptions(accounts);
    expect(options[0]).toMatchObject({
      routingNumber: "021000021",
      correspondentBankName: "JPMorgan Chase Bank, N.A.",
      correspondentSwiftCode: "CHASUS33",
      correspondentRoutingNumber: "021000021",
      correspondentFfcInstructions: "FFC Account #1234567890",
    });
  });
});

describe("bankAccountPickToBeneficiaryFields", () => {
  it("maps USA routing and correspondent fields for beneficiary auto-fill", () => {
    const accounts: TransferLetterBankOption[] = [
      {
        id: "bank-usa",
        accountName: "Salah - Chase",
        bankName: "JPMorgan Chase",
        accountNumber: "1234567890",
        iban: null,
        sortCode: null,
        swiftCode: "CHASUS33",
        ...usaBankFields,
        entityId: null,
        currency: "USD",
        notes: null,
        includeInTransferLetterSource: true,
        accountNumbers: [],
      },
    ];

    const option = flattenBankAccountPickOptions(accounts)[0]!;
    expect(bankAccountPickToBeneficiaryFields(option)).toEqual({
      beneficiaryBankName: "JPMorgan Chase",
      beneficiaryName: "Salah - Chase",
      beneficiaryAccountNumber: "1234567890",
      beneficiaryIban: "",
      beneficiarySortCode: "",
      beneficiarySwiftCode: "CHASUS33",
      beneficiaryRoutingNumber: "021000021",
      correspondentBankName: "JPMorgan Chase Bank, N.A.",
      correspondentSwiftCode: "CHASUS33",
      correspondentRoutingNumber: "021000021",
      correspondentFfcInstructions: "FFC Account #1234567890",
    });
  });
});
