"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function TotpCodeInput({
  id = "totp-code",
  name = "code",
  label = "6-digit code",
  autoFocus = true,
  onFilled,
}: {
  id?: string;
  name?: string;
  label?: string;
  autoFocus?: boolean;
  onFilled?: (code: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={name}
        inputMode="numeric"
        autoComplete="one-time-code"
        autoFocus={autoFocus}
        pattern="[0-9]{6}"
        maxLength={6}
        required
        placeholder="000000"
        className={cn("h-12 text-center font-mono text-2xl tracking-[0.4em]")}
        onChange={(event) => {
          const value = event.target.value.replace(/\D/g, "").slice(0, 6);
          event.target.value = value;
          if (value.length === 6) onFilled?.(value);
        }}
      />
    </div>
  );
}

