import Link from "next/link";
import { SignIn } from "@clerk/nextjs";
import { JawanLogo } from "@/components/brand/jawan-logo";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";

export function SignInPanel({ reason }: { reason?: string }) {
  const defaultMessage = "Sign in with the email address your administrator invited.";
  const bannerMessage =
    reason === "invite_required"
      ? "Access is by invitation only. Use the link in your invitation email or contact your administrator."
      : reason === "jwt_expired"
        ? "Your session expired after 30 minutes of inactivity. Sign in again to continue."
        : reason === "session_expired"
          ? "Your session reached the one-hour limit. Sign in again to continue."
          : reason === "session_timeout"
            ? "You were signed out after 30 minutes of inactivity."
            : reason === "mfa_required"
              ? "Enter the code from your authenticator app to finish signing in. Dashboard access requires TOTP."
              : null;
  const showBanner = bannerMessage !== null;

  return (
    <div className="flex w-full max-w-md flex-col gap-4">
      <Card className="border-0 bg-transparent shadow-none">
        <CardHeader className="flex flex-col items-center gap-2 px-0 text-center">
          <JawanLogo size="lg" priority />
          <CardDescription>Family Office Platform</CardDescription>
        </CardHeader>
      </Card>

      {showBanner ? (
        <Card>
          <CardContent className="p-4 text-center text-sm text-muted-foreground">
            {bannerMessage}
          </CardContent>
        </Card>
      ) : null}

      <SignIn
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
        fallbackRedirectUrl="/mfa/verify"
        // After Clerk password, the app TOTP step at /mfa/verify is the gate.
        // Route access is also enforced in proxy.ts.
        forceRedirectUrl="/mfa/verify"
        appearance={{
          elements: {
            rootBox: "w-full",
            card: "shadow-sm border rounded-xl w-full",
            footerAction: "hidden",
            socialButtons: "hidden",
            socialButtonsBlockButton: "hidden",
            socialButtonsIconButton: "hidden",
            dividerRow: "hidden",
            dividerText: "hidden",
          },
        }}
      />

      <Card>
        <CardContent className="flex flex-col gap-2 p-4 text-center text-sm text-muted-foreground">
          {!showBanner ? <p>{defaultMessage}</p> : null}
          <Link href="/forgot-password" className="text-primary hover:underline">
            Forgot your password?
          </Link>
          <p>Need help? Contact your family office administrator.</p>
        </CardContent>
      </Card>
    </div>
  );
}
