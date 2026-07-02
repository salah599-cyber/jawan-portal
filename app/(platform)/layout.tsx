import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/platform/app-sidebar";
import { syncClerkUser } from "@/lib/auth/sync-user";
import { getCurrentUserContext, isSuperAdmin, canAccess } from "@/lib/permissions/access";

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  await syncClerkUser();
  const ctx = await getCurrentUserContext();
  const showAdmin = ctx ? isSuperAdmin(ctx) : false;
  const showReports = ctx ? canAccess(ctx, "REPORTS") : false;
  const showRealEstate = ctx ? canAccess(ctx, "REAL_ESTATE") : false;

  return (
    <SidebarProvider>
      <AppSidebar showAdmin={showAdmin} showReports={showReports} showRealEstate={showRealEstate} />
      <SidebarInset className="flex min-h-svh flex-col">{children}</SidebarInset>
    </SidebarProvider>
  );
}
