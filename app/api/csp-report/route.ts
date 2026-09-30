import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_REPORT_BYTES = 8192;

function truncate(value: unknown) {
  if (typeof value !== "string") return undefined;
  return value.slice(0, 300);
}

function summarize(body: unknown) {
  const report =
    body && typeof body === "object" && "csp-report" in body
      ? (body as { "csp-report"?: unknown })["csp-report"]
      : body;

  if (!report || typeof report !== "object") return null;

  const record = report as Record<string, unknown>;
  return {
    documentUri: truncate(record["document-uri"] ?? record.documentURL),
    violatedDirective: truncate(record["violated-directive"] ?? record.effectiveDirective),
    blockedUri: truncate(record["blocked-uri"] ?? record.blockedURL),
    disposition: truncate(record.disposition),
  };
}

export async function POST(request: Request) {
  const raw = await request.text();
  if (raw.length > MAX_REPORT_BYTES) {
    return new NextResponse(null, { status: 204 });
  }

  try {
    const summary = summarize(JSON.parse(raw));
    if (summary) {
      console.info("CSP violation", summary);
    }
  } catch {
    // Ignore malformed reports. The browser does not need an error body.
  }

  return new NextResponse(null, { status: 204 });
}
