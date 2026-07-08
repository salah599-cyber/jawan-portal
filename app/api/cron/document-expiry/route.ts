import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit/log";

const EXPIRING_SOON_DAYS = 30;
const STATUSES_ELIGIBLE_FOR_TRANSITION = ["VALID", "PENDING", "UNDER_REVIEW", "EXPIRING_SOON"] as const;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const soonHorizon = new Date(now);
  soonHorizon.setDate(soonHorizon.getDate() + EXPIRING_SOON_DAYS);

  const expiredResult = await db.document.updateMany({
    where: {
      expiryDate: { lt: now },
      status: { in: [...STATUSES_ELIGIBLE_FOR_TRANSITION] },
    },
    data: { status: "EXPIRED" },
  });

  const expiringSoonResult = await db.document.updateMany({
    where: {
      expiryDate: { gte: now, lte: soonHorizon },
      status: { in: ["VALID", "PENDING", "UNDER_REVIEW"] },
    },
    data: { status: "EXPIRING_SOON" },
  });

  if (expiredResult.count > 0 || expiringSoonResult.count > 0) {
    await logAudit({
      action: "CRON_DOCUMENT_EXPIRY",
      resource: "Document",
      metadata: { expiredCount: expiredResult.count, expiringSoonCount: expiringSoonResult.count },
    });
  }

  return NextResponse.json({
    ok: true,
    job: "document-expiry",
    expiredCount: expiredResult.count,
    expiringSoonCount: expiringSoonResult.count,
  });
}
