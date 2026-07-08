import { describe, expect, it } from "vitest";
import { assertCanViewProposal, type ViewableProposal } from "@/lib/proposals/access";
import { makeUserContext, withRole } from "../helpers/user-context";

function makeProposal(overrides: Partial<ViewableProposal> = {}): ViewableProposal {
  return {
    submittedById: "submitter-1",
    entityId: "entity-1",
    approvers: [],
    ...overrides,
  };
}

describe("assertCanViewProposal", () => {
  it("always allows the submitter to view their own proposal", () => {
    const ctx = withRole("EXTERNAL", { id: "submitter-1" });
    expect(() => assertCanViewProposal(ctx, makeProposal({ submittedById: "submitter-1" }))).not.toThrow();
  });

  it("always allows an assigned approver to view the proposal", () => {
    const ctx = withRole("EXTERNAL", { id: "approver-1" });
    const proposal = makeProposal({ approvers: [{ userId: "approver-1" }] });
    expect(() => assertCanViewProposal(ctx, proposal)).not.toThrow();
  });

  it("throws Forbidden for users with NONE permission on PROPOSALS", () => {
    const ctx = withRole("EXTERNAL", { id: "outsider" });
    expect(() => assertCanViewProposal(ctx, makeProposal())).toThrow("Forbidden");
  });

  it("allows FULL/READ permission users to view proposals outside their entity scope", () => {
    const ctx = withRole("SIGNATORY", { id: "reader" }); // PROPOSALS: READ
    expect(() => assertCanViewProposal(ctx, makeProposal({ entityId: "entity-99" }))).not.toThrow();
  });

  it("blocks FILTERED users from viewing proposals outside their entity access", () => {
    const filteredCtx = makeUserContext({
      id: "filtered-user",
      role: "EXTERNAL",
      entityIds: ["entity-2"],
      overrides: { PROPOSALS: "FILTERED" },
    });
    expect(() => assertCanViewProposal(filteredCtx, makeProposal({ entityId: "entity-1" }))).toThrow(
      "You do not have access to this proposal.",
    );
  });

  it("allows FILTERED users to view proposals within their entity access", () => {
    const ctx = makeUserContext({
      id: "filtered-user",
      role: "EXTERNAL",
      entityIds: ["entity-1"],
      overrides: { PROPOSALS: "FILTERED" },
    });
    expect(() => assertCanViewProposal(ctx, makeProposal({ entityId: "entity-1" }))).not.toThrow();
  });

  it("allows FILTERED users to view entity-less proposals", () => {
    const ctx = makeUserContext({
      id: "filtered-user",
      role: "EXTERNAL",
      entityIds: ["entity-1"],
      overrides: { PROPOSALS: "FILTERED" },
    });
    expect(() => assertCanViewProposal(ctx, makeProposal({ entityId: null }))).not.toThrow();
  });

  it("always allows super admins regardless of entity scope", () => {
    const ctx = makeUserContext({
      id: "admin",
      role: "EXTERNAL",
      isSuperAdmin: true,
      entityIds: [],
      overrides: {},
    });
    expect(() => assertCanViewProposal(ctx, makeProposal({ entityId: "entity-99" }))).not.toThrow();
  });
});
