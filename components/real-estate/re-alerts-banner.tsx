import Link from "next/link";
import type { ReAlert } from "@/lib/real-estate/alerts";
import { AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

const SEVERITY_STYLES = {
  critical: "border-destructive/50 bg-destructive/10 text-destructive",
  warning: "border-amber-500/50 bg-amber-500/10 text-amber-800 dark:text-amber-200",
  info: "border-blue-500/50 bg-blue-500/10 text-blue-800 dark:text-blue-200",
} as const;

export function ReAlertsBanner({ alerts }: { alerts: ReAlert[] }) {
  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2">
      {alerts.map((alert) => (
        <Link
          key={alert.id}
          href={alert.href}
          className={cn(
            "flex items-start gap-3 rounded-lg border px-4 py-3 text-sm transition-colors hover:opacity-90",
            SEVERITY_STYLES[alert.severity],
          )}
        >
          {alert.severity === "info" ? (
            <Info className="mt-0.5 size-4 shrink-0" />
          ) : (
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <p className="font-medium">{alert.message}</p>
            {alert.unitNumber ? (
              <p className="mt-0.5 text-xs opacity-80">
                {alert.propertyName} · Unit {alert.unitNumber}
              </p>
            ) : (
              <p className="mt-0.5 text-xs opacity-80">{alert.propertyName}</p>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}
