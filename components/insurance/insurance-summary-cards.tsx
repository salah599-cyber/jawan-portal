import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { InsurancePolicyListRow } from "@/lib/actions/insurance";
import { isExpiringWithinDays } from "@/lib/insurance/helpers";

function SummaryMetric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">{value}</p>
        {detail ? <p className="mt-1 text-xs text-muted-foreground">{detail}</p> : null}
      </CardContent>
    </Card>
  );
}

export function InsuranceSummaryCards({ policies }: { policies: InsurancePolicyListRow[] }) {
  const active = policies.filter(
    (p) => p.effectiveStatus === "ACTIVE" || p.effectiveStatus === "PENDING_RENEWAL",
  );
  const expiring = policies.filter((p) => isExpiringWithinDays(p.expiryDate, 30));
  const expired = policies.filter((p) => p.effectiveStatus === "EXPIRED");
  const byType = new Set(policies.map((p) => p.policyType));

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <SummaryMetric
        label="Active Policies"
        value={active.length.toString()}
        detail={`${policies.length} total on record`}
      />
      <SummaryMetric
        label="Expiring (30 days)"
        value={expiring.length.toString()}
        detail="Renewal attention needed"
      />
      <SummaryMetric
        label="Expired"
        value={expired.length.toString()}
        detail="Requires renewal or closure"
      />
      <SummaryMetric
        label="Policy Types"
        value={byType.size.toString()}
        detail="Property, vehicle, life, health, business"
      />
    </div>
  );
}
