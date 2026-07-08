"use client";

import { useRouter } from "next/navigation";
import type { EntityOption } from "@/components/platform/entity-select";
import { EntityFilterSelect } from "@/components/platform/entity-filter-select";
import { FilterToolbar } from "@/components/platform/filter-toolbar";
import type { SearchParamMap } from "@/components/platform/url-filter-select";
import { UrlFilterSelect } from "@/components/platform/url-filter-select";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DIRECTORY_CONTACT_TYPE_LABELS } from "@/lib/labels";

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "all", label: "All statuses" },
  { value: "follow-up", label: "Follow-up due" },
] as const;

export function ContactsFilters({
  entityId,
  entities,
  typeParam,
  activeOnly,
  followUpDue,
  currentParams,
}: {
  entityId?: string;
  entities: EntityOption[];
  typeParam?: string;
  activeOnly: boolean;
  followUpDue: boolean;
  currentParams: SearchParamMap;
}) {
  const router = useRouter();
  const statusValue = followUpDue ? "follow-up" : activeOnly ? "active" : "all";
  const typeOptions = [
    { value: "all", label: "All types" },
    ...Object.entries(DIRECTORY_CONTACT_TYPE_LABELS).map(([value, label]) => ({
      value,
      label,
    })),
  ];

  function handleStatusChange(next: string) {
    const params = new URLSearchParams();
    if (currentParams.entity) params.set("entity", currentParams.entity);
    if (currentParams.type) params.set("type", currentParams.type);

    if (next === "follow-up") {
      params.set("followUp", "due");
      params.set("active", "all");
    } else if (next === "all") {
      params.set("active", "all");
    }

    const qs = params.toString();
    router.push(qs ? `/contacts?${qs}` : "/contacts");
  }

  const entityValue =
    entityId === "__global__" ? "__global__" : entityId;

  return (
    <FilterToolbar>
      <EntityFilterSelect
        entities={entities}
        value={entityValue}
        pathname="/contacts"
        currentParams={currentParams}
        preserveParams={["type", "active", "followUp"]}
        allowGlobal
      />
      <UrlFilterSelect
        label="Type"
        paramKey="type"
        value={typeParam ?? "all"}
        options={typeOptions}
        pathname="/contacts"
        currentParams={currentParams}
        preserveParams={["entity", "active", "followUp"]}
        omitWhenValue="all"
        triggerClassName="min-w-[11rem]"
      />
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Status</Label>
        <Select value={statusValue} onValueChange={handleStatusChange}>
          <SelectTrigger size="sm" className="min-w-[10rem]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </FilterToolbar>
  );
}
