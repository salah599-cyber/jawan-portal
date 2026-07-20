import { describe, expect, it } from "vitest";
import {
  defaultCurrencyForRegion,
  normalizeCorrespondentBankFields,
  normalizeRoutingNumber,
  parseBankAccountRegion,
  validateBankAccountRegionFields,
  validateCorrespondentRoutingNumber,
} from "@/lib/bank/region";

describe("parseBankAccountRegion", () => {
  it("defaults unknown values to OMAN", () => {
    expect(parseBankAccountRegion(undefined)).toBe("OMAN");
    expect(parseBankAccountRegion("invalid")).toBe("OMAN");
  });

  it("parses USA region", () => {
    expect(parseBankAccountRegion("usa")).toBe("USA");
  });
});

describe("defaultCurrencyForRegion", () => {
  it("returns USD for USA and OMR for Oman", () => {
    expect(defaultCurrencyForRegion("USA")).toBe("USD");
    expect(defaultCurrencyForRegion("OMAN")).toBe("OMR");
  });
});

describe("normalizeRoutingNumber", () => {
  it("strips non-digits from routing numbers", () => {
    expect(normalizeRoutingNumber("021-000-021")).toBe("021000021");
  });
});

describe("validateBankAccountRegionFields", () => {
  it("requires a 9-digit routing number for USA accounts", () => {
    expect(() => validateBankAccountRegionFields("USA", "12345")).toThrow(
      "USA bank accounts require a 9-digit ABA routing number.",
    );
  });

  it("accepts valid USA routing numbers", () => {
    expect(() => validateBankAccountRegionFields("USA", "021000021")).not.toThrow();
  });

  it("does not require routing numbers for Oman accounts", () => {
    expect(() => validateBankAccountRegionFields("OMAN", undefined)).not.toThrow();
  });
});

describe("validateCorrespondentRoutingNumber", () => {
  it("allows empty correspondent routing numbers", () => {
    expect(() => validateCorrespondentRoutingNumber(undefined)).not.toThrow();
    expect(() => validateCorrespondentRoutingNumber("")).not.toThrow();
  });

  it("requires 9 digits when a correspondent routing number is provided", () => {
    expect(() => validateCorrespondentRoutingNumber("12345")).toThrow(
      "Correspondent routing number must be 9 digits when provided.",
    );
  });

  it("accepts valid correspondent routing numbers", () => {
    expect(() => validateCorrespondentRoutingNumber("021000021")).not.toThrow();
  });
});

describe("normalizeCorrespondentBankFields", () => {
  it("trims and normalizes correspondent fields", () => {
    expect(
      normalizeCorrespondentBankFields({
        correspondentBankName: "  JPMorgan Chase  ",
        correspondentSwiftCode: " CHASUS33 ",
        correspondentRoutingNumber: "021-000-021",
        correspondentFfcInstructions: " FFC Account #123 ",
      }),
    ).toEqual({
      correspondentBankName: "JPMorgan Chase",
      correspondentSwiftCode: "CHASUS33",
      correspondentRoutingNumber: "021000021",
      correspondentFfcInstructions: "FFC Account #123",
    });
  });

  it("returns nulls for empty correspondent fields", () => {
    expect(normalizeCorrespondentBankFields({})).toEqual({
      correspondentBankName: null,
      correspondentSwiftCode: null,
      correspondentRoutingNumber: null,
      correspondentFfcInstructions: null,
    });
  });
});
