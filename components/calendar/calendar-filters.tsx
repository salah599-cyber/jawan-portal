"use client";

import type { EntityOption } from "@/components/platform/entity-select";
import { EntityFilterSelect } from "@/components/platform/entity-filter-select";
import { FilterToolbar } from "@/components/platform/filter-toolbar";
import type { SearchParamMap } from "@/components/platform/url-filter-select";
import { UrlFilterSelect } from "@/components/platform/url-filter-select";
import type { CalendarView } from "@/lib/calendar/date-ranges";

const VIEW_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "list", label: "List" },
] as const;

export function CalendarFilters({
  view,
  entityId,
  entities,
  currentParams,
}: {
  view: CalendarView;
  date: string;
  entityId?: string;
  entities: EntityOption[];
  currentParams: SearchParamMap;
}) {
  return (
    <FilterToolbar>
      <UrlFilterSelect
        label="View"
        paramKey="view"
        value={view}
        options={[...VIEW_OPTIONS]}
        pathname="/calendar"
        currentParams={currentParams}
        preserveParams={["date", "entity"]}
      />
      <EntityFilterSelect
        entities={entities}
        value={entityId}
        pathname="/calendar"
        currentParams={currentParams}
        preserveParams={["view", "date"]}
      />
    </FilterToolbar>
  );
}
