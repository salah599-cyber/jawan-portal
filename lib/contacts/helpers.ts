export function parseDate(value: string | null | undefined): Date | null {
  if (!value?.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function isFollowUpDueWithinDays(
  followUpDate: Date | null | undefined,
  days: number,
): boolean {
  if (!followUpDate) return false;
  const now = startOfDay(new Date());
  const limit = new Date(now);
  limit.setDate(limit.getDate() + days);
  const followUp = startOfDay(followUpDate);
  return followUp <= limit;
}

export function isFollowUpOverdue(followUpDate: Date | null | undefined): boolean {
  if (!followUpDate) return false;
  return startOfDay(followUpDate) < startOfDay(new Date());
}

export function parseTags(value: string | null | undefined): string[] {
  if (!value?.trim()) return [];
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function formatTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  return tags.filter((tag): tag is string => typeof tag === "string" && tag.trim().length > 0);
}
