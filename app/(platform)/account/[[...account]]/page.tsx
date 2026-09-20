import { PlatformHeader } from "@/components/platform/platform-header";
import { UserProfile } from "@clerk/nextjs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;
  const enrollMfa = reason === "mfa_enroll";

  return (
    <>
      <PlatformHeader title="Account Settings" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        {enrollMfa ? (
          <Card className="max-w-4xl border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40">
            <CardHeader>
              <CardTitle>Authenticator app required</CardTitle>
              <CardDescription>
                Open the Security tab, add an authenticator app (TOTP), and save your backup codes.
                Then sign out and sign in again. You will be prompted for a TOTP code before the
                dashboard loads.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : null}
        <Card className="max-w-4xl">
          <CardHeader>
            <CardTitle>Profile & Security</CardTitle>
            <CardDescription>
              Manage your account details. Open the Security tab to enroll an authenticator app,
              store backup codes, or change your password.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center overflow-x-auto">
            <UserProfile
              routing="path"
              path="/account"
              appearance={{
                elements: {
                  rootBox: "w-full",
                  card: "shadow-none border-0 w-full max-w-3xl",
                },
              }}
            />
          </CardContent>
        </Card>
      </main>
    </>
  );
}
