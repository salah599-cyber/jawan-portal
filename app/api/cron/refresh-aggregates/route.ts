import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit/log";
import { isAuthorizedCronRequest } from "@/lib/cron/verify";

const SOON_DAYS = 30;
const CHEQUE_SOON_DAYS = 7;

/**
 * The platform currently computes net worth, reports, and dashboard reminders
 * live from source tables rather than persisted aggregate/cache rows, so
 * there is nothing to "warm" ahead of the other daily crons. Instead this job
 * builds a cross-module attention digest and records it in the audit trail
 * as a lightweight daily snapshot — a natural hook point for wiring in email
 * or Slack notifications later without changing the other cron jobs.
 */
export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const soonHorizon = new Date(now);
  soonHorizon.setDate(soonHorizon.getDate() + SOON_DAYS);
  const chequeHorizon = new Date(now);
  chequeHorizon.setDate(chequeHorizon.getDate() + CHEQUE_SOON_DAYS);

  const [expiringDocuments, expiringVehicles, expiringCompanies, dueCheques, maturingLoans, overdueExpenses] =
    await Promise.all([
      db.document.count({ where: { expiryDate: { lte: soonHorizon } } }),
      db.vehicle.count({
        where: {
          OR: [
            { registrationExpiryDate: { lte: soonHorizon } },
            { insuranceExpiryDate: { lte: soonHorizon } },
          ],
        },
      }),
      db.registeredCompany.count({ where: { registrationExpiryDate: { lte: soonHorizon } } }),
      db.cheque.count({
        where: { status: { in: ["PENDING", "DEPOSITED"] }, dueDate: { lte: chequeHorizon }, deletedAt: null },
      }),
      db.liability.count({ where: { status: "ACTIVE", maturityDate: { lte: soonHorizon } } }),
      db.expense.count({ where: { status: { in: ["PENDING", "OVERDUE"] }, dueDate: { lt: now } } }),
    ]);

  const digest = {
    expiringDocuments,
    expiringVehicles,
    expiringCompanies,
    dueCheques,
    maturingLoans,
    overdueExpenses,
    totalNeedingAttention:
      expiringDocuments + expiringVehicles + expiringCompanies + dueCheques + maturingLoans + overdueExpenses,
  };

  await logAudit({
    action: "CRON_DAILY_DIGEST",
    resource: "SYSTEM_DIGEST",
    metadata: digest,
  });

  return NextResponse.json({ ok: true, job: "refresh-aggregates", ...digest });
}
