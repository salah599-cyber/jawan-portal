"use client";

import { useActionState, useState } from "react";
import { QrCode, Smartphone } from "lucide-react";
import {
  confirmTotpReplacement,
  revealExistingTotp,
  startTotpReplacement,
} from "@/lib/actions/totp";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyButton } from "@/components/auth/copy-button";
import { TotpCodeInput } from "@/components/auth/totp-code-input";
import { formatBackupCode, formatTotpSecret } from "@/lib/auth/totp-flow";

type QrState =
  | { error?: string; qrDataUrl?: string; secret?: string; backupCodes?: string[] }
  | null;

function QrPanel({ qrDataUrl, secret }: { qrDataUrl: string; secret: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border bg-white p-4 dark:bg-card">
      <img src={qrDataUrl} alt="Google Authenticator QR code" className="size-[180px]" />
      <p className="text-center text-sm text-muted-foreground">
        In Google Authenticator tap Add, then Scan a QR code.
      </p>
      <p className="break-all text-center font-mono text-xs text-muted-foreground">
        {formatTotpSecret(secret)}
      </p>
      <CopyButton value={secret} label="Copy key" />
    </div>
  );
}

export function TotpAccountCard({ enrolled }: { enrolled: boolean }) {
  const [mode, setMode] = useState<"idle" | "add" | "replace">("idle");
  const [addState, addAction, addPending] = useActionState(
    async (_prev: QrState, formData: FormData): Promise<QrState> => {
      const result = await revealExistingTotp(formData);
      if ("error" in result && result.error) return { error: result.error };
      if ("ok" in result && result.ok) return { qrDataUrl: result.qrDataUrl, secret: result.secret };
      return { error: "Could not show the QR code." };
    },
    null,
  );
  const [replaceStart, replaceStartAction, replaceStartPending] = useActionState(
    async (_prev: QrState, formData: FormData): Promise<QrState> => {
      const result = await startTotpReplacement(formData);
      if ("error" in result && result.error) return { error: result.error };
      if ("ok" in result && result.ok) return { qrDataUrl: result.qrDataUrl, secret: result.secret };
      return { error: "Could not start replacement." };
    },
    null,
  );
  const [replaceConfirm, replaceConfirmAction, replaceConfirmPending] = useActionState(
    async (_prev: QrState, formData: FormData): Promise<QrState> => confirmTotpReplacement(formData),
    null,
  );

  return (
    <Card className="max-w-4xl">
      <CardHeader>
        <CardTitle>Google Authenticator</CardTitle>
        <CardDescription>
          {enrolled
            ? "This account is protected. Add it to another phone, or replace the authenticator if you got a new device."
            : "After your password, this account needs a Google Authenticator code."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm">
          Status:{" "}
          <span className="font-medium">{enrolled ? "On for this account" : "Not set up yet"}</span>
        </p>

        {!enrolled ? (
          <Button asChild>
            <a href="/mfa/setup">Set up Google Authenticator</a>
          </Button>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant={mode === "add" ? "default" : "outline"} onClick={() => setMode("add")}>
              <Smartphone className="size-3.5" />
              Add to another phone
            </Button>
            <Button
              type="button"
              variant={mode === "replace" ? "default" : "outline"}
              onClick={() => setMode("replace")}
            >
              <QrCode className="size-3.5" />
              Replace authenticator
            </Button>
          </div>
        )}

        {mode === "add" ? (
          <div className="space-y-3 rounded-xl border p-4">
            <p className="text-sm text-muted-foreground">
              Enter the current 6-digit code, then scan the QR with the new phone. This keeps the
              same authenticator — both phones will show matching codes.
            </p>
            {addState?.qrDataUrl && addState.secret ? (
              <QrPanel qrDataUrl={addState.qrDataUrl} secret={addState.secret} />
            ) : (
              <form action={addAction} className="flex max-w-sm flex-col gap-3">
                <TotpCodeInput id="add-totp-code" label="Current authenticator code" />
                {addState?.error ? <p className="text-sm text-destructive">{addState.error}</p> : null}
                <Button type="submit" disabled={addPending}>
                  {addPending ? "Checking…" : "Show QR code"}
                </Button>
              </form>
            )}
          </div>
        ) : null}

        {mode === "replace" ? (
          <div className="space-y-3 rounded-xl border p-4">
            {replaceConfirm?.backupCodes?.length ? (
              <div className="space-y-3">
                <p className="text-sm">
                  New authenticator is active. Save these replacement backup codes.
                </p>
                <ul className="grid grid-cols-2 gap-2 font-mono text-sm">
                  {replaceConfirm.backupCodes.map((code) => (
                    <li key={code} className="rounded-lg border bg-muted/40 px-2 py-2 text-center">
                      {formatBackupCode(code)}
                    </li>
                  ))}
                </ul>
                <CopyButton
                  value={replaceConfirm.backupCodes.map(formatBackupCode).join("\n")}
                  label="Copy all codes"
                />
              </div>
            ) : replaceStart?.qrDataUrl && replaceStart.secret ? (
              <form action={replaceConfirmAction} className="flex max-w-sm flex-col gap-3">
                <QrPanel qrDataUrl={replaceStart.qrDataUrl} secret={replaceStart.secret} />
                <TotpCodeInput id="replace-new-code" label="Code from the new authenticator" />
                {replaceConfirm?.error ? (
                  <p className="text-sm text-destructive">{replaceConfirm.error}</p>
                ) : null}
                <Button type="submit" disabled={replaceConfirmPending}>
                  {replaceConfirmPending ? "Checking…" : "Activate new authenticator"}
                </Button>
              </form>
            ) : (
              <form action={replaceStartAction} className="flex max-w-sm flex-col gap-3">
                <p className="text-sm text-muted-foreground">
                  Confirm with your current code (or a backup code). Then scan a new QR. The old
                  authenticator will stop working after you confirm.
                </p>
                <TotpCodeInput id="replace-current-code" label="Current code or backup code" />
                {replaceStart?.error ? (
                  <p className="text-sm text-destructive">{replaceStart.error}</p>
                ) : null}
                <Button type="submit" disabled={replaceStartPending}>
                  {replaceStartPending ? "Checking…" : "Create a new QR code"}
                </Button>
              </form>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
