import { JawanLogo } from "@/components/brand/jawan-logo";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";

export function MfaShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="flex w-full max-w-lg flex-col gap-5">
        <Card className="border-0 bg-transparent shadow-none">
          <CardHeader className="flex flex-col items-center gap-2 px-0 text-center">
            <JawanLogo size="lg" priority />
            <CardDescription className="text-base text-foreground">{title}</CardDescription>
          </CardHeader>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-6 sm:p-8">{children}</CardContent>
        </Card>
      </div>
    </div>
  );
}
