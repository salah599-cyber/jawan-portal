"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function PePortfolioError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("PE portfolio page error:", error);
  }, [error]);

  const isSchemaError =
    error.message.includes("PeCompany") ||
    error.message.includes("does not exist") ||
    error.message.includes("P2021");

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Could not load PE / VC portfolio</CardTitle>
          <CardDescription>
            {isSchemaError
              ? "The PE portfolio database tables are not set up yet. Redeploy the latest build or ask an admin to run the schema sync."
              : "Something went wrong while loading this page."}
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
