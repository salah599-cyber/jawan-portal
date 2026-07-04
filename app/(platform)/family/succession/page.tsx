import Link from "next/link";
import { PlatformHeader } from "@/components/platform/platform-header";
import { AddLinkButton } from "@/components/platform/add-link-button";
import { SuccessionPlansTable } from "@/components/succession/succession-plans-table";
import { SuccessionSummaryCards } from "@/components/succession/succession-summary-cards";
import { SuccessionDisclaimer } from "@/components/succession/succession-disclaimer";
import { listSuccessionPlans } from "@/lib/actions/succession";
import { SUCCESSION_PLAN_STATUS_LABELS } from "@/lib/labels";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { Button } from "@/components/ui/button";
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

  const buildHref = (nextStatus?: string) => {
    if (!nextStatus) return "/family/succession";
    return `/family/succession?status=${nextStatus}`;
  };

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

        <div className="flex flex-wrap gap-2">
          <Button variant={!status ? "default" : "outline"} size="sm" asChild>
            <Link href={buildHref()}>All</Link>
          </Button>
          {Object.entries(SUCCESSION_PLAN_STATUS_LABELS).map(([value, label]) => (
            <Button key={value} variant={status === value ? "default" : "outline"} size="sm" asChild>
              <Link href={buildHref(status === value ? undefined : value)}>{label}</Link>
            </Button>
          ))}
        </div>

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
