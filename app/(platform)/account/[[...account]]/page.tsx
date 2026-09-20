import { auth } from "@clerk/nextjs/server";
import { PlatformHeader } from "@/components/platform/platform-header";
import { AccountSecurityProfile } from "@/components/auth/account-security-profile";
import { TotpAccountCard } from "@/components/auth/totp-account-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { ensureUsersSchema } from "@/lib/db/ensure-users-schema";

export default async function AccountPage() {
  const { userId } = await auth();
  await ensureUsersSchema();
  const user = userId
    ? await db.user.findUnique({
        where: { clerkId: userId },
        select: { totpEnabled: true },
      })
    : null;

  return (
    <>
      <PlatformHeader title="Account Settings" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <TotpAccountCard enrolled={user?.totpEnabled === true} />
        <Card className="max-w-4xl">
          <CardHeader>
            <CardTitle>Profile & password</CardTitle>
            <CardDescription>Update your name, email, and password.</CardDescription>
          </CardHeader>
          <CardContent className="flex w-full justify-center">
            <AccountSecurityProfile />
          </CardContent>
        </Card>
      </main>
    </>
  );
}
