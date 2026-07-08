import { headers } from "next/headers";
import { db } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";

async function getRequestMetadata(): Promise<{ ipAddress?: string; userAgent?: string }> {
  try {
    const headersList = await headers();
    const forwardedFor = headersList.get("x-forwarded-for");
    const ipAddress =
      forwardedFor?.split(",")[0]?.trim() || headersList.get("x-real-ip") || undefined;
    const userAgent = headersList.get("user-agent") || undefined;
    return { ipAddress, userAgent };
  } catch {
    // Not every call site runs inside a request scope (e.g. cron jobs, scripts).
    return {};
  }
}

function isPlainObject(value: unknown): value is Record<string, Prisma.InputJsonValue> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function logAudit(input: {
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string;
}) {
  const needsAutoDetect = !input.ipAddress;
  const requestMeta = needsAutoDetect ? await getRequestMetadata() : {};
  const ipAddress = input.ipAddress ?? requestMeta.ipAddress;

  let metadata = input.metadata;
  if (requestMeta.userAgent) {
    metadata = isPlainObject(metadata)
      ? { ...metadata, userAgent: requestMeta.userAgent }
      : { userAgent: requestMeta.userAgent, ...(metadata !== undefined ? { value: metadata } : {}) };
  }

  await db.auditLog.create({
    data: {
      userId: input.userId,
      action: input.action,
      resource: input.resource,
      resourceId: input.resourceId,
      metadata,
      ipAddress,
    },
  });
}
