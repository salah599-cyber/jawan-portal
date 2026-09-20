"use client";

import { useActionState, useRef } from "react";
import { verifyTotpChallenge } from "@/lib/actions/totp";
import { Button } from "@/components/ui/button";
import { TotpCodeInput } from "@/components/auth/totp-code-input";

type VerifyState = { error?: string } | null;

export function TotpVerifyForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    async (_prev: VerifyState, formData: FormData): Promise<VerifyState> => verifyTotpChallenge(formData),
    null,
  );

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-5">
      <div>
        <h1 className="text-lg font-semibold">Enter your authenticator code</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Open Google Authenticator and type the 6-digit code for Jawan Investments.
        </p>
      </div>
      <TotpCodeInput
        onFilled={() => {
          formRef.current?.requestSubmit();
        }}
      />
      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Checking code…" : "Continue"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Lost your phone? Paste a backup code in the same box.
      </p>
    </form>
  );
}
