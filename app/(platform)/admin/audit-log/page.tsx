import { PlatformHeader } from "@/components/platform/platform-header";
import { AuditLogFilters } from "@/components/admin/audit-log-filters";
import { AuditLogTable } from "@/components/admin/audit-log-table";
import { ServerPagination } from "@/components/platform/server-pagination";
import { listAuditLogs } from "@/lib/data/audit-log";
import { requireModuleAccess } from "@/lib/permissions/access";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; action?: string; resource?: string; q?: string }>;
}) {
  await requireModuleAccess("AUDIT");
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);

  const { entries, total, pageCount, actions, resources } = await listAuditLogs({
    page,
    action: params.action,
    resource: params.resource,
    q: params.q,
  });

  return (
    <>
      <PlatformHeader title="Audit Log" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Audit Log</CardTitle>
            <CardDescription>
              {total} recorded {total === 1 ? "event" : "events"} across the platform.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <AuditLogFilters
              actions={actions}
              resources={resources}
              currentAction={params.action}
              currentResource={params.resource}
              currentQuery={params.q}
            />
            <AuditLogTable entries={entries} />
            <ServerPagination
              page={page}
              pageCount={pageCount}
              basePath="/admin/audit-log"
              params={{ action: params.action, resource: params.resource, q: params.q }}
            />
          </CardContent>
        </Card>
      </main>
    </>
  );
}
