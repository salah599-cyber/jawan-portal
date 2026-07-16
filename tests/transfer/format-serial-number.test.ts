import { describe, expect, it } from "vitest";
import { formatTransferLetterSerialNumber } from "@/lib/transfer/format-serial-number";

describe("formatTransferLetterSerialNumber", () => {
  it("pads serial numbers to five digits with TL prefix", () => {
    expect(formatTransferLetterSerialNumber(1)).toBe("TL-00001");
    expect(formatTransferLetterSerialNumber(42)).toBe("TL-00042");
    expect(formatTransferLetterSerialNumber(123456)).toBe("TL-123456");
  });
});
