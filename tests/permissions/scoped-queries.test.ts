import { describe, expect, it } from "vitest";
import {
  assetEntityFilter,
  carEntityFilter,
  chequeEntityFilter,
  companyEntityFilter,
  documentFilter,
  expenseEntityFilter,
  landEntityFilter,
  loanEntityFilter,
  proposalEntityFilter,
} from "@/lib/permissions/scoped-queries";
import { withOverride, withRole } from "../helpers/user-context";

describe("entity-scoped filters (ASSETS-style: FULL/READ -> {}, FILTERED -> entityId in, NONE -> id: __none__)", () => {
  const filters = [assetEntityFilter, carEntityFilter, companyEntityFilter, loanEntityFilter, landEntityFilter];

  for (const filter of filters) {
    it(`${filter.name} returns {} for FULL and READ access`, () => {
      expect(filter(withRole("PRINCIPAL"))).toEqual({});
      expect(filter(withRole("SIGNATORY"))).toEqual({});
    });

    it(`${filter.name} scopes to entityIds for FILTERED access`, () => {
      const ctx = withRole("DIRECTOR", { entityIds: ["e1", "e2"] });
      expect(filter(ctx)).toEqual({ entityId: { in: ["e1", "e2"] } });
    });

    it(`${filter.name} excludes everything for NONE access`, () => {
      expect(filter(withRole("EXTERNAL"))).toEqual({ id: "__none__" });
    });
  }
});

describe("chequeEntityFilter", () => {
  it("always excludes soft-deleted cheques", () => {
    expect(chequeEntityFilter(withRole("PRINCIPAL"))).toEqual({ deletedAt: null });
  });

  it("scopes to entity access for FILTERED users while excluding soft-deleted rows", () => {
    const ctx = withRole("DIRECTOR", { entityIds: ["e1"] });
    expect(chequeEntityFilter(ctx)).toEqual({ deletedAt: null, entityId: { in: ["e1"] } });
  });

  it("excludes everything for NONE access", () => {
    expect(chequeEntityFilter(withRole("EXTERNAL"))).toEqual({ id: "__none__" });
  });
});

describe("proposalEntityFilter", () => {
  it("allows entity-less proposals through for FILTERED users", () => {
    const ctx = withOverride("EXTERNAL", "PROPOSALS", "FILTERED", { entityIds: ["e1"] });
    expect(proposalEntityFilter(ctx)).toEqual({ OR: [{ entityId: null }, { entityId: { in: ["e1"] } }] });
  });

  it("returns {} for FULL access", () => {
    expect(proposalEntityFilter(withRole("PRINCIPAL"))).toEqual({});
  });
});

describe("expenseEntityFilter", () => {
  // Regression test: FILTERED and READ used to be incorrectly treated as NONE,
  // which silently hid all expenses from users who should have had access.
  it("returns {} for FULL and READ access", () => {
    expect(expenseEntityFilter(withRole("PRINCIPAL"))).toEqual({});
    expect(expenseEntityFilter(withOverride("EXTERNAL", "EXPENSES", "READ"))).toEqual({});
  });

  it("allows entity-less expenses through for FILTERED users", () => {
    const ctx = withOverride("EXTERNAL", "EXPENSES", "FILTERED", { entityIds: ["e1"] });
    expect(expenseEntityFilter(ctx)).toEqual({ OR: [{ entityId: null }, { entityId: { in: ["e1"] } }] });
  });

  it("excludes everything for NONE access", () => {
    expect(expenseEntityFilter(withRole("EXTERNAL"))).toEqual({ id: "__none__" });
  });
});

describe("documentFilter", () => {
  it("returns {} for FULL and READ access", () => {
    expect(documentFilter(withRole("PRINCIPAL"))).toEqual({});
    expect(documentFilter(withRole("SIGNATORY"))).toEqual({});
  });

  it("scopes to allowed document categories for FILTERED users", () => {
    const ctx = withRole("FINANCE", { documentCategories: ["cat1", "cat2"] });
    expect(documentFilter(ctx)).toEqual({ categoryId: { in: ["cat1", "cat2"] } });
  });

  it("excludes everything for FILTERED users with no assigned categories", () => {
    const ctx = withRole("FINANCE", { documentCategories: [] });
    expect(documentFilter(ctx)).toEqual({ id: "__none__" });
  });

  it("excludes everything for SHARED_ONLY and NONE access", () => {
    expect(documentFilter(withRole("EXTERNAL"))).toEqual({ id: "__none__" });
  });
});
