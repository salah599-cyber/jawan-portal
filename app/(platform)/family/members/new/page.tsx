import { PlatformHeader } from "@/components/platform/platform-header";
import { CreateFamilyMemberForm } from "@/components/family/create-family-member-form";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { forbidden } from "next/navigation";

export default async function NewFamilyMemberPage() {
  const ctx = await requireModuleAccess("FAMILY_MEMBERS");
  if (!canWrite(ctx, "FAMILY_MEMBERS")) forbidden();

  return (
    <>
      <PlatformHeader title="Add Family Member" />
      <CreateFamilyMemberForm />
    </>
  );
}
