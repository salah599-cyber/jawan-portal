import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/platform/app-sidebar";
import { InactivityLogout } from "@/components/auth/inactivity-logout";
import { syncClerkUser } from "@/lib/auth/sync-user";
import { db } from "@/lib/db";
import { getCurrentUserContext, isSuperAdmin, canAccess } from "@/lib/permissions/access";
import { countPendingDownloadRequests } from "@/lib/files/download-access";

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  await syncClerkUser();

  const { userId } = await auth();
  const ctx = await getCurrentUserContext();

  if (!ctx) {
    if (userId) {
      const inactiveUser = await db.user.findUnique({
        where: { clerkId: userId },
        select: { isActive: true },
      });
      if (inactiveUser && !inactiveUser.isActive) {
        redirect("/invite-required?reason=deactivated");
      }
      redirect("/invite-required");
    }
    redirect("/sign-in");
  }

  const showAdmin = isSuperAdmin(ctx);
  const pendingDownloadRequests = showAdmin ? await countPendingDownloadRequests() : 0;
  const showReports = canAccess(ctx, "REPORTS");
  const showCalendar = canAccess(ctx, "CALENDAR");
  const showDocumentsVault = canAccess(ctx, "DOCUMENTS");
  const showInsuranceRegister = canAccess(ctx, "INSURANCE");
  const showFamilyMembers = canAccess(ctx, "FAMILY_MEMBERS");
  const showSuccession = canAccess(ctx, "SUCCESSION");
  const showContacts = canAccess(ctx, "CONTACTS");

  return (
    <SidebarProvider>
      <InactivityLogout />
      <AppSidebar
        showAdmin={showAdmin}
        pendingDownloadRequests={pendingDownloadRequests}
        showReports={showReports}
        showCalendar={showCalendar}
        showDocumentsVault={showDocumentsVault}
        showInsuranceRegister={showInsuranceRegister}
        showFamilyMembers={showFamilyMembers}
        showSuccession={showSuccession}
        showContacts={showContacts}
      />
      <SidebarInset className="flex min-h-svh flex-col">{children}</SidebarInset>
    </SidebarProvider>
  );
}
