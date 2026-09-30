import { describe, expect, it } from "vitest";
import { formatSecurityAlert } from "@/lib/auth/security-alert";

describe("formatSecurityAlert", () => {
  it("escapes attacker-controlled location text", () => {
    const message = formatSecurityAlert({
      event: "session.created",
      userId: "user_123",
      email: "admin@jawaninvest.com",
      sessionId: "sess_123",
      ipAddress: "203.0.113.10",
      city: '<script>alert("x")</script>',
      country: "OM",
    });

    expect(message.html).not.toContain("<script>");
    expect(message.html).toContain("&lt;script&gt;");
    expect(message.subject).toBe("Clerk sign-in");
  });
});
