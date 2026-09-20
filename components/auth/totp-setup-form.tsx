"use client";

import { useActionState, useEffect, useState } from "react";
import { Smartphone, QrCode, ShieldCheck } from "lucide-react";
import { confirmTotpEnrollment, startTotpEnrollment } from "@/lib/actions/totp";
import { Button } from "@/components/ui/button";
import { TotpCodeInput } from "@/components/auth/totp-code-input";
import { CopyButton } from "@/components/auth/copy-button";
import { formatBackupCode, formatTotpSecret } from "@/lib/auth/totp-flow";

type SetupState = { error?: string; backupCodes?: string[] } | null;

function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex gap-3">
      <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
        {n}
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <h2 className="text-sm font-semibold">{title}</h2>
        {children}
      </div>
    </section>
  );
}

export function TotpSetupForm({ heading = "Protect this account" }: { heading?: string }) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [savedCodes, setSavedCodes] = useState(false);
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
    const printable = state.backupCodes.map(formatBackupCode).join("\n");
    return (
      <div className="flex flex-col gap-5">
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/40">
          <ShieldCheck className="mt-0.5 size-5 text-emerald-700 dark:text-emerald-400" />
          <div>
            <p className="font-semibold text-emerald-900 dark:text-emerald-200">Authenticator is on</p>
            <p className="text-sm text-emerald-800/80 dark:text-emerald-300/80">
              Save these backup codes now. Each one works once if you lose your phone.
            </p>
          </div>
        </div>
        <ul className="grid grid-cols-2 gap-2 font-mono text-sm">
          {state.backupCodes.map((code) => (
            <li key={code} className="rounded-lg border bg-muted/40 px-2 py-2 text-center">
              {formatBackupCode(code)}
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2">
          <CopyButton value={printable} label="Copy all codes" />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const blob = new Blob([`Jawan Investments backup codes\n\n${printable}\n`], {
                type: "text/plain",
              });
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = "jawan-authenticator-backup-codes.txt";
              link.click();
              URL.revokeObjectURL(url);
            }}
          >
            Download codes
          </Button>
        </div>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-0.5 size-4"
            checked={savedCodes}
            onChange={(event) => setSavedCodes(event.target.checked)}
          />
          I have saved these backup codes somewhere safe.
        </label>
        {savedCodes ? (
          <Button asChild>
            <a href="/dashboard">Continue to dashboard</a>
          </Button>
        ) : (
          <Button type="button" disabled>
            Continue to dashboard
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold">{heading}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          After your password, you will enter a code from Google Authenticator. This takes about a
          minute.
        </p>
      </div>

      <Step n={1} title="Install Google Authenticator">
        <p className="text-sm text-muted-foreground">Use the official app on your phone.</p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button asChild variant="outline" size="sm">
            <a
              href="https://apps.apple.com/app/google-authenticator/id388497605"
              target="_blank"
              rel="noreferrer"
            >
              <Smartphone className="size-3.5" />
              iPhone
            </a>
          </Button>
          <Button asChild variant="outline" size="sm">
            <a
              href="https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2"
              target="_blank"
              rel="noreferrer"
            >
              <Smartphone className="size-3.5" />
              Android
            </a>
          </Button>
        </div>
      </Step>

      <Step n={2} title="Scan this QR code">
        {loadError ? <p className="text-sm text-destructive">{loadError}</p> : null}
        {qrDataUrl ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border bg-white p-4 dark:bg-card">
            <img src={qrDataUrl} alt="Google Authenticator QR code" className="size-[200px]" />
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <QrCode className="size-3.5" />
              In the app, tap Add → Scan a QR code
            </p>
          </div>
        ) : !loadError ? (
          <p className="text-sm text-muted-foreground">Preparing your QR code…</p>
        ) : null}
        {secret ? (
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">Can’t scan? Enter this key manually:</p>
            <p className="mt-1 break-all font-mono text-sm">{formatTotpSecret(secret)}</p>
            <CopyButton className="mt-2" value={secret} label="Copy key" />
          </div>
        ) : null}
      </Step>

      <Step n={3} title="Enter the 6-digit code from the app">
        <form action={formAction} className="flex flex-col gap-3">
          <TotpCodeInput />
          {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
          <Button type="submit" disabled={pending || !qrDataUrl}>
            {pending ? "Checking code…" : "Confirm authenticator"}
          </Button>
        </form>
      </Step>
    </div>
  );
}
