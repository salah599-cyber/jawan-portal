"use client";

import { useActionState } from "react";
import { verifyTotpChallenge } from "@/lib/actions/totp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type VerifyState = { error?: string } | null;

export function TotpVerifyForm() {
  const [state, formAction, pending] = useActionState(
    async (_prev: VerifyState, formData: FormData): Promise<VerifyState> => verifyTotpChallenge(formData),
    null,
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="totp-code">Authenticator code</Label>
        <Input
          id="totp-code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          required
          placeholder="123456"
        />
      </div>
      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Verifying…" : "Continue"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Lost your phone? Enter a backup code instead.
      </p>
    </form>
  );
}
