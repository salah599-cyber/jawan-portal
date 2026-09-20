"use client";

import { useActionState, useEffect, useState } from "react";
import { confirmTotpEnrollment, startTotpEnrollment } from "@/lib/actions/totp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type SetupState = { error?: string; backupCodes?: string[] } | null;

export function TotpSetupForm() {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [state, formAction, pending] = useActionState(
    async (_prev: SetupState, formData: FormData): Promise<SetupState> => confirmTotpEnrollment(formData),
    null,
  );

  useEffect(() => {
    let cancelled = false;
    void startTotpEnrollment().then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setLoadError(result.error);
        return;
      }
      setQrDataUrl(result.qrDataUrl);
      setSecret(result.secret);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state?.backupCodes?.length) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          Authenticator enrolled. Save these backup codes somewhere safe. Each code can be used once
          if you lose your phone.
        </p>
        <ul className="grid grid-cols-2 gap-2 font-mono text-sm">
          {state.backupCodes.map((code) => (
            <li key={code} className="rounded-md border bg-muted/40 px-2 py-1 text-center">
              {code}
            </li>
          ))}
        </ul>
        <Button asChild>
          <a href="/dashboard">Continue to dashboard</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {loadError ? <p className="text-sm text-destructive">{loadError}</p> : null}
      {qrDataUrl ? (
        <div className="flex flex-col items-center gap-2">
          <img src={qrDataUrl} alt="Google Authenticator QR code" className="rounded-md border bg-white p-2" />
          <p className="text-center text-sm text-muted-foreground">
            Scan this QR code with Google Authenticator, then enter the 6-digit code.
          </p>
        </div>
      ) : !loadError ? (
        <p className="text-sm text-muted-foreground">Generating authenticator QR code…</p>
      ) : null}
      {secret ? (
        <p className="break-all text-center text-xs text-muted-foreground">
          Can’t scan? Enter this key manually: <span className="font-mono">{secret}</span>
        </p>
      ) : null}

      <form action={formAction} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="totp-code">Authenticator code</Label>
          <Input
            id="totp-code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            placeholder="123456"
          />
        </div>
        {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
        <Button type="submit" disabled={pending || !qrDataUrl}>
          {pending ? "Verifying…" : "Confirm and continue"}
        </Button>
      </form>
    </div>
  );
}
