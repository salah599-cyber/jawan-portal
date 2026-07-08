import Link from "next/link";
import { notFound } from "next/navigation";
import { PlatformHeader } from "@/components/platform/platform-header";
import { DeleteEntryButton } from "@/components/platform/delete-entry-button";
import { EditLinkButton } from "@/components/platform/edit-link-button";
import { SuccessionPlanHub } from "@/components/succession/succession-plan-hub";
import {
  deleteSuccessionPlan,
  getSuccessionPlan,
} from "@/lib/actions/succession";
import {
  getFamilyLinkOptions,
  listFamilyMemberOptions,
} from "@/lib/actions/family-members";
import { serializeSuccessionPlan } from "@/lib/succession/serialize";
import { SUCCESSION_PLAN_STATUS_LABELS } from "@/lib/labels";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function SuccessionPlanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireModuleAccess("SUCCESSION");
  const plan = await getSuccessionPlan(id);
  if (!plan) notFound();

  const [linkOptions, members] = await Promise.all([
    getFamilyLinkOptions(plan.entityId ?? undefined),
    listFamilyMemberOptions(),
  ]);

  const serialized = serializeSuccessionPlan(plan);
  const canEdit = canWrite(ctx, "SUCCESSION");

  return (
    <>
      <PlatformHeader title={plan.title} />
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/family/succession">Back to Plans</Link>
          </Button>
          {canEdit ? (
            <>
              <EditLinkButton href={`/family/succession/${plan.id}/edit`} />
              <DeleteEntryButton
                itemId={plan.id}
                itemLabel={plan.title}
                deleteAction={deleteSuccessionPlan}
                redirectTo="/family/succession"
                title="Delete succession plan?"
                description="This will permanently delete the plan and all associated records."
              />
            </>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">
            {SUCCESSION_PLAN_STATUS_LABELS[serialized.effectiveStatus] ?? serialized.effectiveStatus}
          </Badge>
          {plan.entity ? <span className="text-sm text-muted-foreground">{plan.entity.name}</span> : null}
        </div>

        <SuccessionPlanHub
          plan={serialized}
          linkOptions={linkOptions}
          members={members}
          canEdit={canEdit}
        />
      </div>
    </>
  );
}
