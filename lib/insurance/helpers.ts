import type { InsurancePolicyStatus } from "@/lib/generated/prisma/client";

export function toNumber(value: { toString(): string } | number | null | undefined): number {
  if (value == null) return 0;
  const num = typeof value === "number" ? value : parseFloat(value.toString());
  return Number.isNaN(num) ? 0 : num;
}

export function parseDecimal(value: string | null | undefined): number | null {
  if (value == null || value.trim() === "") return null;
  const num = parseFloat(value);
  return Number.isNaN(num) ? null : num;
}

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

export function resolvePolicyStatus(
  storedStatus: InsurancePolicyStatus | string,
  expiryDate: Date | null | undefined,
): InsurancePolicyStatus | "EXPIRED" {
  if (storedStatus === "CANCELLED") return "CANCELLED";
  if (expiryDate && startOfDay(expiryDate) < startOfDay(new Date())) {
    return "EXPIRED";
  }
  return storedStatus as InsurancePolicyStatus;
}

export function isExpiringWithinDays(expiryDate: Date | null | undefined, days: number): boolean {
  if (!expiryDate) return false;
  const now = startOfDay(new Date());
  const limit = new Date(now);
  limit.setDate(limit.getDate() + days);
  const expiry = startOfDay(expiryDate);
  return expiry >= now && expiry <= limit;
}

export function getLinkedAssetLabel(policy: {
  vehicle?: { name: string } | null;
  reProperty?: { name: string } | null;
  landParcel?: { name: string } | null;
  registeredCompany?: { name: string } | null;
}): string | null {
  if (policy.vehicle) return policy.vehicle.name;
  if (policy.reProperty) return policy.reProperty.name;
  if (policy.landParcel) return policy.landParcel.name;
  if (policy.registeredCompany) return policy.registeredCompany.name;
  return null;
}
