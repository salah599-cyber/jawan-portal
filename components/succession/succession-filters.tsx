"use client";

import type { EntityOption } from "@/components/platform/entity-select";
import { EntityFilterSelect } from "@/components/platform/entity-filter-select";
import { FilterToolbar } from "@/components/platform/filter-toolbar";
import type { SearchParamMap } from "@/components/platform/url-filter-select";
import { UrlFilterSelect } from "@/components/platform/url-filter-select";
import { SUCCESSION_PLAN_STATUS_LABELS } from "@/lib/labels";

export function SuccessionFilters({
  status,
  currentParams,
}: {
  status?: string;
  currentParams: SearchParamMap;
}) {
  const statusOptions = [
    { value: "all", label: "All statuses" },
    ...Object.entries(SUCCESSION_PLAN_STATUS_LABELS).map(([value, label]) => ({
      value,
      label,
    })),
  ];

  return (
    <FilterToolbar>
      <UrlFilterSelect
        label="Status"
        paramKey="status"
        value={status ?? "all"}
        options={statusOptions}
        pathname="/family/succession"
        currentParams={currentParams}
        omitWhenValue="all"
        triggerClassName="min-w-[11rem]"
      />
    </FilterToolbar>
  );
}
