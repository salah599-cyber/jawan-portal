import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { MfaShell } from "@/components/auth/mfa-shell";
import { TotpSetupForm } from "@/components/auth/totp-setup-form";
import { requireTotpDestination } from "@/lib/actions/totp";
import { totpNextPath } from "@/lib/auth/totp-flow";
import { isTotpCookieValid, TOTP_COOKIE } from "@/lib/auth/totp-cookie";

export default async function TotpSetupPage() {
  const { userId, sessionId, enrolled } = await requireTotpDestination();
  const verified = isTotpCookieValid((await cookies()).get(TOTP_COOKIE)?.value, userId, sessionId);
  const next = totpNextPath({ enrolled, verified });
  if (next !== "/mfa/setup") redirect(next);

  return (
    <MfaShell title="Set up Google Authenticator">
      <TotpSetupForm heading="Add this account to Google Authenticator" />
    </MfaShell>
  );
}
