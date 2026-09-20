import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/platform/app-sidebar";
import { InactivityLogout } from "@/components/auth/inactivity-logout";
import { syncClerkUser } from "@/lib/auth/sync-user";
import { db } from "@/lib/db";
import { getCurrentUserContext, isSuperAdmin, buildModuleAccessMap } from "@/lib/permissions/access";
import { countPendingDownloadRequests } from "@/lib/files/download-access";
import {
  MFA_ENROLL_REASON,
  MFA_SIGN_IN_REASON,
  PATHNAME_HEADER,
  isMfaSetupPath,
  isMfaTaskPath,
  isPendingSession,
  isSecondFactorVerified,
} from "@/lib/auth/mfa";

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  await syncClerkUser();

  const clerkUser = await currentUser();
  const { userId, factorVerificationAge, sessionStatus } = await auth();
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

  // Defense in depth: auth.protect() only proves a session. Dashboard and
  // investment/transaction routes also require TOTP enrollment and a verified
  // second factor on this session (amr includes otp / fva[1] !== -1).
  if (!isMfaSetupPath(pathname)) {
    if (clerkUser?.twoFactorEnabled !== true) {
      redirect(`/account?reason=${MFA_ENROLL_REASON}`);
    }
    if (!isSecondFactorVerified(factorVerificationAge)) {
      redirect(`/sign-in?reason=${MFA_SIGN_IN_REASON}`);
    }
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
