"use client";

import { FilterToolbar } from "@/components/platform/filter-toolbar";
import { UrlFilterSelect } from "@/components/platform/url-filter-select";
export type ProposalsFilter = "all" | "mine" | "pending-approval" | "approved" | "rejected";

const OPTIONS: { value: ProposalsFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "mine", label: "Mine" },
  { value: "pending-approval", label: "Pending My Approval" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
] as const;

export function ProposalsFilterSelect({ current }: { current: ProposalsFilter }) {
  return (
    <FilterToolbar>
      <UrlFilterSelect
        label="Filter"
        paramKey="filter"
        value={current}
        options={[...OPTIONS]}
        pathname="/proposals"
        currentParams={{ filter: current === "all" ? undefined : current }}
        omitWhenValue="all"
        triggerClassName="min-w-[12rem]"
      />
    </FilterToolbar>
  );
}
