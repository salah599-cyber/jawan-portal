import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/platform/app-sidebar";
import { syncClerkUser } from "@/lib/auth/sync-user";
import { canAccess, getCurrentUserContext, isSuperAdmin } from "@/lib/permissions/access";
import type { ModuleName } from "@/lib/permissions/types";

const NAV_MODULES: ModuleName[] = [
  "DASHBOARD",
  "ASSETS",
  "LANDS",
  "CARS",
  "COMPANIES",
  "LOANS",
  "CHEQUES",
  "PROPOSALS",
  "DOCUMENTS",
  "EXPENSES",
  "REPORTS",
];

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  await syncClerkUser();
  const ctx = await getCurrentUserContext();
  const showAdmin = ctx ? isSuperAdmin(ctx) : false;

  const moduleAccess = Object.fromEntries(
    NAV_MODULES.map((module) => [module, ctx ? canAccess(ctx, module) : false]),
  ) as Record<ModuleName, boolean>;

  return (
    <SidebarProvider>
      <AppSidebar showAdmin={showAdmin} moduleAccess={moduleAccess} />
      <SidebarInset className="flex min-h-svh flex-col">{children}</SidebarInset>
    </SidebarProvider>
  );
}
