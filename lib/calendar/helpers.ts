import type { CalendarItem, CalendarItemKind } from "@/lib/calendar/types";
import type { ModuleName } from "@/lib/permissions/types";
import { resolveItemStatus, resolveSeverity } from "@/lib/calendar/status";

export function buildSystemItem(input: {
  id: string;
  kind: CalendarItemKind;
  module: ModuleName;
  title: string;
  subtitle?: string;
  date: Date;
  href: string;
  entityId?: string | null;
  entityName?: string | null;
}): CalendarItem {
  return {
    id: input.id,
    source: "SYSTEM",
    kind: input.kind,
    module: input.module,
    title: input.title,
    subtitle: input.subtitle,
    date: input.date,
    href: input.href,
    entityId: input.entityId,
    entityName: input.entityName,
    severity: resolveSeverity(input.date),
    status: resolveItemStatus(input.date),
  };
}
