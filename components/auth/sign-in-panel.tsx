import Link from "next/link";
import { SignIn } from "@clerk/nextjs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function SignInPanel() {
  return (
    <div className="flex w-full max-w-md flex-col gap-4">
      <Card className="border-0 bg-transparent shadow-none">
        <CardHeader className="px-0 text-center">
          <CardTitle className="text-2xl">Jawan Investments</CardTitle>
          <CardDescription>Family Office Platform</CardDescription>
        </CardHeader>
      </Card>

      <SignIn
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-in"
        fallbackRedirectUrl="/dashboard"
        forceRedirectUrl="/dashboard"
        appearance={{
          elements: {
            rootBox: "w-full",
            card: "shadow-sm border rounded-xl w-full",
            footerAction: "hidden",
          },
        }}
      />

      <Card>
        <CardContent className="flex flex-col gap-2 p-4 text-center text-sm text-muted-foreground">
          <Link href="/forgot-password" className="text-primary hover:underline">
            Forgot your password?
          </Link>
          <p>Need help? Contact your family office administrator.</p>
        </CardContent>
      </Card>
    </div>
  );
}
