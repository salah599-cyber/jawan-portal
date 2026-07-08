import { redirect } from "next/navigation";
import { FamilyModuleNav } from "@/components/family/family-module-nav";
import { canAccess, getCurrentUserContext } from "@/lib/permissions/access";

export default async function FamilyLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getCurrentUserContext();
  const showMembers = ctx ? canAccess(ctx, "FAMILY_MEMBERS") : false;
  const showSuccession = ctx ? canAccess(ctx, "SUCCESSION") : false;

  if (!showMembers && !showSuccession) {
    redirect("/dashboard");
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:flex-row md:gap-6 md:p-6">
      <FamilyModuleNav showMembers={showMembers} showSuccession={showSuccession} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
