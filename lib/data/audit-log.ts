import { db } from "@/lib/db";

export const AUDIT_LOG_PAGE_SIZE = 50;

export type AuditLogFilters = {
  page?: number;
  action?: string;
  resource?: string;
  q?: string;
};

export async function listAuditLogs(filters: AuditLogFilters = {}) {
  const page = Math.max(1, filters.page ?? 1);
  const where: Record<string, unknown> = {};

  if (filters.action) where.action = filters.action;
  if (filters.resource) where.resource = filters.resource;
  if (filters.q) {
    where.OR = [
      { resourceId: { contains: filters.q, mode: "insensitive" } },
      { user: { email: { contains: filters.q, mode: "insensitive" } } },
      { user: { firstName: { contains: filters.q, mode: "insensitive" } } },
      { user: { lastName: { contains: filters.q, mode: "insensitive" } } },
    ];
  }

  const [entries, total, actions, resources] = await Promise.all([
    db.auditLog.findMany({
      where,
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * AUDIT_LOG_PAGE_SIZE,
      take: AUDIT_LOG_PAGE_SIZE,
    }),
    db.auditLog.count({ where }),
    db.auditLog.findMany({ distinct: ["action"], select: { action: true }, orderBy: { action: "asc" } }),
    db.auditLog.findMany({ distinct: ["resource"], select: { resource: true }, orderBy: { resource: "asc" } }),
  ]);

  return {
    entries,
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / AUDIT_LOG_PAGE_SIZE)),
    actions: actions.map((a) => a.action),
    resources: resources.map((r) => r.resource),
  };
}
