import { describe, expect, it } from "vitest";
import {
  buildAmountInWords,
  formatAmountLine,
  formatAmountNumber,
  formatAmountWords,
  numberToEnglishWords,
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

describe("formatAmountLine", () => {
  it("formats local OMR template style", () => {
    expect(formatAmountLine(100000, "OMR", "LOCAL")).toBe(
      "OMR 100,000 (OMR One Hundred Thousand Only)",
    );
  });

  it("formats international AED template style", () => {
    expect(formatAmountWords(200000, "AED", "INTERNATIONAL")).toBe("AED: Two Hundred thousand Only");
    expect(formatAmountNumber(200000, "AED", "INTERNATIONAL")).toBe("AED 200,000");
  });

  it("formats UK GBP template style", () => {
    expect(formatAmountLine(5000, "GBP", "UK")).toBe(
      "GBP 5000 (Pound Sterling Five Thousand Only)",
    );
  });

  it("buildAmountInWords matches stored value", () => {
    expect(buildAmountInWords(100000, "OMR", "LOCAL")).toBe("OMR One Hundred Thousand Only");
  });
});
