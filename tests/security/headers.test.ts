import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";

describe("security headers", () => {
  it("sends HSTS, clickjacking protection, and CSP reporting", async () => {
    const groups = await nextConfig.headers?.();
    const headers = groups?.[0]?.headers ?? [];
    const map = Object.fromEntries(headers.map((header) => [header.key, header.value]));

    expect(map["Strict-Transport-Security"]).toContain("max-age=63072000");
    expect(map["Strict-Transport-Security"]).toContain("includeSubDomains");
    expect(map["X-Frame-Options"]).toBe("DENY");
    expect(map["X-Content-Type-Options"]).toBe("nosniff");
    expect(map["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(map["Permissions-Policy"]).toContain("geolocation=()");
    expect(map["Content-Security-Policy"]).toContain("report-uri /api/csp-report");
    expect(map["Content-Security-Policy"]).toMatch(
      /accounts\.jawaninvest\.com|\*\.accounts\.dev/,
    );
    expect(map["Reporting-Endpoints"]).toContain("/api/csp-report");
  });
});