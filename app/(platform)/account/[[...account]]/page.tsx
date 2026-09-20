import { PlatformHeader } from "@/components/platform/platform-header";
import { AccountSecurityProfile } from "@/components/auth/account-security-profile";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AccountPage() {
  return (
    <>
      <PlatformHeader title="Account Settings" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <Card className="max-w-4xl">
          <CardHeader>
            <CardTitle>Profile & Security</CardTitle>
            <CardDescription>
              Manage your account details and password. Google Authenticator is required at
              sign-in after your password.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex w-full justify-center">
            <AccountSecurityProfile />
          </CardContent>
        </Card>
      </main>
    </>
  );
}
