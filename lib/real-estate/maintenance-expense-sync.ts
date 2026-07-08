import type {
  ReExpensePaymentStatus,
  ReMaintenanceStatus,
} from "@/lib/generated/prisma/client";
import { db } from "@/lib/db";
import { toNumber } from "@/lib/real-estate/helpers";

export const MAINTENANCE_EXPENSE_NOTE_PREFIX = "maintenance:";

export function maintenanceExpenseNote(maintenanceId: string) {
  return `${MAINTENANCE_EXPENSE_NOTE_PREFIX}${maintenanceId}`;
}

type MaintenanceExpenseSource = {
  id: string;
  propertyId: string;
  unitId: string | null;
  status: ReMaintenanceStatus;
  description: string;
  completedDate: Date | null;
  reportedDate: Date;
  actualCostOmr: { toString(): string } | null;
  quotedCostOmr: { toString(): string } | null;
  invoiceNumber: string | null;
  contractorCompany: string | null;
  paidByOwner: boolean;
};

export async function syncMaintenanceExpenseRecord(maintenance: MaintenanceExpenseSource) {
  const note = maintenanceExpenseNote(maintenance.id);
  const existing = await db.rePropertyExpense.findFirst({
    where: { propertyId: maintenance.propertyId, notes: note },
  });

  if (maintenance.status !== "COMPLETED") {
    if (existing) {
      await db.rePropertyExpense.delete({ where: { id: existing.id } });
    }
    return null;
  }

  const amount = maintenance.actualCostOmr ?? maintenance.quotedCostOmr;
  if (!amount || toNumber(amount) <= 0) {
    if (existing) {
      await db.rePropertyExpense.delete({ where: { id: existing.id } });
    }
    return null;
  }

  const paymentStatus: ReExpensePaymentStatus = maintenance.paidByOwner ? "PAID" : "UNPAID";
  const expenseDate = maintenance.completedDate ?? maintenance.reportedDate;
  const data = {
    propertyId: maintenance.propertyId,
    unitId: maintenance.unitId,
    expenseDate,
    category: "MAINTENANCE" as const,
    description: `Maintenance: ${maintenance.description}`,
    amountOmr: amount.toString(),
    vendorName: maintenance.contractorCompany,
    invoiceNumber: maintenance.invoiceNumber,
    paymentStatus,
    paymentDate: maintenance.paidByOwner ? expenseDate : null,
    notes: note,
  };

  if (existing) {
    return db.rePropertyExpense.update({ where: { id: existing.id }, data });
  }

  return db.rePropertyExpense.create({ data });
}
