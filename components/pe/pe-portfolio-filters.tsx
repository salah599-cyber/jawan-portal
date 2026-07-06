"use client";

import type { EntityOption } from "@/components/platform/entity-select";
import { EntityFilterSelect } from "@/components/platform/entity-filter-select";
import { FilterToolbar } from "@/components/platform/filter-toolbar";

export function PePortfolioFilters({
  entityId,
  entities,
}: {
  entityId?: string;
  entities: EntityOption[];
}) {
  return (
    <FilterToolbar>
      <EntityFilterSelect
        entities={entities}
        value={entityId}
        pathname="/portfolio/pe"
        currentParams={{ entity: entityId }}
        allowAll={false}
      />
    </FilterToolbar>
  );
}
