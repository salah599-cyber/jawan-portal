import { Badge } from "@/components/ui/badge";
import { daysSinceBalanceUpdate } from "@/lib/cash/helpers";

export function StaleBalanceBadge({
  balanceAsOf,
  isStale,
}: {
  balanceAsOf: Date | null;
  isStale: boolean;
}) {
  if (!isStale) return null;

  const days = daysSinceBalanceUpdate(balanceAsOf);
  const label =
    days == null ? "Never updated" : days === 0 ? "Updated today" : `${days}d since update`;

  return (
    <Badge variant="outline" className="border-amber-500/50 text-amber-700 dark:text-amber-400">
      {balanceAsOf ? label : "No balance recorded"}
    </Badge>
  );
}
