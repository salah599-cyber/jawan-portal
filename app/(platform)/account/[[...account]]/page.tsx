import { redirect } from "next/navigation";
import { PlatformHeader } from "@/components/platform/platform-header";
import { AccountSecurityProfile } from "@/components/auth/account-security-profile";
import { MFA_ENROLL_PATH, MFA_ENROLL_REASON } from "@/lib/auth/mfa";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AccountPage({
  params,
  searchParams,
}: {
  params: Promise<{ account?: string[] }>;
  searchParams: Promise<{ reason?: string }>;
}) {
  const { account } = await params;
  const { reason } = await searchParams;
  const enrollMfa = reason === MFA_ENROLL_REASON;

  if (enrollMfa && account?.[0] !== "security") {
    redirect(`${MFA_ENROLL_PATH}?reason=${MFA_ENROLL_REASON}`);
  }

  return (
    <>
      <PlatformHeader title="Account Settings" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        {enrollMfa ? (
          <Card className="max-w-4xl border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40">
            <CardHeader>
              <CardTitle>Set up Google Authenticator</CardTitle>
              <CardDescription>
                Scan the QR code below with Google Authenticator (or any TOTP app), confirm the
                6-digit code, then save your backup codes. After that, sign out and sign in again —
                you will be asked for your authenticator code before the dashboard loads.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : null}
        <Card className="max-w-4xl">
          <CardHeader>
            <CardTitle>{enrollMfa ? "Authenticator setup" : "Profile & Security"}</CardTitle>
            <CardDescription>
              {enrollMfa
                ? "Add an authenticator app and download backup codes using the form below."
                : "Manage your account details, authenticator app, backup codes, or password."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex w-full justify-center">
            <AccountSecurityProfile securityOnly={enrollMfa} />
          </CardContent>
        </Card>
      </main>
    </>
  );
}
