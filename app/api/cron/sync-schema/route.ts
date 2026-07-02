import { NextResponse } from "next/server";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";

const execFileAsync = promisify(execFile);

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const peScript = path.join(process.cwd(), "scripts", "sync-pe-schema.cjs");
    const publicMarketsScript = path.join(process.cwd(), "scripts", "sync-public-markets-schema.cjs");

    const [peResult, publicMarketsResult] = await Promise.all([
      execFileAsync("node", [peScript], { env: process.env, timeout: 120_000 }),
      execFileAsync("node", [publicMarketsScript], { env: process.env, timeout: 120_000 }),
    ]);

    return NextResponse.json({
      ok: true,
      job: "sync-schema",
      stdout: [peResult.stdout, publicMarketsResult.stdout].map((s) => s.trim()).filter(Boolean).join("\n"),
      stderr: [peResult.stderr, publicMarketsResult.stderr]
        .map((s) => s.trim())
        .filter(Boolean)
        .join("\n") || undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Schema sync failed";
    console.error("sync-schema cron failed:", error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
