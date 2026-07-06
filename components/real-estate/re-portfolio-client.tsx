"use client";

import { useState } from "react";
import { LayoutGrid, Table2 } from "lucide-react";
import { EntityFilterSelect } from "@/components/platform/entity-filter-select";
import { FilterToolbar } from "@/components/platform/filter-toolbar";
import { RePortfolioSummaryCards } from "@/components/real-estate/re-portfolio-summary-cards";
import { RePropertyCardGrid } from "@/components/real-estate/re-property-card-grid";
import { RePropertyTable } from "@/components/real-estate/re-property-table";
import { ReAlertsBanner } from "@/components/real-estate/re-alerts-banner";
import type { RePropertyListRow, RePortfolioSummary } from "@/lib/data/real-estate";
import type { ReAlert } from "@/lib/real-estate/alerts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RE_PROPERTY_STATUS_LABELS,
  RE_PROPERTY_TYPE_LABELS,
} from "@/lib/labels";
import { OMAN_GOVERNORATES } from "@/lib/real-estate/constants";

export function RePortfolioClient({
  properties,
  summary,
  alerts,
  canEdit,
  entities,
  entityId,
}: {
  properties: RePropertyListRow[];
  summary: RePortfolioSummary;
  alerts: ReAlert[];
  canEdit: boolean;
  entities: { id: string; name: string }[];
  entityId?: string;
}) {
  const [view, setView] = useState<"cards" | "table">("cards");

  return (
    <div className="space-y-4">
      <FilterToolbar>
        <EntityFilterSelect
          entities={entities}
          value={entityId}
          pathname="/real-estate"
          currentParams={{ entity: entityId }}
          allowAll={false}
        />
      </FilterToolbar>

      <RePortfolioSummaryCards summary={summary} />

      {alerts.length > 0 ? <ReAlertsBanner alerts={alerts} /> : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <form className="flex flex-wrap items-center gap-2" method="get">
          {entityId ? <input type="hidden" name="entity" value={entityId} /> : null}
          <Input name="search" placeholder="Search properties…" className="w-48" />
          <Select name="governorate">
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Governorate" />
            </SelectTrigger>
            <SelectContent>
              {OMAN_GOVERNORATES.map((g) => (
                <SelectItem key={g} value={g}>
                  {g}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select name="propertyType">
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(RE_PROPERTY_TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select name="status">
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(RE_PROPERTY_STATUS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="submit" variant="secondary" size="sm">
            Filter
          </Button>
        </form>

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant={view === "cards" ? "default" : "outline"}
            size="icon"
            onClick={() => setView("cards")}
            aria-label="Card view"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant={view === "table" ? "default" : "outline"}
            size="icon"
            onClick={() => setView("table")}
            aria-label="Table view"
          >
            <Table2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {view === "cards" ? (
        <RePropertyCardGrid properties={properties} />
      ) : (
        <RePropertyTable properties={properties} canEdit={canEdit} />
      )}
    </div>
  );
}
