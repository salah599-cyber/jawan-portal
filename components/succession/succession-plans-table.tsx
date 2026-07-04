import Link from "next/link";
import { RowActions } from "@/components/platform/row-actions";
import { deleteSuccessionPlan } from "@/lib/actions/succession";
import { SUCCESSION_PLAN_STATUS_LABELS } from "@/lib/labels";
import { formatDate } from "@/lib/format";
import type { SuccessionPlanListRow } from "@/lib/actions/succession";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "COMPLETE") return "default";
  if (status === "REVIEW_DUE") return "destructive";
  if (status === "IN_PROGRESS") return "secondary";
  return "outline";
}

export function SuccessionPlansTable({
  plans,
  canEdit,
}: {
  plans: SuccessionPlanListRow[];
  canEdit: boolean;
}) {
  if (plans.length === 0) {
    return <p className="text-sm text-muted-foreground">No succession plans documented yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Plan</TableHead>
          <TableHead>Entity</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Checklist</TableHead>
          <TableHead>Next Review</TableHead>
          <TableHead>Missing Docs</TableHead>
          {canEdit ? <TableHead className="w-[60px]">Actions</TableHead> : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {plans.map((plan) => (
          <TableRow key={plan.id}>
            <TableCell className="font-medium">
              <Link href={`/family/succession/${plan.id}`} className="hover:underline">
                {plan.title}
              </Link>
            </TableCell>
            <TableCell>{plan.entityName ?? "—"}</TableCell>
            <TableCell>
              <Badge variant={statusVariant(plan.effectiveStatus)}>
                {SUCCESSION_PLAN_STATUS_LABELS[plan.effectiveStatus] ?? plan.effectiveStatus}
              </Badge>
            </TableCell>
            <TableCell>{plan.checklistCompletionPct}%</TableCell>
            <TableCell>{plan.nextReviewDate ? formatDate(plan.nextReviewDate) : "—"}</TableCell>
            <TableCell>{plan.missingDocsCount}</TableCell>
            {canEdit ? (
              <TableCell>
                <RowActions
                  editHref={`/family/succession/${plan.id}/edit`}
                  itemId={plan.id}
                  itemLabel={plan.title}
                  deleteAction={deleteSuccessionPlan}
                />
              </TableCell>
            ) : null}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
