import { PlatformHeader } from "@/components/platform/platform-header";
import { ReportCatalog } from "@/components/reports/report-catalog";
import { getReportsCatalog } from "@/lib/data/reports";
import { requireModuleAccess } from "@/lib/permissions/access";

export default async function ReportsPage() {
  const ctx = await requireModuleAccess("REPORTS");
  const catalog = await getReportsCatalog(ctx);

  return (
    <>
      <PlatformHeader title="Reports" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <div>
          <h2 className="text-lg font-semibold">Report Library</h2>
          <p className="text-sm text-muted-foreground">
            Generate net worth, portfolio, operational, and register reports. Preview on screen,
            export to Excel or CSV, or print to PDF.
          </p>
        </div>
        <ReportCatalog groups={catalog} />
      </main>
    </>
  );
}
