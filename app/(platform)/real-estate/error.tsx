"use client";

import Link from "next/link";
import { PlatformHeader } from "@/components/platform/platform-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function RealEstateError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <>
      <PlatformHeader title="Real Estate" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Something went wrong</CardTitle>
            <CardDescription>
              The real estate module encountered an error. This may be a temporary database issue.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">{error.message}</p>
            {error.digest ? (
              <p className="text-xs text-muted-foreground">Reference: {error.digest}</p>
            ) : null}
            <div className="flex gap-2">
              <Button type="button" onClick={reset}>
                Try again
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/real-estate">Back to portfolio</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
