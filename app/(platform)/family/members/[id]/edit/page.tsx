import { notFound } from "next/navigation";
import { PlatformHeader } from "@/components/platform/platform-header";
import { EditFamilyMemberForm } from "@/components/family/edit-family-member-form";
import { getFamilyMember } from "@/lib/actions/family-members";
import { serializeFamilyMember } from "@/lib/family/serialize";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { forbidden } from "next/navigation";

export default async function EditFamilyMemberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireModuleAccess("FAMILY_MEMBERS");
  if (!canWrite(ctx, "FAMILY_MEMBERS")) forbidden();

  const member = await getFamilyMember(id);
  if (!member) notFound();

  return (
    <>
      <PlatformHeader title={`Edit ${member.fullName}`} />
      <EditFamilyMemberForm member={serializeFamilyMember(member)} />
    </>
  );
}
