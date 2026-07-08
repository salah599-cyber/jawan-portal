"use client";

import type { EntityOption } from "@/components/platform/entity-select";
import { EntityFilterSelect } from "@/components/platform/entity-filter-select";
import { FilterToolbar } from "@/components/platform/filter-toolbar";
import type { SearchParamMap } from "@/components/platform/url-filter-select";
import { UrlFilterSelect } from "@/components/platform/url-filter-select";

const STATUS_OPTIONS = [
  { value: "OPEN", label: "Open" },
  { value: "ALL", label: "All statuses" },
  { value: "COMPLETED", label: "Completed" },
] as const;

export function CalendarTasksFilters({
  entityId,
  entities,
  status,
  assigneeId,
  assignees,
  currentUserId,
  currentParams,
}: {
  entityId?: string;
  entities: EntityOption[];
  status: string;
  assigneeId?: string;
  assignees: { id: string; name: string }[];
  currentUserId: string;
  currentParams: SearchParamMap;
}) {
  const assigneeOptions = [
    { value: "all", label: "All assignees" },
    { value: currentUserId, label: "Assigned to me" },
    ...assignees
      .filter((assignee) => assignee.id !== currentUserId)
      .map((assignee) => ({ value: assignee.id, label: assignee.name })),
  ];

  return (
    <FilterToolbar>
      <UrlFilterSelect
        label="Status"
        paramKey="status"
        value={status}
        options={[...STATUS_OPTIONS]}
        pathname="/calendar/tasks"
        currentParams={currentParams}
        preserveParams={["entity", "assignee"]}
        omitWhenValue="OPEN"
      />
      <EntityFilterSelect
        entities={entities}
        value={entityId}
        pathname="/calendar/tasks"
        currentParams={currentParams}
        preserveParams={["status", "assignee"]}
      />
      <UrlFilterSelect
        label="Assignee"
        paramKey="assignee"
        value={assigneeId ?? "all"}
        options={assigneeOptions}
        pathname="/calendar/tasks"
        currentParams={currentParams}
        preserveParams={["entity", "status"]}
        omitWhenValue="all"
        triggerClassName="min-w-[11rem]"
      />
    </FilterToolbar>
  );
}
