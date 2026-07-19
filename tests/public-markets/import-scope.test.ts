import { describe, expect, it } from "vitest";
import { resolveImportManagementType } from "@/lib/public-markets/import-scope";
import { parseImportOptionsFromFormData } from "@/lib/public-markets/import-options";
import {
  buildImportHoldingReplaceScope,
  planImportSymbolSync,
  scopesAreIsolated,
} from "@/lib/public-markets/import-scope";
import { resolveManagementFromSearchParam } from "@/lib/public-markets/constants";

describe("parseImportOptionsFromFormData", () => {
  it("parses broker account and managed override", () => {
    const formData = new FormData();
    formData.set("brokerAccountId", "acct-1");
    formData.set("isManaged", "false");

    expect(parseImportOptionsFromFormData(formData)).toEqual({
      brokerAccountId: "acct-1",
      isManaged: false,
    });
  });

  it("returns null isManaged when omitted", () => {
    const formData = new FormData();
    formData.set("brokerAccountId", "acct-1");

    expect(parseImportOptionsFromFormData(formData)).toEqual({
      brokerAccountId: "acct-1",
      isManaged: null,
    });
  });
});

describe("resolveImportManagementType", () => {
  it("uses account default when override is null", () => {
    expect(resolveImportManagementType({ isManaged: true }, null)).toBe(true);
    expect(resolveImportManagementType({ isManaged: false }, null)).toBe(false);
  });

  it("uses per-upload override when provided", () => {
    expect(resolveImportManagementType({ isManaged: true }, false)).toBe(false);
    expect(resolveImportManagementType({ isManaged: false }, true)).toBe(true);
  });
});

describe("resolveManagementFromSearchParam", () => {
  it("normalizes management filter values", () => {
    expect(resolveManagementFromSearchParam("managed")).toBe("managed");
    expect(resolveManagementFromSearchParam("reference")).toBe("reference");
    expect(resolveManagementFromSearchParam(undefined)).toBe("all");
  });
});

describe("import holding replace scope", () => {
  const base = {
    assetId: "asset-1",
    market: "USA" as const,
    brokerAccountId: "broker-acct-1",
    managedPortfolioId: "portfolio-1",
  };

  it("builds managed and reference scopes separately", () => {
    const managedScope = buildImportHoldingReplaceScope({ ...base, isManaged: true });
    const referenceScope = buildImportHoldingReplaceScope({ ...base, isManaged: false });

    expect(managedScope).toEqual({
      assetId: "asset-1",
      market: "USA",
      brokerAccountId: "broker-acct-1",
      managedPortfolioId: "portfolio-1",
      source: "IMPORT",
      isManaged: true,
    });
    expect(referenceScope.isManaged).toBe(false);
    expect(scopesAreIsolated(managedScope, referenceScope)).toBe(true);
  });

  it("upserts symbols and removes closed positions on re-import", () => {
    const firstImport = planImportSymbolSync([], ["AAPL", "MSFT"]);
    expect(firstImport).toEqual({
      toUpdate: [],
      toCreate: ["AAPL", "MSFT"],
      toDelete: [],
    });

    const secondImport = planImportSymbolSync(["AAPL", "MSFT"], ["AAPL", "GOOG"]);
    expect(secondImport).toEqual({
      toUpdate: ["AAPL"],
      toCreate: ["GOOG"],
      toDelete: ["MSFT"],
    });
  });

  it("does not duplicate symbols when re-importing the same file", () => {
    const reimport = planImportSymbolSync(["AAPL", "MSFT"], ["AAPL", "MSFT"]);
    expect(reimport).toEqual({
      toUpdate: ["AAPL", "MSFT"],
      toCreate: [],
      toDelete: [],
    });
  });
});
