import Link from "next/link";
import { notFound } from "next/navigation";
import { PlatformHeader } from "@/components/platform/platform-header";
import { DeleteEntryButton } from "@/components/platform/delete-entry-button";
import { EditLinkButton } from "@/components/platform/edit-link-button";
import { InsurancePolicyDetail } from "@/components/insurance/insurance-policy-detail";
import { UploadInsuranceDocumentsForm } from "@/components/insurance/upload-insurance-documents-form";
import { deleteInsurancePolicy, getInsurancePolicy } from "@/lib/actions/insurance";
import { serializeInsurancePolicy } from "@/lib/insurance/serialize";
import {
  INSURANCE_POLICY_STATUS_LABELS,
  INSURANCE_POLICY_TYPE_LABELS,
} from "@/lib/labels";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function InsurancePolicyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireModuleAccess("INSURANCE");
  const policy = await getInsurancePolicy(id);
  if (!policy) notFound();

  const serialized = serializeInsurancePolicy(policy);
  const canEdit = canWrite(ctx, "INSURANCE");

  return (
    <>
      <PlatformHeader title={policy.policyNumber} />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/documents/insurance">Back to Register</Link>
          </Button>
          {canEdit ? (
            <>
              <EditLinkButton href={`/documents/insurance/${policy.id}/edit`} />
              <DeleteEntryButton
                itemId={policy.id}
                itemLabel={policy.policyNumber}
                deleteAction={deleteInsurancePolicy}
                redirectTo="/documents/insurance"
                title="Delete policy?"
                description="This will permanently delete the policy and all uploaded documents."
              />
            </>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">
            {INSURANCE_POLICY_TYPE_LABELS[policy.policyType] ?? policy.policyType}
          </Badge>
          <Badge variant="secondary">
            {INSURANCE_POLICY_STATUS_LABELS[serialized.effectiveStatus] ?? serialized.effectiveStatus}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {policy.entity.name} · {policy.insurer}
          </span>
        </div>

        <InsurancePolicyDetail policy={serialized} />
        <UploadInsuranceDocumentsForm policy={serialized} canEdit={canEdit} />
      </main>
    </>
  );
}
