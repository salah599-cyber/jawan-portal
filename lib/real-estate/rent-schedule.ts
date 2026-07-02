import type {
  ReLease,
  RePaymentFrequency,
  RePaymentMethod,
} from "@/lib/generated/prisma/client";
import {
  addMonths,
  formatPeriodLabel,
  frequencyMonths,
  startOfMonth,
} from "@/lib/real-estate/helpers";

export type PdcChequeEntry = {
  chequeNumber: string;
  amount: number;
  dueDate: string;
  bank?: string;
};

export type RentScheduleEntry = {
  dueDate: Date;
  amountOmr: string;
  periodLabel: string;
  pdcChequeNumber?: string;
  pdcBank?: string;
  pdcStatus?: "PENDING";
};

export function generateRentScheduleForLease(lease: {
  leaseStartDate: Date;
  leaseEndDate: Date;
  rentAmountOmr: { toString(): string } | number;
  paymentFrequency: RePaymentFrequency;
  paymentMethod: RePaymentMethod;
  pdcBank?: string | null;
  pdcChequeNumbers?: unknown;
}): RentScheduleEntry[] {
  const entries: RentScheduleEntry[] = [];
  const rentAmount = lease.rentAmountOmr.toString();
  const stepMonths = frequencyMonths(lease.paymentFrequency);
  let cursor = startOfMonth(new Date(lease.leaseStartDate));
  const end = new Date(lease.leaseEndDate);

  const pdcList = Array.isArray(lease.pdcChequeNumbers)
    ? (lease.pdcChequeNumbers as PdcChequeEntry[])
    : [];
  let pdcIndex = 0;

  while (cursor <= end) {
    const dueDate = new Date(cursor);
    const pdc = pdcList[pdcIndex];
    entries.push({
      dueDate,
      amountOmr: rentAmount,
      periodLabel: formatPeriodLabel(dueDate, lease.paymentFrequency),
      ...(lease.paymentMethod === "PDC"
        ? {
            pdcChequeNumber: pdc?.chequeNumber,
            pdcBank: pdc?.bank ?? lease.pdcBank ?? undefined,
            pdcStatus: "PENDING" as const,
          }
        : {}),
    });
    cursor = addMonths(cursor, stepMonths);
    pdcIndex += 1;
  }

  return entries;
}

export function computeLeaseDurationMonths(leaseStartDate: Date, leaseEndDate: Date) {
  const start = new Date(leaseStartDate);
  const end = new Date(leaseEndDate);
  return (
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth()) +
    1
  );
}

export async function refreshRentScheduleStatuses(now = new Date()) {
  const { db } = await import("@/lib/db");
  const overdue = await db.reRentSchedule.findMany({
    where: {
      paymentStatus: { in: ["PENDING", "PARTIALLY_PAID"] },
      dueDate: { lt: now },
    },
    select: { id: true },
  });

  if (overdue.length === 0) return;

  await db.reRentSchedule.updateMany({
    where: { id: { in: overdue.map((row) => row.id) } },
    data: { paymentStatus: "OVERDUE" },
  });
}
