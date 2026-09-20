import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { JawanLogo } from "@/components/brand/jawan-logo";
import { TotpVerifyForm } from "@/components/auth/totp-verify-form";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { MFA_ENROLL_PATH } from "@/lib/auth/mfa";
import { requireTotpDestination } from "@/lib/actions/totp";
import { isTotpCookieValid, TOTP_COOKIE } from "@/lib/auth/totp-cookie";

export default async function TotpVerifyPage() {
  const { userId, sessionId, enrolled } = await requireTotpDestination();
  const verified = isTotpCookieValid((await cookies()).get(TOTP_COOKIE)?.value, userId, sessionId);

  if (verified) redirect("/dashboard");
  if (!enrolled) redirect(MFA_ENROLL_PATH);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="flex w-full max-w-md flex-col gap-4">
        <Card className="border-0 bg-transparent shadow-none">
          <CardHeader className="flex flex-col items-center gap-2 px-0 text-center">
            <JawanLogo size="lg" priority />
            <CardDescription>
              Enter the code from Google Authenticator to finish signing in.
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardContent className="p-6">
            <TotpVerifyForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
