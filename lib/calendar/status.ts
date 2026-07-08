import type { CalendarItemStatus, CalendarItemSeverity } from "@/lib/calendar/types";

const DAY_MS = 1000 * 60 * 60 * 24;

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function daysUntil(date: Date, now = new Date()): number {
  const today = startOfDay(now);
  const target = startOfDay(date);
  return Math.ceil((target.getTime() - today.getTime()) / DAY_MS);
}

export function resolveItemStatus(date: Date, now = new Date()): CalendarItemStatus {
  const diff = daysUntil(date, now);
  if (diff < 0) return "OVERDUE";
  if (diff === 0) return "DUE_TODAY";
  return "UPCOMING";
}

export function resolveSeverity(date: Date, now = new Date()): CalendarItemSeverity {
  const diff = daysUntil(date, now);
  if (diff < 0) return "danger";
  if (diff <= 7) return "warning";
  return "info";
}

export function isWithinHorizon(date: Date, horizonDays: number, now = new Date()): boolean {
  return daysUntil(date, now) <= horizonDays;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
