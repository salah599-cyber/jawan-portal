"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ReportsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Reports page error:", error);
  }, [error]);

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Could not load report</CardTitle>
          <CardDescription>
            Something went wrong while generating this report. Check your filters and try again.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{error.message || "An unexpected error occurred."}</p>
          {error.digest ? (
            <p className="text-xs text-muted-foreground">Reference: {error.digest}</p>
          ) : null}
          <div className="flex gap-2">
            <Button type="button" onClick={reset}>
              Try again
            </Button>
            <Button variant="outline" asChild>
              <Link href="/reports">Back to reports</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
