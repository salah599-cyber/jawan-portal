import type { CalendarItem, CalendarFilters } from "@/lib/calendar/types";
import { getSystemCalendarItems } from "@/lib/calendar/providers";

export function filterCalendarItems(
  items: CalendarItem[],
  filters: CalendarFilters = {},
): CalendarItem[] {
  const { entityId, start, end } = filters;

  return items.filter((item) => {
    if (entityId && item.entityId !== entityId) return false;
    if (start && item.date < start) return false;
    if (end && item.date > end) return false;
    return true;
  });
}

export async function aggregateCalendarItems(
  systemItems: CalendarItem[],
  manualItems: CalendarItem[],
  filters: CalendarFilters = {},
): Promise<CalendarItem[]> {
  const merged = [...systemItems, ...manualItems].sort(
    (a, b) => a.date.getTime() - b.date.getTime(),
  );
  return filterCalendarItems(merged, filters);
}

export async function loadSystemCalendarItems(
  ctx: Parameters<typeof getSystemCalendarItems>[0],
  filters?: CalendarFilters,
) {
  const items = await getSystemCalendarItems(ctx);
  return filterCalendarItems(items, filters);
}
