import type { ReportDefinition } from "@/lib/reports/types";
import { ReportCard } from "@/components/reports/report-card";

export function ReportCatalog({
  groups,
}: {
  groups: Array<{
    category: string;
    label: string;
    reports: ReportDefinition[];
  }>;
}) {
  if (groups.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No reports are available for your role. Contact an administrator if you need access.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {groups.map((group) => (
        <section key={group.category} className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">{group.label}</h2>
            <p className="text-sm text-muted-foreground">
              {group.reports.length} report{group.reports.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {group.reports.map((report) => (
              <ReportCard key={report.id} report={report} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
