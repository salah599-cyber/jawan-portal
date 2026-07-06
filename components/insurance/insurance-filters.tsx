"use client";

import type { EntityOption } from "@/components/platform/entity-select";
import { EntityFilterSelect } from "@/components/platform/entity-filter-select";
import { FilterToolbar } from "@/components/platform/filter-toolbar";
import type { SearchParamMap } from "@/components/platform/url-filter-select";
import { UrlFilterSelect } from "@/components/platform/url-filter-select";
import {
  INSURANCE_POLICY_STATUS_LABELS,
  INSURANCE_POLICY_TYPE_LABELS,
} from "@/lib/labels";

export function InsuranceFilters({
  entityId,
  entities,
  typeParam,
  statusParam,
  currentParams,
}: {
  entityId?: string;
  entities: EntityOption[];
  typeParam?: string;
  statusParam?: string;
  currentParams: SearchParamMap;
}) {
  const typeOptions = [
    { value: "all", label: "All types" },
    ...Object.entries(INSURANCE_POLICY_TYPE_LABELS).map(([value, label]) => ({
      value,
      label,
    })),
  ];
  const statusOptions = [
    { value: "all", label: "All statuses" },
    { value: "EXPIRING", label: "Expiring" },
    ...Object.entries(INSURANCE_POLICY_STATUS_LABELS).map(([value, label]) => ({
      value,
      label,
    })),
  ];

  return (
    <FilterToolbar>
      <EntityFilterSelect
        entities={entities}
        value={entityId}
        pathname="/documents/insurance"
        currentParams={currentParams}
        preserveParams={["type", "status"]}
      />
      <UrlFilterSelect
        label="Type"
        paramKey="type"
        value={typeParam ?? "all"}
        options={typeOptions}
        pathname="/documents/insurance"
        currentParams={currentParams}
        preserveParams={["entity", "status"]}
        omitWhenValue="all"
        triggerClassName="min-w-[11rem]"
      />
      <UrlFilterSelect
        label="Status"
        paramKey="status"
        value={statusParam ?? "all"}
        options={statusOptions}
        pathname="/documents/insurance"
        currentParams={currentParams}
        preserveParams={["entity", "type"]}
        omitWhenValue="all"
        triggerClassName="min-w-[11rem]"
      />
    </FilterToolbar>
  );
}
