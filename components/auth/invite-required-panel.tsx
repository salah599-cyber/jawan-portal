"use client";

import Link from "next/link";
import { useClerk } from "@clerk/nextjs";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function InviteRequiredPanel({ reason }: { reason?: string }) {
  const { signOut, loaded } = useClerk();

  useEffect(() => {
    if (!loaded) return;
    void signOut({ redirectUrl: "/sign-in?reason=invite_required" });
  }, [loaded, signOut]);

  const message =
    reason === "deactivated"
      ? "Your account is inactive. Contact your family office administrator."
      : "Access is by invitation only. Ask your administrator to send you an invitation email.";

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Invitation required</CardTitle>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button type="button" asChild className="w-full">
          <Link href="/sign-in?reason=invite_required">Return to sign in</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
