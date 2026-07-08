"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminUsersError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Admin users page error:", error.digest ?? error.message);
  }, [error]);

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Could not load user management</CardTitle>
          <CardDescription>
            {error.message ||
              "An unexpected error occurred while loading users or pending invitations."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
