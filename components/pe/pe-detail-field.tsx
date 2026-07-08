"use client";

import type { ReactNode } from "react";

export function PeDetailField({
  label,
  value,
}: {
  label: string;
  value: ReactNode | string | null | undefined;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-1 text-sm">{value ?? "—"}</div>
    </div>
  );
}
