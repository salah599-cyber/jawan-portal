import { PlatformHeader } from "@/components/platform/platform-header";
import { ReportsContent } from "@/components/reports/reports-content";
import { getReportsSummary } from "@/lib/data/reports";
import { requireUserContext } from "@/lib/permissions/access";

export default async function ReportsPage() {
  const ctx = await requireUserContext();
  const summary = await getReportsSummary(ctx);

  return (
    <>
      <PlatformHeader title="Reports" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <ReportsContent summary={summary} />
      </main>
    </>
  );
}
