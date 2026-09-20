import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/platform/app-sidebar";
import { InactivityLogout } from "@/components/auth/inactivity-logout";
import { syncClerkUser } from "@/lib/auth/sync-user";
import { db } from "@/lib/db";
import { getCurrentUserContext, isSuperAdmin, buildModuleAccessMap } from "@/lib/permissions/access";
import { countPendingDownloadRequests } from "@/lib/files/download-access";
import {
  MFA_VERIFY_PATH,
  PATHNAME_HEADER,
  isMfaSetupPath,
  isMfaTaskPath,
  isPendingSession,
} from "@/lib/auth/mfa";
import { TOTP_COOKIE, isTotpCookieValid } from "@/lib/auth/totp-cookie";

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  await syncClerkUser();

  const { userId, sessionId, sessionStatus } = await auth();
  const pathname = (await headers()).get(PATHNAME_HEADER) ?? "";

  // Pending sessions are signed-out (`userId` is null). Send them to the
  // setup-mfa task before the invite / dashboard gates.
  if (isPendingSession(sessionStatus) && !isMfaTaskPath(pathname)) {
    redirect("/sign-in/tasks");
  }

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

  // Clerk password is only the first factor. Google Authenticator (app TOTP)
  // must be verified for this Clerk session before dashboard routes render.
  let totpOk = false;
  try {
    totpOk = isTotpCookieValid((await cookies()).get(TOTP_COOKIE)?.value, userId, sessionId);
  } catch {
    totpOk = false;
  }

  if (!isMfaSetupPath(pathname) && !totpOk) {
    redirect(MFA_VERIFY_PATH);
  }

  const showAdmin = isSuperAdmin(ctx);
  const pendingDownloadRequests = showAdmin ? await countPendingDownloadRequests() : 0;
  const moduleAccess = buildModuleAccessMap(ctx);

  return (
    <SidebarProvider>
      <InactivityLogout />
      <AppSidebar
        showAdmin={showAdmin}
        pendingDownloadRequests={pendingDownloadRequests}
        moduleAccess={moduleAccess}
      />
      <SidebarInset className="flex min-h-svh flex-col">{children}</SidebarInset>
    </SidebarProvider>
  );
}
