import { describe, expect, it } from "vitest";
import {
  citation,
  extractChartsFromToolOutput,
  extractCitationsFromToolOutput,
} from "@/lib/assistant/types";

describe("assistant citation helpers", () => {
  it("builds citation objects", () => {
    expect(citation("Cash", "/cash")).toEqual({ label: "Cash", href: "/cash" });
    expect(citation("Loan A", "/loans/1", "1")).toEqual({
      label: "Loan A",
      href: "/loans/1",
      id: "1",
    });
  });

  it("extracts unique citations from tool output", () => {
    const citations = extractCitationsFromToolOutput({
      citations: [
        { label: "Cash", href: "/cash" },
        { label: "Cash", href: "/cash" },
        { label: "Assets", href: "/assets" },
        { label: "Broken" },
      ],
    });

    expect(citations).toEqual([
      { label: "Cash", href: "/cash" },
      { label: "Assets", href: "/assets" },
    ]);
  });

  it("still extracts charts alongside citations", () => {
    const charts = extractChartsFromToolOutput({
      chart: {
        type: "bar",
        title: "Demo",
        series: [{ name: "OMR", points: [{ label: "A", value: 1 }] }],
      },
      citations: [{ label: "Assets", href: "/assets" }],
    });
    expect(charts).toHaveLength(1);
    expect(charts[0]?.title).toBe("Demo");
  });
});
