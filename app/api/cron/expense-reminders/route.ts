import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit/log";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  const overdueResult = await db.expense.updateMany({
    where: {
      status: "PENDING",
      dueDate: { lt: now },
    },
    data: { status: "OVERDUE" },
  });

  const upcomingCount = await db.expense.count({
    where: {
      status: { in: ["PENDING", "OVERDUE"] },
      dueDate: { not: null },
    },
  });

  if (overdueResult.count > 0) {
    await logAudit({
      action: "CRON_EXPENSE_REMINDERS",
      resource: "Expense",
      metadata: { newlyOverdueCount: overdueResult.count, outstandingCount: upcomingCount },
    });
  }

  return NextResponse.json({
    ok: true,
    job: "expense-reminders",
    newlyOverdueCount: overdueResult.count,
    outstandingCount: upcomingCount,
  });
}
