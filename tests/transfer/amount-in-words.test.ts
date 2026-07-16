import { describe, expect, it } from "vitest";
import {
  buildAmountInWords,
  formatAmountLine,
  formatAmountNumber,
  formatAmountWords,
  numberToEnglishWords,
  parseAmountParts,
} from "@/lib/transfer/amount-in-words";

describe("numberToEnglishWords", () => {
  it("converts common amounts", () => {
    expect(numberToEnglishWords(0)).toBe("Zero");
    expect(numberToEnglishWords(1)).toBe("One");
    expect(numberToEnglishWords(5000)).toBe("Five Thousand");
    expect(numberToEnglishWords(100000)).toBe("One Hundred Thousand");
    expect(numberToEnglishWords(200000)).toBe("Two Hundred Thousand");
  });
});

describe("parseAmountParts", () => {
  it("parses OMR to three decimal places", () => {
    expect(parseAmountParts("1500.235", "OMR")).toEqual({
      whole: 1500,
      fraction: 235,
      fractionDenominator: 1000,
      maxDecimalPlaces: 3,
    });
  });

  it("parses USD to two decimal places", () => {
    expect(parseAmountParts("1500.25", "USD")).toEqual({
      whole: 1500,
      fraction: 25,
      fractionDenominator: 100,
      maxDecimalPlaces: 2,
    });
  });
});

describe("formatAmountLine", () => {
  it("formats OMR with three decimal places", () => {
    expect(formatAmountLine("1500.235", "OMR", "LOCAL")).toBe(
      "OMR 1,500.235 (OMR One thousand five hundred & 235/1000)",
    );
  });

  it("formats local OMR whole numbers", () => {
    expect(formatAmountLine(100000, "OMR", "LOCAL")).toBe(
      "OMR 100,000 (OMR One Hundred Thousand Only)",
    );
  });

  it("formats international AED whole numbers", () => {
    expect(formatAmountWords(200000, "AED", "INTERNATIONAL")).toBe("AED: Two Hundred thousand Only");
    expect(formatAmountNumber(200000, "AED", "INTERNATIONAL")).toBe("AED 200,000");
  });

  it("formats international USD with cents", () => {
    expect(formatAmountLine("1500.25", "USD", "INTERNATIONAL")).toBe(
      "USD 1,500.25 (USD: One thousand five hundred & 25/100)",
    );
  });

  it("formats UK GBP whole numbers", () => {
    expect(formatAmountLine(5000, "GBP", "UK")).toBe(
      "GBP 5000 (Pound Sterling Five Thousand Only)",
    );
  });

  it("formats UK GBP with pence", () => {
    expect(formatAmountLine("1500.25", "GBP", "UK")).toBe(
      "GBP 1500.25 (Pound Sterling One thousand five hundred & 25/100)",
    );
  });

  it("buildAmountInWords matches stored value", () => {
    expect(buildAmountInWords("1500.235", "OMR", "LOCAL")).toBe(
      "OMR One thousand five hundred & 235/1000",
    );
  });
});
