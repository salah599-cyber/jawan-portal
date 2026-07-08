"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function MsxPortfolioError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("MSX portfolio page error:", error);
  }, [error]);

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Could not load MSX portfolio</CardTitle>
          <CardDescription>
            Something went wrong while loading this page. If you just imported a report, your data
            may still have been saved.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {error.message || "An unexpected error occurred."}
          </p>
          {error.digest ? (
            <p className="text-xs text-muted-foreground">Reference: {error.digest}</p>
          ) : null}
          <Button type="button" onClick={reset}>
            Try again
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
