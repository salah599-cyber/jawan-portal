import Link from "next/link";
import { notFound } from "next/navigation";
import { PlatformHeader } from "@/components/platform/platform-header";
import { DeleteEntryButton } from "@/components/platform/delete-entry-button";
import { EditLinkButton } from "@/components/platform/edit-link-button";
import { FamilyMemberHub } from "@/components/family/family-member-hub";
import {
  deleteFamilyMember,
  getFamilyMember,
  getFamilyLinkOptions,
} from "@/lib/actions/family-members";
import { serializeFamilyMember } from "@/lib/family/serialize";
import { FAMILY_KYC_STATUS_LABELS, FAMILY_RELATIONSHIP_LABELS } from "@/lib/labels";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function FamilyMemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireModuleAccess("FAMILY_MEMBERS");
  const member = await getFamilyMember(id);
  if (!member) notFound();

  const serialized = serializeFamilyMember(member);
  const linkOptions = await getFamilyLinkOptions();
  const canEdit = canWrite(ctx, "FAMILY_MEMBERS");

  return (
    <>
      <PlatformHeader title={member.fullName} />
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/family/members">Back to Register</Link>
          </Button>
          {canEdit ? (
            <>
              <EditLinkButton href={`/family/members/${member.id}/edit`} />
              <DeleteEntryButton
                itemId={member.id}
                itemLabel={member.fullName}
                deleteAction={deleteFamilyMember}
                redirectTo="/family/members"
                title="Delete family member?"
                description="This will permanently delete the member record and all KYC documents."
              />
            </>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {member.relationship ? (
            <Badge variant="outline">
              {FAMILY_RELATIONSHIP_LABELS[member.relationship] ?? member.relationship}
            </Badge>
          ) : null}
          <Badge variant="secondary">
            {FAMILY_KYC_STATUS_LABELS[serialized.effectiveKycStatus] ?? serialized.effectiveKycStatus}
          </Badge>
          {member.isBeneficiary ? <Badge>Beneficiary</Badge> : null}
          {member.deceased ? <Badge variant="destructive">Deceased</Badge> : null}
        </div>

        <FamilyMemberHub member={serialized} linkOptions={linkOptions} canEdit={canEdit} />
      </div>
    </>
  );
}
