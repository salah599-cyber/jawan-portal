import { PlatformHeader } from "@/components/platform/platform-header";
import { AddLinkButton } from "@/components/platform/add-link-button";
import { SuccessionPlansTable } from "@/components/succession/succession-plans-table";
import { SuccessionSummaryCards } from "@/components/succession/succession-summary-cards";
import { SuccessionDisclaimer } from "@/components/succession/succession-disclaimer";
import { SuccessionFilters } from "@/components/succession/succession-filters";
import { listSuccessionPlans } from "@/lib/actions/succession";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SuccessionPlansPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const ctx = await requireModuleAccess("SUCCESSION");

  const plans = await listSuccessionPlans({ status });
  const canEdit = canWrite(ctx, "SUCCESSION");

  return (
    <>
      <PlatformHeader title="Succession & Estate Planning" />
      <div className="space-y-4">
        <SuccessionDisclaimer />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Estate Planning Dashboard</h2>
            <p className="text-sm text-muted-foreground">
              Structured record of succession intentions, legal documentation status, and review schedule.
            </p>
          </div>
          {canEdit ? <AddLinkButton href="/family/succession/new" label="New Plan" /> : null}
        </div>

        <SuccessionSummaryCards plans={plans} />

        <SuccessionFilters status={status} currentParams={{ status }} />

        <Card>
          <CardHeader>
            <CardTitle>Succession Plans</CardTitle>
            <CardDescription>{plans.length} plan{plans.length === 1 ? "" : "s"} on record</CardDescription>
          </CardHeader>
          <CardContent>
            <SuccessionPlansTable plans={plans} canEdit={canEdit} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
