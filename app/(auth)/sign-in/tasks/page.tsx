import { TaskSetupMFA } from "@clerk/nextjs";
import { JawanLogo } from "@/components/brand/jawan-logo";
import { Card, CardDescription, CardHeader } from "@/components/ui/card";

export default function SetupMfaPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="flex w-full max-w-md flex-col gap-4">
        <Card className="border-0 bg-transparent shadow-none">
          <CardHeader className="flex flex-col items-center gap-2 px-0 text-center">
            <JawanLogo size="lg" priority />
            <CardDescription>Enroll an authenticator app to continue.</CardDescription>
          </CardHeader>
        </Card>
        <TaskSetupMFA
          redirectUrlComplete="/dashboard"
          appearance={{
            elements: {
              rootBox: "w-full",
              card: "shadow-sm border rounded-xl w-full",
            },
          }}
        />
      </div>
    </div>
  );
}
