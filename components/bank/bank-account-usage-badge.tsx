import { Badge } from "@/components/ui/badge";
import { BANK_ACCOUNT_USAGE_LABELS } from "@/lib/labels";

export function BankAccountUsageBadge({
  includeInCashPosition,
}: {
  includeInCashPosition: boolean;
}) {
  const label =
    BANK_ACCOUNT_USAGE_LABELS[String(includeInCashPosition)] ??
    (includeInCashPosition ? "Cash position" : "Info only");

  return (
    <Badge variant={includeInCashPosition ? "secondary" : "outline"}>{label}</Badge>
  );
}
