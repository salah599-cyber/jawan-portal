import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { MfaShell } from "@/components/auth/mfa-shell";
import { TotpVerifyForm } from "@/components/auth/totp-verify-form";
import { requireTotpDestination } from "@/lib/actions/totp";
import { totpNextPath } from "@/lib/auth/totp-flow";
import { isTotpCookieValid, TOTP_COOKIE } from "@/lib/auth/totp-cookie";

export default async function TotpVerifyPage() {
  const { userId, sessionId, enrolled } = await requireTotpDestination();
  const verified = isTotpCookieValid((await cookies()).get(TOTP_COOKIE)?.value, userId, sessionId);
  const next = totpNextPath({ enrolled, verified });
  if (next !== "/mfa/verify") redirect(next);

  return (
    <MfaShell title="Almost there">
      <TotpVerifyForm />
    </MfaShell>
  );
}
