import { NextResponse } from "next/server";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { isAuthorizedCronRequest } from "@/lib/cron/verify";

const execFileAsync = promisify(execFile);

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const scripts = [
      "sync-pe-schema.cjs",
      "sync-public-markets-schema.cjs",
      "sync-real-estate-schema.cjs",
      "sync-asset-types-schema.cjs",
      "sync-cash-management-schema.cjs",
      "sync-calendar-schema.cjs",
      "sync-lp-fund-schema.cjs",
      "sync-insurance-schema.cjs",
      "sync-family-schema.cjs",
      "sync-contacts-schema.cjs",
      "sync-users-schema.cjs",
      "sync-precious-metals-schema.cjs",
      "sync-loan-schema.cjs",
      "sync-exit-roi-schema.cjs",
      "sync-exit-settlement-schema.cjs",
      "sync-transfer-letters-schema.cjs",
      "sync-file-download-request-schema.cjs",
    ].map((name) => path.join(process.cwd(), "scripts", name));

    const results = await Promise.all(
      scripts.map((script) =>
        execFileAsync("node", [script], { env: process.env, timeout: 120_000 }),
      ),
    );

    return NextResponse.json({
      ok: true,
      job: "sync-schema",
      stdout: results.map((r) => r.stdout.trim()).filter(Boolean).join("\n"),
      stderr:
        results
          .map((r) => r.stderr.trim())
          .filter(Boolean)
          .join("\n") || undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Schema sync failed";
    console.error("sync-schema cron failed:", error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
