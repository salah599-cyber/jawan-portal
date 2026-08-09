import Link from "next/link";
import { SignUp } from "@clerk/nextjs";
import { JawanLogo } from "@/components/brand/jawan-logo";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";

const clerkAppearance = {
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
};

export function SignUpPanel() {
  return (
    <div className="flex w-full max-w-md flex-col gap-4">
      <Card className="border-0 bg-transparent shadow-none">
        <CardHeader className="flex flex-col items-center gap-2 px-0 text-center">
          <JawanLogo size="lg" priority />
          <CardDescription>Family Office Platform</CardDescription>
        </CardHeader>
      </Card>

      <SignUp
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
        fallbackRedirectUrl="/dashboard"
        forceRedirectUrl="/dashboard"
        appearance={clerkAppearance}
      />

      <Card>
        <CardContent className="flex flex-col gap-2 p-4 text-center text-sm text-muted-foreground">
          <p>Complete your account using the email address your administrator invited.</p>
          <Link href="/sign-in" className="text-primary hover:underline">
            Already have an account? Sign in
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
