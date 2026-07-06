"use client";

import { useRouter } from "next/navigation";
import type { EntityOption } from "@/components/platform/entity-select";
import type { SearchParamMap } from "@/components/platform/url-filter-select";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const ALL_ENTITIES_VALUE = "__all__";
const GLOBAL_ENTITY_VALUE = "__global__";

export function EntityFilterSelect({
  entities,
  value,
  pathname,
  currentParams,
  preserveParams = [],
  allowAll = true,
  allLabel = "All entities",
  allowGlobal = false,
  globalLabel = "Global",
  className,
  triggerClassName,
}: {
  entities: EntityOption[];
  value?: string;
  pathname: string;
  currentParams: SearchParamMap;
  preserveParams?: string[];
  allowAll?: boolean;
  allLabel?: string;
  allowGlobal?: boolean;
  globalLabel?: string;
  className?: string;
  triggerClassName?: string;
}) {
  const router = useRouter();

  if (entities.length <= 1 && !allowGlobal) {
    return null;
  }

  const selectValue =
    value === GLOBAL_ENTITY_VALUE
      ? GLOBAL_ENTITY_VALUE
      : value ?? (allowAll ? ALL_ENTITIES_VALUE : entities[0]?.id ?? "");

  function handleChange(nextValue: string) {
    const params = new URLSearchParams();

    for (const key of preserveParams) {
      const existing = currentParams[key];
      if (existing) params.set(key, existing);
    }

    if (nextValue === ALL_ENTITIES_VALUE) {
      // omit entity param
    } else if (nextValue === GLOBAL_ENTITY_VALUE) {
      params.set("entity", "global");
    } else {
      params.set("entity", nextValue);
    }

    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs text-muted-foreground">Entity</Label>
      <Select value={selectValue} onValueChange={handleChange}>
        <SelectTrigger size="sm" className={cn("min-w-[10rem]", triggerClassName)}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {allowAll ? <SelectItem value={ALL_ENTITIES_VALUE}>{allLabel}</SelectItem> : null}
          {allowGlobal ? <SelectItem value={GLOBAL_ENTITY_VALUE}>{globalLabel}</SelectItem> : null}
          {entities.map((entity) => (
            <SelectItem key={entity.id} value={entity.id}>
              {entity.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
