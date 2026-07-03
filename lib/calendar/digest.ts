import { db } from "@/lib/db";
import { ensureCalendarSchema } from "@/lib/db/ensure-calendar-schema";
import { KIND_LABELS } from "@/lib/calendar/date-ranges";
import { getTodayView } from "@/lib/data/calendar";
import { sendEmail } from "@/lib/email/resend";
import { canAccess, getUserContextById } from "@/lib/permissions/access";
import { formatDate } from "@/lib/format";

function buildDigestHtml(name: string, overdue: number, dueToday: number, upcoming: number, items: Awaited<ReturnType<typeof getTodayView>>) {
  const sections = [
    { title: "Overdue", items: items.overdue },
    { title: "Due today", items: items.dueToday },
    { title: "Upcoming (7 days)", items: items.upcoming.slice(0, 10) },
  ];

  const sectionHtml = sections
    .filter((section) => section.items.length > 0)
    .map(
      (section) => `
        <h3 style="margin:16px 0 8px;font-size:14px;">${section.title}</h3>
        <ul style="margin:0;padding-left:18px;">
          ${section.items
            .map(
              (item) =>
                `<li style="margin-bottom:6px;"><strong>${item.title}</strong> — ${formatDate(item.date)} · ${KIND_LABELS[item.kind] ?? item.kind}</li>`,
            )
            .join("")}
        </ul>`,
    )
    .join("");

  return `
    <div style="font-family:Arial,sans-serif;color:#111;max-width:640px;">
      <h2 style="margin:0 0 8px;">Daily calendar digest</h2>
      <p style="margin:0 0 16px;color:#555;">Hello ${name}, here is your operational summary.</p>
      <p style="margin:0 0 16px;"><strong>${overdue}</strong> overdue · <strong>${dueToday}</strong> due today · <strong>${upcoming}</strong> upcoming</p>
      ${sectionHtml || "<p>Nothing needs attention today.</p>"}
      <p style="margin-top:24px;"><a href="${process.env.NEXT_PUBLIC_APP_URL ?? ""}/calendar">Open calendar</a></p>
    </div>
  `;
}

export async function sendCalendarDigests() {
  await ensureCalendarSchema();

  const users = await db.user.findMany({
    where: { isActive: true },
    select: { id: true, email: true, firstName: true, lastName: true },
  });

  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const user of users) {
    const ctx = await getUserContextById(user.id);
    if (!ctx || !canAccess(ctx, "CALENDAR")) {
      skipped += 1;
      continue;
    }

    const view = await getTodayView(ctx);
    const total = view.counts.overdue + view.counts.dueToday + view.counts.upcoming;
    if (total === 0) {
      skipped += 1;
      continue;
    }

    const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.email;

    try {
      const result = await sendEmail({
        to: user.email,
        subject: `Calendar digest — ${view.counts.overdue} overdue, ${view.counts.dueToday} due today`,
        html: buildDigestHtml(
          name,
          view.counts.overdue,
          view.counts.dueToday,
          view.counts.upcoming,
          view,
        ),
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
