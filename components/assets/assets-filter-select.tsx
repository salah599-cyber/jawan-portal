"use client";

import { FilterToolbar } from "@/components/platform/filter-toolbar";
import { UrlFilterSelect } from "@/components/platform/url-filter-select";
export type AssetsFilter = "all" | "active" | "exited";

const OPTIONS: { value: AssetsFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "exited", label: "Exited" },
] as const;

export function AssetsFilterSelect({ current }: { current: AssetsFilter }) {
  return (
    <FilterToolbar>
      <UrlFilterSelect
        label="Status"
        paramKey="filter"
        value={current}
        options={[...OPTIONS]}
        pathname="/assets"
        currentParams={{ filter: current === "all" ? undefined : current }}
        omitWhenValue="all"
      />
    </FilterToolbar>
  );
}
