import { PlatformHeader } from "@/components/platform/platform-header";
import { UserProfile } from "@clerk/nextjs";
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
              Manage your account details. Open the Security tab to change your password.
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
