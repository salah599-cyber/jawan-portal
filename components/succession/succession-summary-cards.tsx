import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SuccessionPlanListRow } from "@/lib/actions/succession";

function SummaryMetric({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">{value}</p>
        {detail ? <p className="mt-1 text-xs text-muted-foreground">{detail}</p> : null}
      </CardContent>
    </Card>
  );
}

export function SuccessionSummaryCards({ plans }: { plans: SuccessionPlanListRow[] }) {
  const reviewDue = plans.filter((p) => p.effectiveStatus === "REVIEW_DUE");
  const inProgress = plans.filter((p) => p.status === "IN_PROGRESS" || p.status === "DRAFT");
  const complete = plans.filter((p) => p.status === "COMPLETE");
  const missingDocs = plans.reduce((sum, p) => sum + p.missingDocsCount, 0);

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <SummaryMetric label="Estate Plans" value={plans.length.toString()} detail="Succession records on file" />
      <SummaryMetric label="Review Due" value={reviewDue.length.toString()} detail="Plans needing attention" />
      <SummaryMetric label="In Progress" value={inProgress.length.toString()} detail={`${complete.length} complete`} />
      <SummaryMetric label="Missing Documents" value={missingDocs.toString()} detail="Across all plans" />
    </div>
  );
}
