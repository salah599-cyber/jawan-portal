"use client";

import type { ReportDefinition } from "@/lib/reports/types";
import { EntitySelect, type EntityOption } from "@/components/platform/entity-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ReportFilters({
  report,
  entities,
  entityId,
  fromDate,
  toDate,
  onEntityChange,
  onFromDateChange,
  onToDateChange,
}: {
  report: ReportDefinition;
  entities: EntityOption[];
  entityId: string;
  fromDate: string;
  toDate: string;
  onEntityChange: (value: string) => void;
  onFromDateChange: (value: string) => void;
  onToDateChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {report.supportsEntityFilter && entities.length > 0 ? (
        <div className="space-y-2">
          <Label>Entity</Label>
          <EntitySelect
            entities={entities}
            value={entityId}
            onValueChange={onEntityChange}
            allowAdd={false}
            allowNone
            noneLabel="All entities"
            placeholder="All entities"
          />
        </div>
      ) : null}

      {report.supportsDateRange ? (
        <>
          <div className="space-y-2">
            <Label htmlFor="fromDate">From</Label>
            <Input
              id="fromDate"
              type="date"
              value={fromDate}
              onChange={(e) => onFromDateChange(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="toDate">To</Label>
            <Input
              id="toDate"
              type="date"
              value={toDate}
              onChange={(e) => onToDateChange(e.target.value)}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
