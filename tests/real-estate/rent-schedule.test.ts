import { describe, expect, it } from "vitest";
import { filterSchedulesForCurrentLease, pickCurrentLease } from "@/lib/real-estate/rent-schedule";

describe("pickCurrentLease", () => {
  it("prefers the active lease over a later renewed lease", () => {
    const current = pickCurrentLease([
      { id: "old", status: "RENEWED" },
      { id: "latest", status: "ACTIVE" },
    ]);
    expect(current?.id).toBe("latest");
  });
});

describe("filterSchedulesForCurrentLease", () => {
  it("drops overlapping months from the earlier lease", () => {
    const leases = [
      { id: "latest", status: "ACTIVE", leaseStartDate: new Date("2026-05-12T00:00:00.000Z") },
      { id: "old", status: "RENEWED", leaseStartDate: new Date("2026-06-01T00:00:00.000Z") },
    ];
    const rows = [
      { leaseId: "latest", dueDate: new Date("2026-05-01T00:00:00.000Z"), period: "May" },
      { leaseId: "latest", dueDate: new Date("2026-06-01T00:00:00.000Z"), period: "June-new" },
      { leaseId: "old", dueDate: new Date("2026-06-01T00:00:00.000Z"), period: "June-old" },
      { leaseId: "old", dueDate: new Date("2026-11-01T00:00:00.000Z"), period: "Nov-old" },
    ];

    expect(filterSchedulesForCurrentLease(rows, leases).map((row) => row.period)).toEqual([
      "May",
      "June-new",
    ]);
  });

  it("keeps historical rent from before the current lease starts", () => {
    const leases = [
      { id: "latest", status: "ACTIVE", leaseStartDate: new Date("2026-06-01T00:00:00.000Z") },
      { id: "old", status: "RENEWED", leaseStartDate: new Date("2025-06-01T00:00:00.000Z") },
    ];
    const rows = [
      { leaseId: "old", dueDate: new Date("2026-05-01T00:00:00.000Z"), period: "May-old" },
      { leaseId: "old", dueDate: new Date("2026-06-01T00:00:00.000Z"), period: "June-old" },
      { leaseId: "latest", dueDate: new Date("2026-06-01T00:00:00.000Z"), period: "June-new" },
    ];

    expect(filterSchedulesForCurrentLease(rows, leases).map((row) => row.period)).toEqual([
      "May-old",
      "June-new",
    ]);
  });
});
