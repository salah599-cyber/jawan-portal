"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function PublicMarketsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Public markets page error:", error);
  }, [error]);

  const message = error.message ?? "";
  const isSchemaError =
    message.includes("PublicEquityHolding") ||
    message.includes("PublicMarket") ||
    message.includes("does not exist") ||
    message.includes("P2021") ||
    message.includes("P2022") ||
    message.includes("schema");

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Could not load Public Markets</CardTitle>
          <CardDescription>
            {isSchemaError
              ? "The public markets database columns are not set up yet. Redeploy the latest build or ask an admin to run the schema sync."
              : "Something went wrong while loading this page."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {message || "An unexpected error occurred."}
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
