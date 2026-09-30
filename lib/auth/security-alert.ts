import { sendEmail } from "@/lib/email/resend";

const SECURITY_ALERT_EMAIL =
  process.env.SECURITY_ALERT_EMAIL?.trim() || "security@jawaninvest.com";

export type SecuritySessionAlert = {
  event: "session.created" | "session.revoked";
  userId: string;
  email?: string | null;
  sessionId: string;
  ipAddress?: string | null;
  city?: string | null;
  country?: string | null;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function line(label: string, value: string | null | undefined) {
  const safe = escapeHtml(value?.trim() || "unknown");
  return `<p><strong>${escapeHtml(label)}:</strong> ${safe}</p>`;
}

export function formatSecurityAlert(input: SecuritySessionAlert) {
  const subject =
    input.event === "session.revoked"
      ? "Clerk session revoked"
      : "Clerk sign-in";

  const html = [
    "<p>A Clerk session event was recorded for jawaninvest.com.</p>",
    line("Event", input.event),
    line("User", input.userId),
    line("Email", input.email),
    line("Session", input.sessionId),
    line("IP", input.ipAddress),
    line("Location", [input.city, input.country].filter(Boolean).join(", ") || null),
    "<p>Review this in the Clerk Dashboard activity log. This message is only sent to the security inbox.</p>",
  ].join("");

  return { subject, html };
}

export async function sendSecuritySessionAlert(input: SecuritySessionAlert) {
  const message = formatSecurityAlert(input);
  try {
    await sendEmail({
      to: SECURITY_ALERT_EMAIL,
      subject: message.subject,
      html: message.html,
    });
  } catch (error) {
    console.error("Security alert email failed:", error);
  }
}
