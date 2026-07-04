import { parseDate } from "@/lib/family/helpers";
import type { SuccessionPlanStatus } from "@/lib/generated/prisma/client";

export { parseDate, parseDecimal } from "@/lib/family/helpers";

export function isReviewDue(nextReviewDate: Date | null | undefined): boolean {
  if (!nextReviewDate) return false;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const review = new Date(nextReviewDate);
  review.setHours(0, 0, 0, 0);
  return review <= now;
}

export function resolvePlanStatus(
  storedStatus: SuccessionPlanStatus | string,
  nextReviewDate: Date | null | undefined,
): SuccessionPlanStatus | "REVIEW_DUE" {
  if (storedStatus === "COMPLETE") return "COMPLETE";
  if (isReviewDue(nextReviewDate)) return "REVIEW_DUE";
  return storedStatus as SuccessionPlanStatus;
}

export function getChecklistCompletionPct(items: { isComplete: boolean }[]): number {
  if (items.length === 0) return 0;
  const complete = items.filter((item) => item.isComplete).length;
  return Math.round((complete / items.length) * 100);
}

export function getDistributionTargetLabel(instruction: {
  entity?: { name: string } | null;
  asset?: { name: string } | null;
  landParcel?: { name: string } | null;
  registeredCompany?: { name: string } | null;
  reProperty?: { name: string } | null;
  vehicle?: { name: string } | null;
}): string {
  if (instruction.asset) return instruction.asset.name;
  if (instruction.landParcel) return instruction.landParcel.name;
  if (instruction.registeredCompany) return instruction.registeredCompany.name;
  if (instruction.reProperty) return instruction.reProperty.name;
  if (instruction.vehicle) return instruction.vehicle.name;
  if (instruction.entity) return instruction.entity.name;
  return "—";
}

export const DEFAULT_SUCCESSION_CHECKLIST = [
  { label: "Will drafted and reviewed by counsel", category: "Legal Documents" },
  { label: "Will signed and witnessed", category: "Legal Documents" },
  { label: "Trust deed executed (if applicable)", category: "Legal Documents" },
  { label: "Letter of wishes documented", category: "Legal Documents" },
  { label: "Power of attorney in place", category: "Legal Documents" },
  { label: "Executor(s) confirmed and informed", category: "Appointments" },
  { label: "Trustee(s) confirmed and informed", category: "Appointments" },
  { label: "Guardian(s) designated for minor children", category: "Appointments" },
  { label: "Asset register updated with beneficiary designations", category: "Distribution" },
  { label: "Insurance beneficiary forms updated", category: "Distribution" },
  { label: "Annual estate plan review scheduled", category: "Review" },
];
