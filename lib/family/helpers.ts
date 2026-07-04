import type { FamilyKycStatus } from "@/lib/generated/prisma/client";

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

export function isExpiringWithinDays(expiryDate: Date | null | undefined, days: number): boolean {
  if (!expiryDate) return false;
  const now = startOfDay(new Date());
  const limit = new Date(now);
  limit.setDate(limit.getDate() + days);
  const expiry = startOfDay(expiryDate);
  return expiry >= now && expiry <= limit;
}

export function isExpired(expiryDate: Date | null | undefined): boolean {
  if (!expiryDate) return false;
  return startOfDay(expiryDate) < startOfDay(new Date());
}

export function resolveKycStatus(
  storedStatus: FamilyKycStatus | string,
  idExpiryDate: Date | null | undefined,
): FamilyKycStatus | "EXPIRED" {
  if (idExpiryDate && isExpired(idExpiryDate)) return "EXPIRED";
  return storedStatus as FamilyKycStatus;
}

export function getStakeTargetLabel(stake: {
  entity?: { name: string } | null;
  asset?: { name: string } | null;
  landParcel?: { name: string } | null;
  registeredCompany?: { name: string } | null;
  reProperty?: { name: string } | null;
  vehicle?: { name: string } | null;
}): string {
  if (stake.asset) return stake.asset.name;
  if (stake.landParcel) return stake.landParcel.name;
  if (stake.registeredCompany) return stake.registeredCompany.name;
  if (stake.reProperty) return stake.reProperty.name;
  if (stake.vehicle) return stake.vehicle.name;
  if (stake.entity) return stake.entity.name;
  return "—";
}

export function getDesignationTargetLabel(designation: {
  insurancePolicy?: { policyNumber: string; insurer: string } | null;
  asset?: { name: string } | null;
  landParcel?: { name: string } | null;
  registeredCompany?: { name: string } | null;
  reProperty?: { name: string } | null;
  vehicle?: { name: string } | null;
}): string {
  if (designation.insurancePolicy) {
    return `${designation.insurancePolicy.insurer} — ${designation.insurancePolicy.policyNumber}`;
  }
  if (designation.asset) return designation.asset.name;
  if (designation.landParcel) return designation.landParcel.name;
  if (designation.registeredCompany) return designation.registeredCompany.name;
  if (designation.reProperty) return designation.reProperty.name;
  if (designation.vehicle) return designation.vehicle.name;
  return "—";
}
