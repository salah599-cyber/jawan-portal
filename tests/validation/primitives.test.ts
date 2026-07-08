import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  assertEnumValue,
  assertOwnershipPercentagesValid,
  parseOrThrow,
  zOptionalDate,
  zOptionalDecimal,
  zOptionalString,
  zRequiredDate,
  zRequiredDecimal,
  zRequiredString,
} from "@/lib/validation/primitives";

describe("zRequiredString", () => {
  const schema = zRequiredString("Name");

  it("trims and accepts non-empty strings", () => {
    expect(schema.parse("  Jawan Holdings  ")).toBe("Jawan Holdings");
  });

  it("rejects empty or whitespace-only strings", () => {
    expect(schema.safeParse("").success).toBe(false);
    expect(schema.safeParse("   ").success).toBe(false);
  });
});

describe("zOptionalString", () => {
  const schema = zOptionalString();

  it("converts empty strings to undefined", () => {
    expect(schema.parse("")).toBeUndefined();
    expect(schema.parse(undefined)).toBeUndefined();
  });

  it("keeps non-empty values", () => {
    expect(schema.parse("hello")).toBe("hello");
  });
});

describe("zRequiredDecimal", () => {
  it("accepts integers and decimals, including negatives", () => {
    const schema = zRequiredDecimal("Amount");
    expect(schema.parse("100")).toBe("100");
    expect(schema.parse("99.95")).toBe("99.95");
    expect(schema.parse("-5")).toBe("-5");
  });

  it("rejects non-numeric strings", () => {
    const schema = zRequiredDecimal("Amount");
    expect(schema.safeParse("abc").success).toBe(false);
    expect(schema.safeParse("12abc").success).toBe(false);
    expect(schema.safeParse("").success).toBe(false);
  });

  it("enforces a minimum when provided", () => {
    const schema = zRequiredDecimal("Ownership %", { min: 0 });
    expect(schema.safeParse("-1").success).toBe(false);
    expect(schema.safeParse("0").success).toBe(true);
  });

  it("enforces a maximum when provided", () => {
    const schema = zRequiredDecimal("Ownership %", { min: 0, max: 100 });
    expect(schema.safeParse("101").success).toBe(false);
    expect(schema.safeParse("100").success).toBe(true);
  });
});

describe("zOptionalDecimal", () => {
  const schema = zOptionalDecimal("Rate", { min: 0, max: 100 });

  it("treats empty input as undefined without validation errors", () => {
    expect(schema.parse("")).toBeUndefined();
    expect(schema.parse(undefined)).toBeUndefined();
  });

  it("still validates numeric format and bounds when a value is present", () => {
    expect(schema.safeParse("not-a-number").success).toBe(false);
    expect(schema.safeParse("150").success).toBe(false);
    expect(schema.safeParse("50").success).toBe(true);
  });
});

describe("zRequiredDate / zOptionalDate", () => {
  it("parses valid date strings into Date objects", () => {
    const result = zRequiredDate("Issue date").parse("2026-01-15");
    expect(result).toBeInstanceOf(Date);
    expect(Number.isNaN(result.getTime())).toBe(false);
  });

  it("rejects invalid or empty required dates", () => {
    expect(zRequiredDate("Issue date").safeParse("not-a-date").success).toBe(false);
    expect(zRequiredDate("Issue date").safeParse("").success).toBe(false);
  });

  it("treats empty optional dates as undefined", () => {
    expect(zOptionalDate("Expiry date").parse("")).toBeUndefined();
  });

  it("rejects invalid optional dates when a value is present", () => {
    expect(zOptionalDate("Expiry date").safeParse("banana").success).toBe(false);
  });
});

describe("assertEnumValue", () => {
  const STATUSES = ["ACTIVE", "INACTIVE"] as const;

  it("returns the value when it is in the allowed set", () => {
    expect(assertEnumValue("ACTIVE", STATUSES, "Status")).toBe("ACTIVE");
  });

  it("throws a friendly error for values outside the allowed set", () => {
    expect(() => assertEnumValue("DELETED", STATUSES, "Status")).toThrow("Status is invalid.");
  });
});

describe("parseOrThrow", () => {
  const schema = z.object({ name: zRequiredString("Name") });

  it("returns parsed data on success", () => {
    expect(parseOrThrow(schema, { name: "Acme" })).toEqual({ name: "Acme" });
  });

  it("throws a plain Error with the first Zod issue message on failure", () => {
    expect(() => parseOrThrow(schema, { name: "" })).toThrow("Name is required.");
  });
});

describe("assertOwnershipPercentagesValid", () => {
  it("does not throw when percentages sum to 100 or less", () => {
    expect(() => assertOwnershipPercentagesValid(["50", "50"])).not.toThrow();
    expect(() => assertOwnershipPercentagesValid(["30", "20", undefined])).not.toThrow();
  });

  it("throws when percentages sum to more than 100", () => {
    expect(() => assertOwnershipPercentagesValid(["60", "60"])).toThrow(/cannot exceed 100%/);
  });

  it("ignores undefined/blank entries when summing", () => {
    expect(() => assertOwnershipPercentagesValid([undefined, undefined])).not.toThrow();
  });
});
