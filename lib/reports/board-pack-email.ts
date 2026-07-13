import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email/resend";
import { formatDate } from "@/lib/format";
import { canAccess, getUserContextById } from "@/lib/permissions/access";
import { buildBoardPackReport } from "@/lib/reports/builders/board-pack";
import type { ReportResult } from "@/lib/reports/types";

function buildBoardPackHtml(name: string, result: ReportResult) {
  const metrics = result.metrics
    .map(
      (metric) => `
        <td style="padding:12px;border:1px solid #e5e7eb;vertical-align:top;">
          <div style="font-size:12px;color:#6b7280;">${metric.label}</div>
          <div style="font-size:20px;font-weight:600;margin-top:4px;">${metric.value}</div>
          ${metric.detail ? `<div style="font-size:11px;color:#9ca3af;margin-top:4px;">${metric.detail}</div>` : ""}
        </td>`,
    )
    .join("");

  const scorecardRows = result.rows
    .map(
      (row) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #f3f4f6;">${row.section ?? ""}</td>
        <td style="padding:8px;border-bottom:1px solid #f3f4f6;">${row.metric ?? ""}</td>
        <td style="padding:8px;border-bottom:1px solid #f3f4f6;text-align:right;">${row.value ?? "—"}</td>
      </tr>`,
    )
    .join("");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  return `
    <div style="font-family:Arial,sans-serif;color:#111;max-width:720px;">
      <h2 style="margin:0 0 8px;">Monthly Board Pack</h2>
      <p style="margin:0 0 16px;color:#555;">Hello ${name}, here is the latest executive portfolio summary.</p>
      <p style="margin:0 0 16px;font-size:12px;color:#6b7280;">
        Generated ${formatDate(result.generatedAt)}
        ${result.entityName ? ` · ${result.entityName}` : ""}
      </p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        <tr>${metrics}</tr>
      </table>
      <h3 style="margin:0 0 8px;font-size:14px;">Scorecard</h3>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>
          <tr>
            <th style="text-align:left;padding:8px;border-bottom:2px solid #e5e7eb;">Section</th>
            <th style="text-align:left;padding:8px;border-bottom:2px solid #e5e7eb;">Metric</th>
            <th style="text-align:right;padding:8px;border-bottom:2px solid #e5e7eb;">Value</th>
          </tr>
        </thead>
        <tbody>${scorecardRows}</tbody>
      </table>
      <p style="margin-top:24px;">
        <a href="${appUrl}/reports/board-pack">Open full Board Pack</a>
      </p>
    </div>
  `;
}

/**
 * Emails the Monthly Board Pack to users with REPORTS access.
 * Intended for the first day of each month via cron.
 */
export async function sendMonthlyBoardPacks() {
  const users = await db.user.findMany({
    where: { isActive: true },
    select: { id: true, email: true, firstName: true, lastName: true },
  });

  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const user of users) {
    const ctx = await getUserContextById(user.id);
    if (!ctx || !canAccess(ctx, "REPORTS") || !canAccess(ctx, "ASSETS")) {
      skipped += 1;
      continue;
    }

    const name =
      [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.email;

    try {
      const pack = await buildBoardPackReport(ctx, {});
      const result = await sendEmail({
        to: user.email,
        subject: `Monthly Board Pack — ${formatDate(pack.generatedAt)}`,
        html: buildBoardPackHtml(name, pack),
      });
      if (result.sent) sent += 1;
      else skipped += 1;
    } catch (error) {
      errors.push(
        `${user.email}: ${error instanceof Error ? error.message : "send failed"}`,
      );
    }
  }

  return { sent, skipped, errors };
}
